const asyncHandler = require('express-async-handler');
const path = require('path');
const { createWriteStream } = require('fs');
const { unlink } = require('fs/promises');
const { finished, Readable } = require('stream');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.shareFormGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!folder) {
    const err = new Error('Folder not found');
    err.status = 404;
    return next(err);
  }

  return res.render('share', {
    title: `Share ${folder.isIndex ? 'all of your folders' : folder.name}`,
    folderId: req.params.id,
  });
});

exports.shareFormPost = asyncHandler(async (req, res, next) => {
  const updateQueue = [];

  async function applyShareUrlToDescendants(folderId, shareUrl, shareExpires) {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { childFolders: true, files: true },
    });

    folder.files.forEach((file) => {
      updateQueue.push(
        prisma.file.update({
          where: { id: file.id },
          data: { shareExpires, shareUrl: `${shareUrl}/files/${file.id}` },
        }),
      );
    });

    if (folder.childFolders.length === 0) {
      return;
    }

    folder.childFolders.forEach(async (childFolder) => {
      updateQueue.push(
        prisma.folder.update({
          where: { id: childFolder.id },
          data: {
            shareExpires,
            shareUrl: `${shareUrl}/folders/${childFolder.id}`,
          },
        }),
      );

      await applyShareUrlToDescendants(childFolder.id, shareUrl, shareExpires);
    });
  }

  const shareExpires = new Date(
    Date.now() + req.body.duration * 24 * 60 * 60 * 1000,
  );

  const shareUrl = `/share/${crypto.randomUUID()}`;

  const folder = await prisma.folder.update({
    where: { id: parseInt(req.params.id, 10) },
    data: { shareExpires, shareUrl },
    include: { childFolders: true, files: true },
  });

  await applyShareUrlToDescendants(folder.id, shareUrl, shareExpires);
  await Promise.all(updateQueue);
  return res.redirect(folder.isIndex ? '/' : `/folders/${req.params.id}`);
});

exports.shareFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findFirst({
    where: { shareUrl: `/share/${req.params.uuid}` },
    include: { childFolders: true, files: true },
  });

  if (!folder) {
    return next();
  }

  if (req.user.id === folder.userId) {
    return res.redirect(folder.isIndex ? '/' : `/folders/${folder.id}`);
  }

  if (Date.now() > folder.shareExpires.getTime()) {
    return next();
  }

  return res.render('sharedFolder', {
    title: folder.name,
    childFolders: folder.childFolders,
    files: folder.files,
    folder,
    shareUrlRoot: `/share/${req.params.uuid}`,
  });
});

exports.shareChildFolderGet = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { childFolders: true, files: true },
  });

  if (folder.shareUrl === `/share/${req.params.uuid}`) {
    return res.redirect(folder.shareUrl);
  }

  if (!folder) {
    return next();
  }

  if (req.user.id === folder.userId) {
    return res.redirect(folder.isIndex ? '/' : `/folders/${folder.id}`);
  }

  if (Date.now() > folder.shareExpires.getTime()) {
    return next();
  }

  const splitUrl = folder.shareUrl.split('/');

  return res.render('sharedFolder', {
    title: folder.name,
    childFolders: folder.childFolders,
    files: folder.files,
    folder,
    shareUrlRoot: `/${splitUrl[1]}/${splitUrl[2]}`,
  });
});

exports.shareUpDirectory = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
    include: { parentFolder: true },
  });

  if (!folder) {
    return next();
  }

  if (req.user.id === folder.userId) {
    return res.redirect(folder.isIndex ? '/' : `/folders/${folder.id}`);
  }

  if (Date.now() > folder.shareExpires.getTime()) {
    return next();
  }

  if (folder.isIndex || folder.parentFolder.isIndex) {
    return res.redirect(`/share/${req.params.uuid}`);
  }

  return res.redirect(
    `/share/${req.params.uuid}/folders/${folder.parentFolderId}`,
  );
});

exports.shareDownload = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (!file) {
    return next();
  }

  if (req.user.id === file.userId) {
    return res.redirect(`/files/${file.id}/download`);
  }

  if (Date.now() > file.shareExpires.getTime()) {
    return next();
  }

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

  return null;
});
