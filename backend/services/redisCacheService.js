const { createClient } = require('redis');

let redisClient = null;
let redisConnectPromise = null;
let hasLoggedRedisFailure = false;

function getRedisUrl() {
  return process.env.REDIS_URL || 'redis://127.0.0.1:6379';
}

async function getRedisClient() {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (!redisClient) {
    redisClient = createClient({ url: getRedisUrl() });

    redisClient.on('error', (error) => {
      if (!hasLoggedRedisFailure) {
        hasLoggedRedisFailure = true;
        console.warn('[redisCacheService] Redis unavailable, falling back to direct auth calls.', error.message);
      }
    });
  }

  if (!redisConnectPromise) {
    redisConnectPromise = redisClient.connect().catch((error) => {
      redisConnectPromise = null;
      throw error;
    });
  }

  try {
    await redisConnectPromise;
    hasLoggedRedisFailure = false;
    return redisClient;
  } catch (error) {
    return null;
  }
}

async function getJson(key) {
  const client = await getRedisClient();

  if (!client) {
    return null;
  }

  try {
    const value = await client.get(key);

    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.warn('[redisCacheService] Failed to read cached JSON value.', error.message);
    return null;
  }
}

async function setJson(key, value, ttlSeconds) {
  const client = await getRedisClient();

  if (!client) {
    return false;
  }

  try {
    const serializedValue = JSON.stringify(value);

    if (Number.isFinite(ttlSeconds) && ttlSeconds > 0) {
      await client.set(key, serializedValue, { EX: Math.floor(ttlSeconds) });
    } else {
      await client.set(key, serializedValue);
    }

    return true;
  } catch (error) {
    console.warn('[redisCacheService] Failed to write cached JSON value.', error.message);
    return false;
  }
}

module.exports = {
  getJson,
  setJson,
};
