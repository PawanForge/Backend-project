const express = require('express');
const { home, profile } = require('../controllers/pageController');
const { requireAuthentication } = require('../middleware/authenticate');

const router = express.Router();

router.get('/', home);
router.get('/profile', requireAuthentication, profile);

module.exports = router;
