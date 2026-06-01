// redisCacheService.js
// In-memory cache implementation to replace Redis for Vercel serverless functions and local environments.

const cache = new Map();

async function getJson(key) {
  const item = cache.get(key);
  if (!item) {
    return null;
  }

  // Check if the item has expired
  if (item.expiresAt && Date.now() > item.expiresAt) {
    cache.delete(key);
    return null;
  }

  return item.value;
}

async function setJson(key, value, ttlSeconds) {
  let expiresAt = null;
  if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
    expiresAt = Date.now() + (ttlSeconds * 1000);
  }

  cache.set(key, {
    value,
    expiresAt,
  });

  return true;
}

module.exports = {
  getJson,
  setJson,
};
