const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { csrfSync } = require('csrf-sync');
const authRoutes = require('./routes/authRoutes');
const pageRoutes = require('./routes/pageRoutes');

function createApp({ config, sessionStore }) {
  const app = express();
  const csrf = csrfSync({
    getTokenFromRequest: (req) => req.body?._csrf
  });

  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.use(helmet());
  app.use(express.urlencoded({ extended: false, limit: '10kb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use(
    session({
      name: 'auth.sid',
      secret: config.sessionSecret,
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000
      }
    })
  );
  app.use((req, res, next) => {
    res.locals.csrfToken = csrf.generateToken(req);
    res.locals.currentUser = Boolean(req.session.userId);
    res.locals.flash = req.session.flash || null;
    delete req.session.flash;
    next();
  });
  app.use(csrf.csrfSynchronisedProtection);
  app.use(pageRoutes);
  app.use(authRoutes);
  app.use((req, res) => {
    res.status(404).render('error', {
      title: 'Page not found',
      message: 'The page you requested could not be found.'
    });
  });
  app.use((error, req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error === csrf.invalidCsrfTokenError) {
      return res.status(403).render('error', {
        title: 'Form expired',
        message: 'This form could not be verified. Go back, refresh the page, and try again.'
      });
    }

    console.error(error);
    return res.status(500).render('error', {
      title: 'Something went wrong',
      message: 'We could not complete your request. Please try again later.'
    });
  });

  return app;
}

module.exports = { createApp };
