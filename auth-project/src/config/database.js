const mongoose = require('mongoose');

async function connectDatabase(mongoUri) {
  await mongoose.connect(mongoUri);
  await mongoose.connection.asPromise();
}

module.exports = { connectDatabase };
