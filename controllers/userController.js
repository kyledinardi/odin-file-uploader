const asyncHandler = require('express-async-handler');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

exports.signUpGet = (req, res, next) => {
  if (req.user) {
    return res.redirect('/');
  }

  return res.render('signUp', { title: 'Sign Up' });
};

exports.signUpPost = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username must not be empty')

    .custom(async (username) => {
      const existingUpser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUpser) {
        throw new Error('Username already in use');
      }
    }),
    
  body('password', 'Password must not be empty').trim().notEmpty(),

  body('passwordConfirmation')
    .trim()
    .custom((password, { req }) => password === req.body.password)
    .withMessage('Passwords did not match'),

  asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty) {
      return res.render('signUp', {
        title: 'Sign Up',
        username: req.body.username,
        errors: errors.array(),
      });
    }

    return bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
      if (err) {
        throw new Error(err);
      }

      const user = await prisma.user.create({
        data: {
          username: req.body.username,
          password_hash: hashedPassword,
          folders: { create: { path: '/', name: 'Home', isIndex: true } },
        },
      });

      req.login(user, (error) => {
        if (!error) {
          return res.redirect('/');
        }

        return next(error);
      });
    });
  }),
];

exports.loginGet = (req, res, next) => {
  if (req.user) {
    return res.redirect('/');
  }

  return res.render('login', { title: 'Log In' });
};

exports.loginPost = passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login',
});

exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }

    return res.redirect('/login');
  });
};

exports.authenticate = (req, res, next) => {
  if (!req.user) {
    return res.redirect('/login');
  }

  return next();
};

exports.authorizeFolder = asyncHandler(async (req, res, next) => {
  const folder = await prisma.folder.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (folder.userId !== req.user.id) {
    const err = new Error('Unauthorized User');
    err.status = 403;
    return next(err);
  }

  return next();
});

exports.authorizeFile = asyncHandler(async (req, res, next) => {
  const file = await prisma.file.findUnique({
    where: { id: parseInt(req.params.id, 10) },
  });

  if (file.userId !== req.user.id) {
    const err = new Error('Unauthorized User');
    err.status = 403;
    return next(err);
  }

  return next();
});
