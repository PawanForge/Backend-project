function home(req, res) {
  res.render('home');
}

function profile(req, res) {
  res.render('profile', { user: req.user });
}

module.exports = { home, profile };
