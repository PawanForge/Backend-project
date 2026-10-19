const argon2 = require('argon2');
const User = require('../models/User');
const { validateLogin, validateRegistration } = require('../utils/validation');

function showRegistration(req, res) {
  res.render('auth/register', { errors: [], values: { name: '', email: '' } });
}

async function register(req, res, next) {
  const { values, password, errors } = validateRegistration(req.body);
  if (errors.length) {
    return res.status(422).render('auth/register', { errors, values });
  }

  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    await User.create({ ...values, passwordHash });
    req.session.flash = { type: 'success', message: 'Your account was created. You can now log in.' };
    return res.redirect('/login');
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).render('auth/register', {
        errors: ['An account with that email address already exists.'],
        values
      });
    }
    return next(error);
  }
}

function showLogin(req, res) {
  res.render('auth/login', { errors: [], values: { email: '' } });
}

async function login(req, res, next) {
  const { values, password, errors } = validateLogin(req.body);
  if (errors.length) {
    return res.status(422).render('auth/login', { errors, values });
  }

  try {
    const user = await User.findOne({ email: values.email }).select('+passwordHash');
    const passwordMatches =
      user && (await argon2.verify(user.passwordHash, password));

    if (!passwordMatches) {
      return res.status(401).render('auth/login', {
        errors: ['Invalid email or password.'],
        values
      });
    }

    return req.session.regenerate((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }
      req.session.userId = user._id.toString();
      return req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
        }
        return res.redirect('/profile');
      });
    });
  } catch (error) {
    return next(error);
  }
}

function logout(req, res, next) {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }
    res.clearCookie('auth.sid');
    return res.redirect('/');
  });
}

module.exports = { login, logout, register, showLogin, showRegistration };
