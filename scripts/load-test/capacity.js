import http from 'k6/http';
import { check } from 'k6';
import execution from 'k6/execution';

import {
  BASE_URL,
  assertSafeTarget,
  bearerParams,
  envBoolean,
  envInteger,
  parseApiResponse,
  responseHeader,
  splitValues,
} from './config.js';

const credentialFile = JSON.parse(open(__ENV.CREDENTIALS_FILE || './credentials.example.json'));
const workload = (__ENV.WORKLOAD || 'mixed').toLowerCase();
const duration = __ENV.DURATION || '5m';
const totalRps = envInteger('RPS', 100);

const workloadExecutors = {
  auth: 'authFlow',
  'citizen-list': 'citizenListFlow',
  'admin-list': 'adminListFlow',
  create: 'createFlow',
};

function arrivalScenario(execName, rate) {
  return {
    executor: 'constant-arrival-rate',
    exec: execName,
    rate,
    timeUnit: '1s',
    duration,
    preAllocatedVUs: Math.max(10, Math.ceil(rate * 0.75)),
    maxVUs: Math.max(30, Math.ceil(rate * 3)),
    gracefulStop: '30s',
  };
}

function buildScenarios() {
  if (workloadExecutors[workload]) {
    return { [workload]: arrivalScenario(workloadExecutors[workload], totalRps) };
  }
  if (workload !== 'mixed') {
    throw new Error(`Unknown WORKLOAD '${workload}'.`);
  }

  const rates = {
    auth: envInteger('AUTH_RPS', 25, 0),
    'citizen-list': envInteger('CITIZEN_LIST_RPS', 30, 0),
    'admin-list': envInteger('ADMIN_LIST_RPS', 35, 0),
    create: envInteger('CREATE_RPS', 10, 0),
  };
  const configuredTotal = Object.values(rates).reduce((sum, rate) => sum + rate, 0);
  if (configuredTotal !== totalRps) {
    throw new Error(`Mixed scenario rates add up to ${configuredTotal}, but RPS is ${totalRps}.`);
  }

  return Object.fromEntries(
    Object.entries(rates)
      .filter(([, rate]) => rate > 0)
      .map(([name, rate]) => [name, arrivalScenario(workloadExecutors[name], rate)]),
  );
}

export const options = {
  scenarios: buildScenarios(),
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
    dropped_iterations: ['count==0'],
  },
  discardResponseBodies: false,
  noConnectionReuse: false,
  summaryTrendStats: ['avg', 'min', 'med', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'max'],
  summaryTimeUnit: 'ms',
  userAgent: 'Kentiva-k6-capacity-test/1.0',
};

function accountsFor(role) {
  const fromFile = Array.isArray(credentialFile[role]) ? credentialFile[role] : [];
  const envPrefix = role === 'citizens' ? 'CITIZEN' : 'ADMIN';
  const fromEnv = __ENV[`${envPrefix}_EMAIL`] && __ENV[`${envPrefix}_PASSWORD`]
    ? [{ email: __ENV[`${envPrefix}_EMAIL`], password: __ENV[`${envPrefix}_PASSWORD`] }]
    : [];
  return [...fromEnv, ...fromFile].filter((account) => account.email && account.password);
}

function configuredTokens(role) {
  const envPrefix = role === 'citizens' ? 'CITIZEN' : 'ADMIN';
  const fromEnv = [
    ...splitValues(__ENV[`${envPrefix}_TOKENS`]),
    ...splitValues(__ENV[`${envPrefix}_TOKEN`]),
  ];
  const fromFile = credentialFile.tokens && Array.isArray(credentialFile.tokens[role])
    ? credentialFile.tokens[role]
    : [];
  return [...fromEnv, ...fromFile].filter(Boolean);
}

function loginAccounts(role) {
  const tokens = configuredTokens(role);
  for (const account of accountsFor(role)) {
    const response = http.post(
      `${BASE_URL}/api/v1/auth/login`,
      JSON.stringify(account),
      {
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        tags: { flow: 'setup-login' },
      },
    );
    const body = parseApiResponse(response);
    if (response.status !== 200 || !body?.data?.accessToken) {
      throw new Error(`Could not authenticate ${role} account ${account.email}: HTTP ${response.status}.`);
    }
    tokens.push(body.data.accessToken);
  }
  return tokens;
}

function requireTokens(tokens, role) {
  if (tokens.length === 0) {
    throw new Error(
      `No ${role} authentication configured. Use environment credentials/tokens or CREDENTIALS_FILE.`,
    );
  }
}

