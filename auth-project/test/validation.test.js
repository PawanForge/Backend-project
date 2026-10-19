const test = require('node:test');
const assert = require('node:assert/strict');
const { validateLogin, validateRegistration } = require('../src/utils/validation');

test('registration normalizes name and email and accepts a matching strong password', () => {
  const result = validateRegistration({
    name: '  Ada Lovelace ',
    email: ' ADA@example.com ',
    password: 'correct horse battery',
    passwordConfirmation: 'correct horse battery'
  });

  assert.deepEqual(result.values, { name: 'Ada Lovelace', email: 'ada@example.com' });
  assert.equal(result.password, 'correct horse battery');
  assert.deepEqual(result.errors, []);
});

test('registration rejects invalid fields and mismatched passwords', () => {
  const result = validateRegistration({
    name: ' ',
    email: 'not-an-email',
    password: 'short',
    passwordConfirmation: 'different'
  });

  assert.ok(result.errors.length >= 4);
});

test('login normalizes the email and rejects a missing password', () => {
  const result = validateLogin({ email: ' USER@example.com ', password: '' });

  assert.deepEqual(result.values, { email: 'user@example.com' });
  assert.deepEqual(result.errors, ['Enter your password.']);
});

test('validation handles non-string form values without throwing', () => {
  const registration = validateRegistration({ name: ['unexpected'], email: null, password: null });
  const login = validateLogin({ email: ['unexpected'], password: null });

  assert.ok(registration.errors.length > 0);
  assert.ok(login.errors.length > 0);
});
