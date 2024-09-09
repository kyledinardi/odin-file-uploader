const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.index = asyncHandler(async (req, res, next) => {
  const folders = await prisma.folder.findMany({
    where: { userId: req.user.id },
  });

  return res.render('index', { title: 'Home', folders });
});

exports.getFolder = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10), userId: req.user.id },
    include: { files: true },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  return res.render('folder', { title: folder.name, folder });
});

exports.createFolder = asyncHandler(async (req, res, next) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { folders: { create: { name: req.body.folderName } } },
  });

  return res.redirect('/');
});

exports.updateFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10), userId: req.user.id },
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
    where: { id: parseInt(req.params.id, 10), userId: req.user.id },
    data: { name: req.body.name, updated: new Date() },
  });

  res.redirect('/');
});

exports.deleteFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10), userId: req.user.id },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  return res.render('delete', { title: 'Delete Folder?', name: folder.name });
});

exports.deleteFolderPost = asyncHandler(async (req, res, next) => {
  const folderId = parseInt(req.params.id, 10);
  const deleteFiles = prisma.file.deleteMany({ where: { folderId } });
  const deleteFolder = prisma.folder.delete({ where: { id: folderId } });
  await prisma.$transaction([deleteFiles, deleteFolder]);
  return res.redirect('/');
});
