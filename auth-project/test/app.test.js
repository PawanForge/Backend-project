const test = require('node:test');
const assert = require('node:assert/strict');
const session = require('express-session');
const { createApp } = require('../src/app');

test('renders forms and enforces CSRF protection on submissions', async (t) => {
  const app = createApp({
    config: {
      nodeEnv: 'test',
      sessionSecret: 'a-test-session-secret-with-at-least-32-characters',
      trustProxy: false
    },
    sessionStore: new session.MemoryStore()
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  }));

  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  const registrationPage = await fetch(`${origin}/register`);
  const registrationHtml = await registrationPage.text();
  const cookie = registrationPage.headers.get('set-cookie')?.split(';', 1)[0];
  const csrfToken = registrationHtml.match(/name="_csrf" value="([^"]+)"/)?.[1];

  assert.equal(registrationPage.status, 200);
  assert.match(registrationHtml, /Create your account/);
  assert.ok(cookie);
  assert.ok(csrfToken);

  const invalidForm = new URLSearchParams({
    _csrf: csrfToken,
    name: ' ',
    email: 'invalid',
    password: 'short',
    passwordConfirmation: 'different'
  });
  const invalidResponse = await fetch(`${origin}/register`, {
    method: 'POST',
    headers: {
      cookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: invalidForm,
    redirect: 'manual'
  });
  assert.equal(invalidResponse.status, 422);
  assert.match(await invalidResponse.text(), /Enter a valid email address/);

  const forgedResponse = await fetch(`${origin}/register`, {
    method: 'POST',
    headers: {
      cookie,
      'content-type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ _csrf: 'invalid', name: 'Test' }),
    redirect: 'manual'
  });
  assert.equal(forgedResponse.status, 403);
  assert.match(await forgedResponse.text(), /This form could not be verified/);
});

test('redirects unauthenticated visitors away from the profile page', async () => {
  const app = createApp({
    config: {
      nodeEnv: 'test',
      sessionSecret: 'a-test-session-secret-with-at-least-32-characters',
      trustProxy: false
    },
    sessionStore: new session.MemoryStore()
  });
  const server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));

  try {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/profile`, {
      redirect: 'manual'
    });
    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
