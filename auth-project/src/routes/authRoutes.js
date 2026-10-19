const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
  login,
  logout,
  register,
  showLogin,
  showRegistration
} = require('../controllers/authController');

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler(req, res) {
    res.status(429).render('error', {
      title: 'Too many login attempts',
      message: 'Please wait a while before trying to log in again.'
    });
  }
});

router.get('/register', showRegistration);
router.post('/register', register);
router.get('/login', showLogin);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);

module.exports = router;
