const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { readConfig } = require('./config/env');
const { connectDatabase } = require('./config/database');
const User = require('./models/User');
const { createApp } = require('./app');

async function startServer() {
  // 1. Read and validate .env before using the port, database URI, or session secret.
  const config = readConfig();

  // 2. Connect first: routes that use MongoDB should not receive requests before
  // the database is ready.
  await connectDatabase(config.mongoUri);

  // 3. Wait for Mongoose to create/check the User model's indexes, including the
  // unique email index used to prevent duplicate accounts.
  await User.init();

  // 4. Sessions live in MongoDB too, separate from the users collection.
  const sessionStore = MongoStore.create({
    mongoUrl: config.mongoUri,
    collectionName: 'sessions',
    ttl: 8 * 60 * 60,
    autoRemove: 'native'
  });

  // 5. Give the configured app and its session store to Express.
  const app = createApp({ config, sessionStore });
  const server = app.listen(config.port);
  try {
    // app.listen() starts listening asynchronously, so wait for success or error
    // before reporting that startup completed.
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
  } catch (error) {
    await sessionStore.close();
    throw error;
  }

  // The app is ready only after both MongoDB and the HTTP listener are ready.
  console.log(`Auth app listening on port ${config.port} (${config.nodeEnv}).`);

  let isShuttingDown = false;
  async function shutdown(signal) {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    console.log(`${signal} received; closing the server.`);

    try {
      // Stop accepting requests before closing the resources those requests use.
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await sessionStore.close();
      await mongoose.disconnect();
    } catch (error) {
      console.error('Error while shutting down:', error);
      process.exitCode = 1;
    }
  }

  process.once('SIGINT', () => shutdown('SIGINT'));
  process.once('SIGTERM', () => shutdown('SIGTERM'));
}

// Catch startup failures (for example, invalid configuration or a failed DB
// connection), log them, and make the process exit with a failure status.
startServer().catch((error) => {
  console.error('Unable to start the auth app:', error);
  process.exitCode = 1;
});
