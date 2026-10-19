const User = require('../models/User');

async function requireAuthentication(req, res, next) {
  if (!req.session.userId) {
    req.session.flash = { type: 'info', message: 'Please log in to view your profile.' };
    return res.redirect('/login');
  }

  try {
    const user = await User.findById(req.session.userId).select('_id name email');
    if (!user) {
      return req.session.destroy((error) => {
        if (error) {
          return next(error);
        }
        res.clearCookie('auth.sid');
        res.redirect('/login');
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = { requireAuthentication };
