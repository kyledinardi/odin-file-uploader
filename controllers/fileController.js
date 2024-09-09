const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
// const { unlink } = require('fs/promises');
const { PrismaClient } = require('@prisma/client');
// const cloudinary = require('cloudinary').v2;

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 1e7 } });
const prisma = new PrismaClient();

exports.upload = [
  upload.single('file'),

  asyncHandler(async (req, res, next) => {
    const folderId = req.params.id;

    await prisma.folder.update({
      where: { id: parseInt(folderId, 10) },
      data: {
        files: {
          create: { name: req.file.filename, size: req.file.size },
        },
      },
    });

    return res.redirect(`/folders/${folderId}`);
  }),
];

exports.download = (req, res, next) => {};

exports.updateFileGet = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!file) {
    const err = new Error('File not found');
    err.status = 404;
    return next(err);
  }

  return res.render('edit', {
    title: 'Edit File',
    name: path.parse(file.name).name,
    extension: path.parse(file.name).ext,
  });
});

exports.updateFilePost = asyncHandler(async (req, res, next) => {
  const updatedFile = await prisma.file.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { name: `${req.body.name}${req.body.extension}` },
  });

  return res.redirect(`/folders/${updatedFile.folderId}`);
});

exports.deleteFileGet = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!file) {
    const err = new Error('File not found');
    err.status = 404;
    return next(err);
  }

  return res.render('delete', {
    title: 'Delete File?',
    name: file.name,
    folderId: file.folderId,
  });
});

exports.deleteFilePost = asyncHandler(async (req, res, next) => {
  const deletedFile = await prisma.file.delete({
    where: { id: parseInt(req.params.id, 10) },
  });

  return res.redirect(`/folders/${deletedFile.folderId}`);
});
