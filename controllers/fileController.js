const asyncHandler = require('express-async-handler');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { createWriteStream } = require('fs');
const { unlink } = require('fs/promises');
const { finished, Readable } = require('stream');
const { PrismaClient } = require('@prisma/client');

const storage = multer.diskStorage({
  destination: 'temp/',
  filename(req, file, cb) {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage, limits: { fileSize: 1e7 } });
const prisma = new PrismaClient();

exports.upload = [
  upload.single('file'),

  asyncHandler(async (req, res, next) => {
    const result = await cloudinary.uploader.upload(req.file.path);
    unlink(req.file.path);

    const queue = [
      prisma.file.create({
        data: {
          name: req.file.filename,
          size: req.file.size,
          url: result.secure_url,
        },
      }),

      prisma.folder.findUnique({
        where: { id: parseInt(req.params.id, 10) },
      }),
    ];

    const [file, folder] = await Promise.all(queue);
    queue.length = 0;

    queue.push(
      prisma.user.update({
        where: { id: req.user.id },
        data: { files: { connect: { id: file.id } } },
      }),

      prisma.folder.update({
        where: { id: parseInt(req.params.id, 10) },
        data: { files: { connect: { id: file.id } } },
      }),
    );

    if (Date.now() < folder.shareExpires.getTime()) {
      queue.push(
        prisma.file.update({
          where: { id: file.id },

          data: {
            shareExpires: folder.shareExpires,
            shareUrl: `${folder.shareUrl}/files/${file.id}`,
          },
        }),
      );
    }

    await Promise.all(queue);
    return res.redirect(folder.isIndex ? '/' : `/folders/${req.params.id}`);
  }),
];

exports.download = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  const response = await fetch(file.url);
  const destination = path.resolve('./temp', file.name);
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
        unlink(destination);

        if (downloadError) {
          return next(downloadError);
        }

        return null;
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
    include: { folder: true },
  });

  return res.redirect(
    updatedFile.folder.isIndex ? '/' : `/folders/${updatedFile.folderId}`,
  );
});

exports.deleteFileGet = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { folder: true },
  });

  if (!file) {
    const err = new Error('File not found');
    err.status = 404;
    return next(err);
  }

  return res.render('delete', {
    title: 'Delete File?',
    name: file.name,
    folder: file.folder,
  });
});

exports.deleteFilePost = asyncHandler(async (req, res, next) => {
  const deletedFile = await prisma.file.delete({
    where: { id: parseInt(req.params.id, 10) },
    include: { folder: true },
  });

  return res.redirect(
    deletedFile.folder.isIndex ? '/' : `/folders/${deletedFile.folderId}`,
  );
});
