const path = require('node:path');
const { createRequire } = require('node:module');

const backendRequire = createRequire(path.resolve(__dirname, '../backend/package.json'));

backendRequire('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const appModule = backendRequire('./app');
const app = appModule.default || appModule;
const jwksControllerModule = backendRequire('./controllers/jwksController');
const { validateJwksConfig } =
  jwksControllerModule.default || jwksControllerModule;

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
