const express = require('express');
const userController = require('../controllers/userController');
const folderController = require('../controllers/folderController');
const fileController = require('../controllers/fileController');

const router = express.Router();

router.get('/login', userController.loginGet);
router.post('/login', userController.loginPost);
router.get('/sign-up', userController.signUpGet);
router.post('/sign-up', userController.signUpPost);
router.get('/logout', userController.logout);

router.get('*', (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }
  return next();
});

router.get('/', folderController.index);
router.get('/folders/:id', folderController.getFolder);
router.post('/folders/create-folder', folderController.createFolder);
router.get('/folders/:id/edit', folderController.updateFolderGet);
router.post('/folders/:id/edit', folderController.updateFolderPost);
router.get('/folders/:id/delete', folderController.deleteFolderGet);
router.post('/folders/:id/delete', folderController.deleteFolderPost);

router.post('/folders/:id/upload', fileController.upload);
router.post('/files/:id/download', fileController.download);
router.get('/files/:id/edit', fileController.updateFileGet);
router.post('/files/:id/edit', fileController.updateFilePost);
router.get('/files/:id/delete', fileController.deleteFileGet);
router.post('/files/:id/delete', fileController.deleteFilePost);

module.exports = router;
