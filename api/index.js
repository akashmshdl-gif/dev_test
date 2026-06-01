const path = require('node:path');
const { createRequire } = require('node:module');

const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));

backendRequire('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const app = require('../backend/app');
const { validateJwksConfig } = require('../backend/controllers/jwksController');

let bootstrapPromise;

function ensureBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = validateJwksConfig().catch((error) => {
      bootstrapPromise = undefined;
      throw error;
    });
  }

  return bootstrapPromise;
}

module.exports = async (req, res) => {
  await ensureBootstrap();
  return app(req, res);
};
