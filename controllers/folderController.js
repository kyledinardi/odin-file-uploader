const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.index = asyncHandler(async (req, res, next) => {
  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: { userId: req.user.id },
    }),

    prisma.file.findMany({
      where: { userId: req.user.id },
    }),
  ]);

  return res.render('index', {
    title: 'Home',
    folders,
    files,
    folderId: 'index',
    path: '/',
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
    folders: folder.childFolders,
    files: folder.files,
    folderId: req.params.id,
    path: folder.path,
  });
});

exports.upDirectory = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }
  if (!folder.parentfolderId) {
    return res.redirect('/');
  }

  return res.redirect(`/folders/${folder.parentfolderId}`);
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

    if (!errors.isEmpty()) {
      let folder = null;
      let folders;
      let files;

      if (req.params.id === 'index') {
        [folders, files] = await Promise.all([
          prisma.folder.findMany({
            where: { userId: req.user.id },
          }),

          prisma.file.findMany({
            where: { userId: req.user.id },
          }),
        ]);
      } else {
        folder = await prisma.folder.findUnique({
          where: { id: parseInt(req.params.id, 10) },
          include: { childFolders: true, files: true },
        });

        folders = folder.childFolders;
        files = folder.files;
      }

      return res.render('index', {
        title: req.params.id === 'index' ? 'Home' : folder.name,
        folders,
        files,
        folderId: req.params.id,
        path: req.params.id === 'index' ? '/' : folder.path,
        folderNameErrors: errors.array(),
      });
    }

    if (req.params.id === 'index') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          folders: {
            create: {
              name: req.body.folderName,
              path: `/${req.body.folderName}/`,
            },
          },
        },
      });
    } else {
      const folder = await prisma.folder.findUnique({
        where: { id: parseInt(req.params.id, 10) },
      });

      await prisma.folder.update({
        where: { id: parseInt(req.params.id, 10) },
        data: {
          childFolders: {
            create: {
              name: req.body.folderName,
              path: `${folder.path}${req.body.folderName}/`,
            },
          },
        },
      });
    }

    return res.redirect(
      req.params.id === 'index' ? '/' : `/folders/${req.params.id}`,
    );
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

  return res.render('delete', { title: 'Delete Folder?', name: folder.name });
});

exports.deleteFolderPost = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.delete({
    where: { id: parseInt(req.params.id, 10) },
  });

  return res.redirect(
    folder.parentfolderId ? `/folders/${folder.parentfolderId}` : '/',
  );
});
