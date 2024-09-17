const express = require('express');
const fileController = require('../controllers/fileController');
const folderController = require('../controllers/folderController');
const shareController = require('../controllers/shareController');
const userController = require('../controllers/userController');

const router = express.Router();
router.get('/login', userController.loginGet);
router.post('/login', userController.loginPost);
router.get('/sign-up', userController.signUpGet);
router.post('/sign-up', userController.signUpPost);
router.get('/logout', userController.logout);

router.get('*', userController.authenticate);
router.get('/share/:uuid', shareController.shareFolderGet);
router.get('/share/:uuid/folders/:id', shareController.shareChildFolderGet);
router.get('/share/:uuid/files/:id/download', shareController.shareDownload);

router.get(
  '/share/:uuid/folders/:id/up-directory',
  shareController.shareUpDirectory,
);

router.get('/', folderController.index);
router.get('/folders/:id*', userController.authorizeFolder);
router.get('/files/:id*', userController.authorizeFile);

router.get('/folders/:id', folderController.getFolder);
router.get('/folders/:id/up-directory', folderController.upDirectory);

router.post('/folders/:id/create-folder', folderController.createFolder);
router.get('/folders/:id/edit', folderController.updateFolderGet);
router.post('/folders/:id/edit', folderController.updateFolderPost);
router.get('/folders/:id/delete', folderController.deleteFolderGet);
router.post('/folders/:id/delete', folderController.deleteFolderPost);

router.get('/folders/:id/share', shareController.shareFormGet);
router.post('/folders/:id/share', shareController.shareFormPost);

router.post('/folders/:id/upload', fileController.upload);
router.get('/files/:id/download', fileController.download);

router.get('/files/:id/edit', fileController.updateFileGet);
router.post('/files/:id/edit', fileController.updateFilePost);
router.get('/files/:id/delete', fileController.deleteFileGet);
router.post('/files/:id/delete', fileController.deleteFilePost);

module.exports = router;
