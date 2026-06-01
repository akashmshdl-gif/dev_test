const fs = require('node:fs');
const path = require('node:path');
const { buildJwksFromPemEnv, resolvePath } = require('../lib/buildJwksFromPem.js');

const CACHE_CONTROL = process.env.CACHE_CONTROL ?? 'public, max-age=3600';
const baseDir = path.resolve(__dirname, '..');
const DEFAULT_PUBLIC_KEY_PATH = './keys/public.pem';

function getEnvValue(name, prefix = '') {
  return process.env[`${prefix}${name}`] || '';
}

function getJwksJsonPath(prefix = '') {
  return getEnvValue('JWKS_JSON_PATH', prefix);
}

function getPublicKeyPath(prefix = '') {
  return getEnvValue('PUBLIC_KEY_PATH', prefix);
}

function loadJwksFromFile(prefix = '') {
  const jwksJsonPath = getJwksJsonPath(prefix);
  const jsonPath = resolvePath(baseDir, jwksJsonPath);
  if (!jsonPath || !fs.existsSync(jsonPath)) {
    throw new Error(
      `${prefix}JWKS_JSON_PATH not found or missing: ${jwksJsonPath || '(empty)'}`
    );
  }
  const raw = fs.readFileSync(jsonPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.keys)) {
    throw new Error(`${prefix || 'Default '}JWKS JSON must be an object with a "keys" array`);
  }
  return parsed;
}

function formatJwksResponse(jwks, prefix = '') {
  return {
    ...jwks,
    keys: jwks.keys.map((key) => {
      if (key.kty === 'RSA') {
        return {
          kty: 'RSA',
          kid: key.kid,
          use: 'sig',
          alg: key.alg || getEnvValue('JWT_ALG', prefix) || process.env.JWT_ALG || 'RS384',
          n: key.n,
          e: key.e,
        };
      }

      if (key.kty === 'EC') {
        return {
          kty: 'EC',
          kid: key.kid,
          use: 'sig',
          alg:
            key.alg || getEnvValue('JWT_ALG_EC', prefix) || process.env.JWT_ALG_EC || 'ES384',
          crv: key.crv,
          x: key.x,
          y: key.y,
        };
      }

      return key;
    }),
  };
}

function createBuilder(prefix = '') {
  const publicKeyPath = getPublicKeyPath(prefix);
  const jwksJsonPath = getJwksJsonPath(prefix);

  return async function buildJwksFromPem() {
    try {
      return await buildJwksFromPemEnv(baseDir, prefix);
    } catch (e) {
      const hint =
        e.message &&
        e.message.includes(`${prefix}PUBLIC_KEY_PATH not found`) &&
        (!publicKeyPath ||
          path.normalize(publicKeyPath) === path.normalize(DEFAULT_PUBLIC_KEY_PATH)) &&
        !jwksJsonPath &&
        !prefix
          ? ' Run: npm run setup:dev (creates keys/public.pem for local dev only).'
          : '';
      throw new Error(`${e.message}${hint}`);
    }
  };
}

function createJwksAccessors(prefix = '') {
  let cachedJwks;
  const buildJwksFromPem = createBuilder(prefix);

  async function getJwks() {
    if (cachedJwks) return cachedJwks;
    if (getJwksJsonPath(prefix)) {
      cachedJwks = loadJwksFromFile(prefix);
    } else {
      cachedJwks = await buildJwksFromPem();
    }
    return cachedJwks;
  }

  function isConfigured() {
    return Boolean(getPublicKeyPath(prefix) || getJwksJsonPath(prefix));
  }

  return {
    getJwks,
    isConfigured,
  };
}

const defaultJwks = createJwksAccessors();
const providerJwks = createJwksAccessors('PROVIDER_');
const patientJwks = createJwksAccessors('PATIENT_');

function createJwksEndpoint(getter, prefix = '', label = 'JWKS') {
  return async (_req, res) => {
    try {
      const jwks = await getter();
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', CACHE_CONTROL);
      res.status(200).json(prefix ? formatJwksResponse(jwks, prefix) : jwks);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: `Failed to load ${label}` });
    }
  };
}

async function validateJwksConfig() {
  try {
    await defaultJwks.getJwks();
  } catch (error) {
    if (!getPublicKeyPath() && !getJwksJsonPath()) {
      throw new Error(
        'Set PUBLIC_KEY_PATH (and JWT_KID) or JWKS_JSON_PATH in backend/.env'
      );
    }
    throw error;
  }

  if (providerJwks.isConfigured()) {
    await providerJwks.getJwks();
  }

  if (patientJwks.isConfigured()) {
    await patientJwks.getJwks();
  }
}

const getJwksEndpoint = createJwksEndpoint(defaultJwks.getJwks);
const getProviderJwksEndpoint = createJwksEndpoint(
  providerJwks.getJwks,
  'PROVIDER_',
  'Provider JWKS'
);
const getPatientJwksEndpoint = createJwksEndpoint(
  patientJwks.getJwks,
  'PATIENT_',
  'Patient JWKS'
);

module.exports = {
  getJwksEndpoint,
  getProviderJwksEndpoint,
  getPatientJwksEndpoint,
  validateJwksConfig,
  hasProviderJwksConfig: providerJwks.isConfigured,
  hasPatientJwksConfig: patientJwks.isConfigured,
};
