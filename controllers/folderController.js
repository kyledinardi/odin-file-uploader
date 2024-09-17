const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.index = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findFirst({
    where: { userId: req.user.id, isIndex: true },
    include: { childFolders: true, files: true },
  });

  if (!folder) {
    const err = new Error('Server error: index not found');
    return next(err);
  }

  return res.render('index', {
    title: folder.name,
    childFolders: folder.childFolders,
    files: folder.files,
    folder,
  });
});

exports.getFolder = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { childFolders: true, files: true },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  return res.render('index', {
    title: folder.name,
    childFolders: folder.childFolders,
    files: folder.files,
    folder,
  });
});

exports.upDirectory = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { parentFolder: true },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  if (folder.isIndex || folder.parentFolder.isIndex) {
    return res.redirect('/');
  }

  return res.redirect(`/folders/${folder.parentFolderId}`);
});

exports.createFolder = [
  body('folderName')
    .trim()
    .notEmpty()
    .withMessage('Folder name must not be empty')
    .matches(/[^<>:"/\\|?*]/)
    .withMessage('Folder name must not include < > : " / \\ | ? or *'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    const folder = await prisma.folder.findUnique({
      where: { id: parseInt(req.params.id, 10) },
      include: { childFolders: true, files: true },
    });

    if (!folder) {
      const err = new Error('Folder not found');
      err.status = 404;
      return next(err);
    }

    if (!errors.isEmpty()) {
      return res.render('index', {
        title: folder.name,
        childFolders: folder.childFolders,
        files: folder.files,
        folder,
        folderNameErrors: errors.array(),
      });
    }

    const newFolder = await prisma.folder.create({
      data: {
        name: req.body.folderName,
        path: `${folder.path}${req.body.folderName}/`,
      },
    });

    const updateQueue = [
      prisma.user.update({
        where: { id: req.user.id },
        data: { folders: { connect: { id: newFolder.id } } },
      }),

      prisma.folder.update({
        where: { id: parseInt(req.params.id, 10) },
        data: { childFolders: { connect: { id: newFolder.id } } },
      }),
    ];

    if (Date.now() < folder.shareExpires.getTime()) {
      updateQueue.push(
        prisma.folder.update({
          where: { id: newFolder.id },
          
          data: {
            shareExpires: folder.shareExpires,
            shareUrl: `${folder.shareUrl}/folders/${newFolder.id}`,
          },
        }),
      );
    }

    await Promise.all(updateQueue);
    return res.redirect(folder.isIndex ? '/' : `/folders/${req.params.id}`);
  }),
];

exports.updateFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  if (folder.isIndex) {
    const err = new Error('Cannot edit index');
    err.status = 403;
    return next(err);
  }

  return res.render('edit', { title: 'Edit Folder', name: folder.name });
});

exports.updateFolderPost = asyncHandler(async (req, res, next) => {
  await prisma.folder.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { name: req.body.name, updated: new Date() },
  });

  res.redirect('/');
});

exports.deleteFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  if (folder.isIndex) {
    const err = new Error('Cannot delete index');
    err.status = 403;
    return next(err);
  }

  return res.render('delete', {
    title: 'Delete Folder?',
    name: folder.name,
    folder,
  });
});

exports.deleteFolderPost = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.delete({
    where: { id: parseInt(req.params.id, 10) },
  });

  return res.redirect(
    folder.parentFolderId ? `/folders/${folder.parentFolderId}` : '/',
  );
});
