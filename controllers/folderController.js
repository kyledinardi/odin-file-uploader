const asyncHandler = require('express-async-handler');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.createFolder = asyncHandler(async (req, res, next) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data: { folders: { create: { name: req.body.folderName } } },
  });

  return res.redirect('/');
});

exports.updateFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  return res.render('edit', { title: 'Edit Folder', folder });
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

  return res.render('delete', { title: 'Delete Folder?', folder });
});

exports.deleteFolderPost = asyncHandler(async (req, res, next) => {
  await prisma.folder.delete({ where: { id: parseInt(req.params.id, 10) } });
  return res.redirect('/');
});
