import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const ENABLE_AUTH = ['1', 'true', 'yes', 'on'].includes((__ENV.ENABLE_AUTH || '').toLowerCase());
const ENABLE_CONDITIONAL_CACHE = !['0', 'false', 'no', 'off'].includes((__ENV.ENABLE_CONDITIONAL_CACHE || '1').toLowerCase());

const DURATION = __ENV.DURATION || '3m';
const PUBLIC_RPS = Number(__ENV.PUBLIC_RPS || 25);
const PUBLIC_PREALLOCATED_VUS = Number(__ENV.PUBLIC_PREALLOCATED_VUS || 30);
const PUBLIC_MAX_VUS = Number(__ENV.PUBLIC_MAX_VUS || 160);
const AUTH_VUS = Number(__ENV.AUTH_VUS || 8);
const CACHE_VUS = Number(__ENV.CACHE_VUS || 4);

const REQUEST_TIMEOUT = __ENV.REQUEST_TIMEOUT || '10s';

const STATUS_304 = new Counter('status_304_total');
const STATUS_429 = new Counter('status_429_total');
const CACHE_REVALIDATED = new Counter('cache_revalidated_total');
const TRANSPORT_ERRORS = new Counter('transport_errors_total');
const UNEXPECTED_STATUS = new Counter('unexpected_status_total');
const STATUS_5XX = new Counter('status_5xx_total');
const STATUS_4XX_OTHER = new Counter('status_4xx_other_total');
const STATUS_401 = new Counter('status_401_total');
const STATUS_403 = new Counter('status_403_total');
const STATUS_404 = new Counter('status_404_total');

const etagByEndpoint = {};

http.setResponseCallback(http.expectedStatuses({ min: 200, max: 299 }, 304, 429));

const scenarios = {};

if (PUBLIC_RPS > 0) {
  scenarios.public_read = {
    executor: 'constant-arrival-rate',
    rate: PUBLIC_RPS,
    timeUnit: '1s',
    duration: DURATION,
    preAllocatedVUs: PUBLIC_PREALLOCATED_VUS,
    maxVUs: PUBLIC_MAX_VUS,
    exec: 'publicReadScenario',
    tags: { scope: 'public' },
  };
}

if (AUTH_VUS > 0) {
  scenarios.auth_mix = {
    executor: 'constant-vus',
    vus: AUTH_VUS,
    duration: DURATION,
    startTime: '10s',
    exec: 'authScenario',
    tags: { scope: 'auth' },
  };
}

if (CACHE_VUS > 0) {
  scenarios.conditional_cache = {
    executor: 'constant-vus',
    vus: CACHE_VUS,
    duration: DURATION,
    startTime: '15s',
    exec: 'conditionalCacheScenario',
    tags: { scope: 'cache' },
  };
}

const thresholds = {
  http_req_failed: ['rate<0.05'],
};

if (PUBLIC_RPS > 0) {
  thresholds['http_req_duration{scope:public}'] = ['p(95)<900'];
}

if (AUTH_VUS > 0) {
  thresholds['http_req_duration{scope:auth}'] = ['p(95)<1000'];
}

if (CACHE_VUS > 0) {
  thresholds['http_req_duration{scope:cache}'] = ['p(95)<900'];
}

export const options = {
  scenarios,
  thresholds,
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

function getHeaderValue(response, headerName) {
  if (!response || !response.headers) {
    return '';
  }

  const target = String(headerName || '').toLowerCase();
  const key = Object.keys(response.headers).find((k) => k.toLowerCase() === target);
  if (!key) {
    return '';
  }

  const raw = response.headers[key];
  if (Array.isArray(raw)) {
    return String(raw[0] || '').trim();
  }
  return String(raw || '').trim();
}

function trackTransportError(response, scope, endpoint) {
  if (response.status === 0) {
    TRANSPORT_ERRORS.add(1, { scope, endpoint });
    return;
  }

  if (response.status === 429 || response.status === 304 || (response.status >= 200 && response.status < 300)) {
    return;
  }

  UNEXPECTED_STATUS.add(1, { scope, endpoint, status: String(response.status) });

  if (response.status >= 500) {
    STATUS_5XX.add(1, { scope, endpoint, status: String(response.status) });
  } else if (response.status >= 400) {
    STATUS_4XX_OTHER.add(1, { scope, endpoint, status: String(response.status) });
    if (response.status === 401) {
      STATUS_401.add(1, { scope, endpoint });
    } else if (response.status === 403) {
      STATUS_403.add(1, { scope, endpoint });
    } else if (response.status === 404) {
      STATUS_404.add(1, { scope, endpoint });
    }
  }
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
  trackTransportError(response, 'public', endpoint);

  if (response.status === 304) STATUS_304.add(1, { scope: 'public', endpoint });
  if (response.status === 429) STATUS_429.add(1, { scope: 'public', endpoint });

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
    trackTransportError(response, 'auth', '/api/contacts');
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
    trackTransportError(response, 'auth', '/api/feed');
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
  trackTransportError(response, 'auth', '/api/heartbeat');
  if (response.status === 429) STATUS_429.add(1, { scope: 'auth', endpoint: '/api/heartbeat' });
  check(response, {
    'heartbeat status is 200/429': (r) => [200, 429].includes(r.status),
  });
  sleep(0.3);
}

export function conditionalCacheScenario() {
  if (!ENABLE_CONDITIONAL_CACHE) {
    sleep(1);
    return;
  }

  const endpoint = randomChoice([
    '/api/news?page=1&limit=20',
    '/api/news/latest?limit=5',
    '/api/services?page=1&limit=20',
    '/api/feed?page=1&limit=20',
  ]);

  const headers = baseHeaders();
  const cachedETag = etagByEndpoint[endpoint];
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }

  const response = http.get(`${BASE_URL}${endpoint}`, {
    headers,
    timeout: REQUEST_TIMEOUT,
    tags: { scope: 'cache', endpoint },
  });
  trackTransportError(response, 'cache', endpoint);

  const responseETag = getHeaderValue(response, 'etag');
  if (responseETag) {
    etagByEndpoint[endpoint] = responseETag;
  }

  if (response.status === 304) {
    STATUS_304.add(1, { scope: 'cache', endpoint });
    CACHE_REVALIDATED.add(1, { endpoint });
  }
  if (response.status === 429) STATUS_429.add(1, { scope: 'cache', endpoint });

  check(response, {
    'cache status is 200/304/429': (r) => [200, 304, 429].includes(r.status),
  });

  sleep(0.2);
}
