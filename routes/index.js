const express = require('express');
const userController = require('../controllers/userController');

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

router.get('/', (req, res, next) => res.send(req.user));

module.exports = router;
