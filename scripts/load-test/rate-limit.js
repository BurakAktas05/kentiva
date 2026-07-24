import http from 'k6/http';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

import {
  BASE_URL,
  assertSafeTarget,
  envInteger,
  parseApiResponse,
  responseHeader,
} from './config.js';

const credentialFile = JSON.parse(open(__ENV.CREDENTIALS_FILE || './credentials.example.json'));
const validResponses = new Rate('valid_rate_limit_response');
const rejections = new Counter('rate_limit_rejections');
const acceptedLogins = new Counter('accepted_logins');
const acceptedOrRateLimited = http.expectedStatuses(200, 429);

export const options = {
  scenarios: {
    'login-rate-limit': {
      executor: 'constant-arrival-rate',
      rate: envInteger('RPS', 2),
      timeUnit: '1s',
      duration: __ENV.DURATION || '15s',
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.01'],
    valid_rate_limit_response: ['rate>0.99'],
    accepted_logins: ['count>0'],
    rate_limit_rejections: ['count>0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'max'],
  summaryTimeUnit: 'ms',
  userAgent: 'Kentiva-k6-rate-limit-test/1.0',
};

function loginCredential() {
  if (__ENV.CITIZEN_EMAIL && __ENV.CITIZEN_PASSWORD) {
    return { email: __ENV.CITIZEN_EMAIL, password: __ENV.CITIZEN_PASSWORD };
  }
  const candidate = Array.isArray(credentialFile.citizens) ? credentialFile.citizens[0] : null;
  if (!candidate?.email || !candidate?.password) {
    throw new Error('CITIZEN_EMAIL and CITIZEN_PASSWORD (or a credential file) are required.');
  }
  return candidate;
}

export function setup() {
  assertSafeTarget({ writesData: true });
  const credential = loginCredential();
  const response = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(credential),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
  );
  if (response.status !== 200 || !parseApiResponse(response)?.data?.accessToken) {
    throw new Error(`Login preflight failed with HTTP ${response.status}; use a fresh test backend and valid credentials.`);
  }
  return { credential };
}

export default function (data) {
  const response = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify(data.credential),
    {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      tags: { flow: 'login-rate-limit' },
      responseCallback: acceptedOrRateLimited,
    },
  );
  const body = parseApiResponse(response);
  const accepted = response.status === 200 && body?.success === true;
  const rejectedSafely = response.status === 429
    && body?.errorCode === 'RATE_LIMIT_EXCEEDED'
    && Boolean(responseHeader(response, 'Retry-After'))
    && Boolean(responseHeader(response, 'X-RateLimit-Limit'))
    && responseHeader(response, 'X-RateLimit-Remaining') === '0';
  const valid = accepted || rejectedSafely;

  validResponses.add(valid);
  if (accepted) {
    acceptedLogins.add(1);
  }
  if (response.status === 429) {
    rejections.add(1);
  }
  check(response, {
    'login is accepted or rejected with the complete 429 contract': () => valid,
  }, { flow: 'login-rate-limit' });
}
