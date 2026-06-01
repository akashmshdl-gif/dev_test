const axios = require('axios');
const { getJson, setJson } = require('./redisCacheService');

const DEFAULT_ULALO_AUTH_URL = 'https://ulalo-api.theagentic.ai/api/v1/auth/login';
const DEFAULT_ULALO_API_BASE_URL = 'https://ulalo-api.theagentic.ai/api/v1';
const DEFAULT_ULALO_EMAIL = 'admin@ulalo.io';
const DEFAULT_ULALO_PASSWORD = 'admin123';
const TOKEN_CACHE_KEY = 'ulalo:trial-match:access-token';
const TOKEN_REFRESH_BUFFER_SECONDS = 60;

function getUlaloConfig() {
  return {
    authUrl: process.env.ULALO_AUTH_URL || DEFAULT_ULALO_AUTH_URL,
    apiBaseUrl: process.env.ULALO_API_BASE_URL || DEFAULT_ULALO_API_BASE_URL,
    email: process.env.ULALO_EMAIL || DEFAULT_ULALO_EMAIL,
    password: process.env.ULALO_PASSWORD || DEFAULT_ULALO_PASSWORD,
  };
}

function decodeJwtPayload(token) {
  if (typeof token !== 'string' || !token.includes('.')) {
    return null;
  }

  const [, payloadSegment] = token.split('.');

  try {
    const normalizedSegment = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    const paddedSegment = normalizedSegment.padEnd(Math.ceil(normalizedSegment.length / 4) * 4, '=');
    const decodedPayload = Buffer.from(paddedSegment, 'base64').toString('utf8');

    return JSON.parse(decodedPayload);
  } catch (error) {
    return null;
  }
}

function getTokenExpiryEpochSeconds(accessToken) {
  const payload = decodeJwtPayload(accessToken);
  const expiry = Number(payload?.exp);

  if (Number.isFinite(expiry) && expiry > 0) {
    return expiry;
  }

  return Math.floor(Date.now() / 1000) + 60 * 60;
}

async function loginAndCacheToken() {
  const { authUrl, email, password } = getUlaloConfig();
  const response = await axios.post(
    authUrl,
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    },
  );

  const accessToken = response.data?.access_token;

  if (typeof accessToken !== 'string' || !accessToken.trim()) {
    throw new Error('Ulalo auth response did not include an access token.');
  }

  const expiresAtEpochSeconds = getTokenExpiryEpochSeconds(accessToken);
  const ttlSeconds = Math.max(expiresAtEpochSeconds - Math.floor(Date.now() / 1000) - TOKEN_REFRESH_BUFFER_SECONDS, 1);

  await setJson(TOKEN_CACHE_KEY, { accessToken, expiresAtEpochSeconds }, ttlSeconds);

  return accessToken;
}

async function getUlaloAccessToken() {
  const cachedToken = await getJson(TOKEN_CACHE_KEY);
  const nowEpochSeconds = Math.floor(Date.now() / 1000);

  if (
    cachedToken &&
    typeof cachedToken.accessToken === 'string' &&
    Number.isFinite(Number(cachedToken.expiresAtEpochSeconds)) &&
    Number(cachedToken.expiresAtEpochSeconds) - TOKEN_REFRESH_BUFFER_SECONDS > nowEpochSeconds
  ) {
    return cachedToken.accessToken;
  }

  return loginAndCacheToken();
}

async function fetchUlaloTrialMatchCards(epicPatientId) {
  if (!epicPatientId || typeof epicPatientId !== 'string') {
    throw new Error('Epic patient id is required to fetch Ulalo trial matches.');
  }

  const token = await getUlaloAccessToken();
  const { apiBaseUrl } = getUlaloConfig();
  const normalizedBaseUrl = apiBaseUrl.replace(/\/$/, '');
  const endpoint = `${normalizedBaseUrl}/patients/epic/${encodeURIComponent(epicPatientId)}/trial-matches`;

  const response = await axios.post(
    endpoint,
    {
      method: 'llm',
      response_format: 'cds-hooks',
      notes: 'screening run',
      force_refresh: false,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      timeout: 90000,
    },
  );

  return Array.isArray(response.data?.cards) ? response.data.cards : [];
}

module.exports = {
  fetchUlaloTrialMatchCards,
};