function verifyToken(token, role) {
  const response = http.get(
    `${BASE_URL}/api/v1/auth/me`,
    bearerParams(token, 'setup-auth-check'),
  );
  const body = parseApiResponse(response);
  if (response.status !== 200 || body?.success !== true) {
    throw new Error(`${role} token preflight failed: HTTP ${response.status}.`);
  }

  if (envBoolean('REQUIRE_RATE_LIMIT_DISABLED', true)
      && responseHeader(response, 'X-RateLimit-Limit')) {
    throw new Error(
      'Capacity test detected active rate limiting. Start only the isolated test backend with '
      + 'APP_SECURITY_RATE_LIMIT_ENABLED=false, or provide enough distinct users and set '
      + 'REQUIRE_RATE_LIMIT_DISABLED=false.',
    );
  }
}

function resolveCategoryId() {
  if (__ENV.CATEGORY_ID) {
    return __ENV.CATEGORY_ID;
  }
  const municipalityQuery = __ENV.MUNICIPALITY_ID
    ? `?municipalityId=${encodeURIComponent(__ENV.MUNICIPALITY_ID)}`
    : '';
  const response = http.get(
    `${BASE_URL}/api/v1/categories${municipalityQuery}`,
    { tags: { flow: 'setup-category' } },
  );
  const body = parseApiResponse(response);
  const category = body?.data?.find((entry) => entry?.id);
  if (response.status !== 200 || !category) {
    throw new Error('CATEGORY_ID is required because no active category could be discovered.');
  }
  return category.id;
}

export function setup() {
  const writesData = workload === 'create' || workload === 'mixed';
  assertSafeTarget({ writesData });

  const needsCitizen = workload !== 'admin-list';
  const needsAdmin = workload === 'admin-list' || workload === 'mixed';
  const citizenTokens = needsCitizen ? loginAccounts('citizens') : [];
  const adminTokens = needsAdmin ? loginAccounts('admins') : [];

  if (needsCitizen) {
    requireTokens(citizenTokens, 'citizen');
    verifyToken(citizenTokens[0], 'Citizen');
  }
  if (needsAdmin) {
    requireTokens(adminTokens, 'admin');
    verifyToken(adminTokens[0], 'Admin');
  }

  return {
    citizenTokens,
    adminTokens,
    categoryId: writesData ? resolveCategoryId() : null,
  };
}

function tokenFor(tokens) {
  const index = execution.scenario.iterationInTest % tokens.length;
  return tokens[index];
}

function successfulApiResponse(response, expectedStatus) {
  const body = parseApiResponse(response);
  return response.status === expectedStatus && body?.success === true;
}

export function authFlow(data) {
  const tokens = data.citizenTokens.length > 0 ? data.citizenTokens : data.adminTokens;
  const response = http.get(
    `${BASE_URL}/api/v1/auth/me`,
    bearerParams(tokenFor(tokens), 'auth'),
  );
  check(response, {
    'auth/me returns 200 and success': (res) => successfulApiResponse(res, 200),
  }, { flow: 'auth' });
}

export function citizenListFlow(data) {
  const response = http.get(
    `${BASE_URL}/api/v1/reports/my?page=0&size=20&sort=createdAt,desc`,
    bearerParams(tokenFor(data.citizenTokens), 'citizen-list'),
  );
  check(response, {
    'citizen report list returns 200 and success': (res) => successfulApiResponse(res, 200),
  }, { flow: 'citizen-list' });
}

export function adminListFlow(data) {
  const response = http.get(
    `${BASE_URL}/api/v1/reports?page=0&size=20&sort=createdAt,desc`,
    bearerParams(tokenFor(data.adminTokens), 'admin-list'),
  );
  check(response, {
    'admin report list returns 200 and success': (res) => successfulApiResponse(res, 200),
  }, { flow: 'admin-list' });
}

export function createFlow(data) {
  const uniquePart = `${execution.vu.idInTest}-${execution.scenario.iterationInTest}-${Date.now()}`;
  const requestBody = {
    title: `Yuk testi yol aydinlatma arizasi ${uniquePart}`,
    description: `Izole performans testi tarafindan olusturulan metin ihbari ${uniquePart}.`,
    categoryId: data.categoryId,
    latitude: Number.parseFloat(__ENV.LATITUDE || '40.8739'),
    longitude: Number.parseFloat(__ENV.LONGITUDE || '35.2147'),
    district: __ENV.DISTRICT || 'Gümüşhacıköy',
    mediaUrls: [],
    kvkkApproved: true,
  };
  if (__ENV.MUNICIPALITY_ID) {
    requestBody.targetMunicipalityId = __ENV.MUNICIPALITY_ID;
  }

  const response = http.post(
    `${BASE_URL}/api/v1/reports`,
    JSON.stringify(requestBody),
    bearerParams(tokenFor(data.citizenTokens), 'create', {
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  check(response, {
    'text report creation returns 201 and success': (res) => successfulApiResponse(res, 201),
  }, { flow: 'create' });
}
