const DEFAULT_CONFIRMATION = 'KENTIVA_STAGING_LOAD_TEST';

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');
export const TARGET_ENV = (__ENV.TARGET_ENV || 'local').toLowerCase();
export const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || '10s';

export function envBoolean(name, defaultValue = false) {
  const raw = __ENV[name];
  if (raw === undefined || raw === '') {
    return defaultValue;
  }
  return raw.toLowerCase() === 'true';
}

export function envInteger(name, defaultValue, minimum = 1) {
  const value = Number.parseInt(__ENV[name] || `${defaultValue}`, 10);
  if (!Number.isFinite(value) || value < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}.`);
  }
  return value;
}

export function splitValues(value) {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function assertSafeTarget({ writesData = false } = {}) {
  if (!/^https?:\/\//i.test(BASE_URL)) {
    throw new Error('BASE_URL must start with http:// or https://.');
  }

  if (TARGET_ENV === 'prod' || TARGET_ENV === 'production') {
    throw new Error('Load tests are intentionally blocked for production targets.');
  }

  const localTarget = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?(?:\/|$)/i.test(BASE_URL);
  if (!localTarget) {
    const remoteAllowed = envBoolean('ALLOW_REMOTE_TARGET')
      && TARGET_ENV === 'staging'
      && __ENV.LOAD_TEST_CONFIRM === DEFAULT_CONFIRMATION;
    if (!remoteAllowed) {
      throw new Error(
        `Remote load tests require TARGET_ENV=staging, ALLOW_REMOTE_TARGET=true and `
        + `LOAD_TEST_CONFIRM=${DEFAULT_CONFIRMATION}.`,
      );
    }
  }

  if (writesData && !envBoolean('ALLOW_WRITES')) {
    throw new Error('This workload writes test data. Set ALLOW_WRITES=true for an isolated test database.');
  }
}

export function bearerParams(token, flow, extra = {}) {
  const { headers = {}, tags = {}, ...rest } = extra;
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...headers,
    },
    tags: { flow, ...tags },
    timeout: REQUEST_TIMEOUT,
    ...rest,
  };
}

export function parseApiResponse(response) {
  try {
    return response.json();
  } catch (_error) {
    return null;
  }
}

export function responseHeader(response, name) {
  const expected = name.toLowerCase();
  const key = Object.keys(response.headers || {}).find((candidate) => candidate.toLowerCase() === expected);
  return key ? response.headers[key] : null;
}
