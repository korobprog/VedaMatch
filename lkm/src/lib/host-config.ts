export type LKMRegion = 'cis' | 'non_cis';

export interface HostConfig {
  host: string;
  region: LKMRegion;
  currency: string;
  gatewayCode: string;
  apiBaseUrl: string;
}

function normalizeApiBaseURL(rawBaseURL: string): string {
  const trimmedBaseURL = rawBaseURL.trim().replace(/\\+/g, '/').replace(/\/+$/, '');
  if (!trimmedBaseURL) {
    return trimmedBaseURL;
  }
  if (trimmedBaseURL.endsWith('/api') || trimmedBaseURL.includes('/api/')) {
    return trimmedBaseURL;
  }
  return `${trimmedBaseURL}/api`;
}

function resolveApiBaseUrlForHost(hostname: string): string {
  const envURL = process.env.NEXT_PUBLIC_API_URL;
  if (envURL && envURL.trim() !== '') {
    return normalizeApiBaseURL(envURL);
  }

  const host = hostname.toLowerCase().trim();
  if (!host) {
    return 'http://localhost:8081/api';
  }
  if (host.includes('localhost') || host.startsWith('127.0.0.1')) {
    return 'http://localhost:8081/api';
  }
  if (host.endsWith('vedamatch.com') || host.endsWith('.vedamatch.com')) {
    return 'https://api.vedamatch.com/api';
  }
  return 'https://api.vedamatch.ru/api';
}

export function resolveLkmHostConfig(hostname: string): HostConfig {
  const host = hostname.toLowerCase().trim();
  const region: LKMRegion = host.endsWith('.ru') ? 'cis' : 'non_cis';
  const currency = region === 'cis' ? 'RUB' : 'USD';
  const gatewayCode = region === 'cis' ? 'yookassa' : 'stripe';
  const apiBaseUrl = resolveApiBaseUrlForHost(hostname);

  return {
    host,
    region,
    currency,
    gatewayCode,
    apiBaseUrl,
  };
}
