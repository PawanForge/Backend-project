const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isEmail(value) {
  return value.length <= 254 && EMAIL_PATTERN.test(value);
}

function validateRegistration(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const passwordConfirmation =
    typeof body.passwordConfirmation === 'string' ? body.passwordConfirmation : '';
  const errors = [];

  if (!name) {
    errors.push('Enter your name.');
  } else if (name.length > 80) {
    errors.push('Your name must be 80 characters or fewer.');
  }
  if (!isEmail(email)) {
    errors.push('Enter a valid email address.');
  }
  if (password.length < 12 || password.length > 128) {
    errors.push('Your password must be between 12 and 128 characters.');
  }
  if (password !== passwordConfirmation) {
    errors.push('The password confirmation does not match.');
  }

  return { values: { name, email }, password, errors };
}

function validateLogin(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const errors = [];

  if (!isEmail(email)) {
    errors.push('Enter a valid email address.');
  }
  if (!password || password.length > 128) {
    errors.push('Enter your password.');
  }

  return { values: { email }, password, errors };
}

module.exports = { validateLogin, validateRegistration };
