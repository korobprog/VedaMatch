import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const ENABLE_AUTH = ['1', 'true', 'yes', 'on'].includes((__ENV.ENABLE_AUTH || '').toLowerCase());

const DURATION = __ENV.DURATION || '3m';
const PUBLIC_RPS = Number(__ENV.PUBLIC_RPS || 25);
const PUBLIC_PREALLOCATED_VUS = Number(__ENV.PUBLIC_PREALLOCATED_VUS || 30);
const PUBLIC_MAX_VUS = Number(__ENV.PUBLIC_MAX_VUS || 160);
const AUTH_VUS = Number(__ENV.AUTH_VUS || 8);

const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || '10s';

export const options = {
  scenarios: {
    public_read: {
      executor: 'constant-arrival-rate',
      rate: PUBLIC_RPS,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PUBLIC_PREALLOCATED_VUS,
      maxVUs: PUBLIC_MAX_VUS,
      exec: 'publicReadScenario',
      tags: { scope: 'public' },
    },
    auth_mix: {
      executor: 'constant-vus',
      vus: AUTH_VUS,
      duration: DURATION,
      startTime: '10s',
      exec: 'authScenario',
      tags: { scope: 'auth' },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    'http_req_duration{scope:public}': ['p(95)<900'],
    'http_req_duration{scope:auth}': ['p(95)<1000'],
  },
  discardResponseBodies: true,
};

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function requestId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function baseHeaders(extra = {}) {
  return {
    Accept: 'application/json',
    'X-Request-ID': requestId(),
    ...extra,
  };
}

function authHeaders() {
  if (!AUTH_TOKEN) {
    return baseHeaders();
  }
  return baseHeaders({ Authorization: `Bearer ${AUTH_TOKEN}` });
}

export function publicReadScenario() {
  const endpoint = randomChoice([
    '/api/news?page=1&limit=20',
    '/api/news/latest?limit=5',
    '/api/services?page=1&limit=20',
    '/api/feed?page=1&limit=20',
  ]);

  const response = http.get(`${BASE_URL}${endpoint}`, {
    headers: baseHeaders(),
    timeout: REQUEST_TIMEOUT,
    tags: { scope: 'public', endpoint },
  });

  check(response, {
    'public status is 200/304/429': (r) => [200, 304, 429].includes(r.status),
  });

  sleep(0.1);
}

export function authScenario() {
  if (!ENABLE_AUTH || !AUTH_TOKEN) {
    sleep(1);
    return;
  }

  const op = randomChoice(['contacts', 'heartbeat', 'feed']);

  if (op === 'contacts') {
    const response = http.get(`${BASE_URL}/api/contacts?tab=all&limit=50`, {
      headers: authHeaders(),
      timeout: REQUEST_TIMEOUT,
      tags: { scope: 'auth', endpoint: '/api/contacts' },
    });
    check(response, {
      'contacts status is 200/429': (r) => [200, 429].includes(r.status),
    });
    sleep(0.2);
    return;
  }

  if (op === 'feed') {
    const response = http.get(`${BASE_URL}/api/feed?page=1&limit=20`, {
      headers: authHeaders(),
      timeout: REQUEST_TIMEOUT,
      tags: { scope: 'auth', endpoint: '/api/feed' },
    });
    check(response, {
      'auth feed status is 200/304/429': (r) => [200, 304, 429].includes(r.status),
    });
    sleep(0.15);
    return;
  }

  const response = http.post(`${BASE_URL}/api/heartbeat`, null, {
    headers: authHeaders(),
    timeout: REQUEST_TIMEOUT,
    tags: { scope: 'auth', endpoint: '/api/heartbeat' },
  });
  check(response, {
    'heartbeat status is 200/429': (r) => [200, 429].includes(r.status),
  });
  sleep(0.3);
}
