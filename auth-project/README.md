# Auth Project

A server-rendered authentication app using Express, EJS, MongoDB/Mongoose, MongoDB-backed sessions, and Argon2id password hashes.

## Requirements

- Node.js 20 or newer
- npm
- MongoDB running locally or a MongoDB connection URI

## Setup

From this directory:

```powershell
npm install
Copy-Item .env.example .env
```

Edit `.env` and set a private session secret. For example, generate one with:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Set the output as `SESSION_SECRET`. Set `MONGODB_URI` to your local MongoDB URI or hosted database URI. Never commit `.env`; it is excluded by `.gitignore`.

## Run

Development with automatic restarts:

```powershell
npm run dev
```

Production-style start:

```powershell
npm start
```

Visit <http://localhost:3000>. Run the unit tests with `npm test`.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | No | `development` by default; use `production` for secure cookies. |
| `PORT` | No | HTTP port; defaults to `3000`. |
| `MONGODB_URI` | Yes | MongoDB connection URI. |
| `SESSION_SECRET` | Yes | Random secret of at least 32 characters used to sign session cookies. |
| `TRUST_PROXY` | No | Defaults to `0`. Set to `1` only behind exactly one trusted reverse proxy. |

In production, serve the app over HTTPS. If HTTPS terminates at a single trusted reverse proxy, set `TRUST_PROXY=1` so Express can recognize secure requests and issue secure cookies. Do not enable proxy trust unless the proxy is controlled by you.

## Security notes and limitations

- Passwords are hashed with Argon2id; only the hash is stored, and the model excludes it from normal query results.
- Session data is stored in MongoDB. Cookies are HTTP-only, same-site, secure in production, and expire after eight hours. Session IDs are regenerated after successful login.
- Registration and login forms use synchronizer CSRF tokens. User-provided form values are validated server-side and output through EJS's escaped interpolation.
- Login attempts are limited to 10 per 15 minutes **per application process** using the rate limiter's default in-memory store. For multiple app instances, configure a shared rate-limit store.
- Email confirmation, password reset, MFA, account lockout, audit logging, and deployment-specific secret management are not included.
- Use a private MongoDB instance with authentication and network access controls in production. Keep dependencies updated and terminate TLS at a trusted HTTPS endpoint.
