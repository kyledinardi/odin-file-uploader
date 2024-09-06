const asyncHandler = require('express-async-handler');
const multer = require('multer');
const { unlink } = require('fs/promises');
const cloudinary = require('cloudinary').v2;
const { PrismaClient } = require('@prisma/client');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 1e7 } });
const prisma = new PrismaClient();

exports.index = (req, res, next) => res.render('index', { title: 'Home' });

exports.upload = [
  upload.single('file'),

  asyncHandler(async (req, res, next) => {
    const file = {
      name: req.file.filename,
      size: req.file.size,
      uploadTime: new Date(parseInt(req.file.filename.split('-')[0], 10)),
    };

    return res.send(file);
  }),
];
