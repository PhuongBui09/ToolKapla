const DEFAULT_NAMESPACE = 'toolkapla';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function getRedisBaseUrl() {
  return (
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.AUTO_REDIS_REST_URL ||
    ''
  ).trim();
}

function getRedisToken() {
  return (
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.AUTO_REDIS_REST_TOKEN ||
    ''
  ).trim();
}

function getNamespace() {
  return (process.env.AUTO_STORAGE_NAMESPACE || DEFAULT_NAMESPACE).trim() || DEFAULT_NAMESPACE;
}

function isRedisConfigured() {
  return Boolean(getRedisBaseUrl() && getRedisToken());
}

function getScopedKey(key) {
  return `${getNamespace()}:${key}`;
}

function createRedisConfigError() {
  return new Error(
    'Auto backend chưa được cấu hình. Cần thêm KV_REST_API_URL và KV_REST_API_TOKEN trên Vercel.',
  );
}

async function redisCommand(command) {
  const baseUrl = getRedisBaseUrl();
  const token = getRedisToken();

  if (!baseUrl || !token) {
    throw createRedisConfigError();
  }

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.error ||
      payload?.message ||
      `Redis REST request failed with status ${response.status}`;
    throw new Error(message);
  }

  if (payload?.error) {
    throw new Error(payload.error);
  }

  return payload?.result;
}

async function getJson(key, fallbackValue) {
  const rawValue = await redisCommand(['GET', getScopedKey(key)]);
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return clone(fallbackValue);
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return clone(fallbackValue);
  }
}

async function setJson(key, value) {
  await redisCommand(['SET', getScopedKey(key), JSON.stringify(value)]);
  return value;
}

function createLockToken() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getLockKey(lockName) {
  return getScopedKey(`locks:${lockName}`);
}

async function acquireLock(lockName, ttlSeconds = 300) {
  const token = createLockToken();
  const result = await redisCommand([
    'SET',
    getLockKey(lockName),
    token,
    'NX',
    'EX',
    String(ttlSeconds),
  ]);

  return result === 'OK' ? token : null;
}

async function releaseLock(lockName, token) {
  if (!token) {
    return false;
  }

  const result = await redisCommand([
    'EVAL',
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
    '1',
    getLockKey(lockName),
    token,
  ]);

  return Number(result) === 1;
}

module.exports = {
  acquireLock,
  createRedisConfigError,
  getJson,
  getScopedKey,
  isRedisConfigured,
  redisCommand,
  releaseLock,
  setJson,
};
