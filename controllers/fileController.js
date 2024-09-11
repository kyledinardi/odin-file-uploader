const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { createWriteStream } = require('fs');
const { unlink } = require('fs/promises');
const { finished, Readable } = require('stream');
const { PrismaClient } = require('@prisma/client');

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
    const result = await cloudinary.uploader.upload(req.file.path);
    unlink(req.file.path);

    const fileDetails = {
      name: req.file.filename,
      size: req.file.size,
      url: result.secure_url,
    };

    if (req.params.id === 'index') {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { files: { create: fileDetails } },
      });
    } else {
      await prisma.folder.update({
        where: { id: parseInt(folderId, 10) },
        data: { files: { create: fileDetails } },
      });
    }

    return res.redirect(
      req.params.id === 'index' ? '/' : `/folders/${req.params.id}`,
    );
  }),
];

exports.download = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  const response = await fetch(file.url);
  const destination = path.resolve('./downloads', file.name);
  const fileStream = createWriteStream(destination);
  const readablePipe = Readable.fromWeb(response.body).pipe(fileStream);

  finished(readablePipe, (streamError) => {
    if (streamError) {
      return next(streamError);
    }

    return res.download(
      destination,
      path.basename(destination),
      (downloadError) => {
        if (downloadError) {
          return next(downloadError);
        }

        return unlink(destination);
      },
    );
  });
});

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

  return res.redirect(
    !updatedFile.folderId ? '/' : `/folders/${updatedFile.folderId}`,
  );
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

  return res.redirect(
    !deletedFile.folderId ? '/' : `/folders/${deletedFile.folderId}`,
  );
});
