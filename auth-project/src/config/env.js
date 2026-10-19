const dotenv = require('dotenv');

dotenv.config();

function readConfig() {
  const errors = [];
  const nodeEnv = process.env.NODE_ENV || 'development';
  const portValue = process.env.PORT || '3000';
  const port = Number(portValue);
  const mongoUri = process.env.MONGODB_URI;
  const sessionSecret = process.env.SESSION_SECRET;
  const trustProxy = process.env.TRUST_PROXY || '0';

  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    errors.push('NODE_ENV must be development, test, or production.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push('PORT must be an integer between 1 and 65535.');
  }
  if (!mongoUri || !/^mongodb(\+srv)?:\/\//i.test(mongoUri)) {
    errors.push('MONGODB_URI must be a MongoDB connection URI.');
  }
  if (!sessionSecret || sessionSecret.length < 32) {
    errors.push('SESSION_SECRET must contain at least 32 characters.');
  }
  if (!['0', '1'].includes(trustProxy)) {
    errors.push('TRUST_PROXY must be 0 or 1.');
  }
  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return {
    nodeEnv,
    port,
    mongoUri,
    sessionSecret,
    trustProxy: trustProxy === '1'
  };
}

module.exports = { readConfig };
