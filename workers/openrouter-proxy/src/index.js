/**
 * OpenRouter Simple Proxy Worker
 * 
 * Чистое проксирование запросов к OpenRouter API:
 * - Защита API ключа (ключ хранится в worker, не передаётся клиенту)
 * - Rate limiting
 * - CORS поддержка
 * 
 * Умный роутинг выполняется на backend!
 */

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

/**
 * Rate limiting с использованием KV
 */
async function checkRateLimit(request, env) {
    if (!env.RATE_LIMIT_KV) {
        return { allowed: true };
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate:${ip}`;
    const limit = parseInt(env.RATE_LIMIT_PER_MINUTE) || 60;

    const current = await env.RATE_LIMIT_KV.get(key);
    const count = current ? parseInt(current) : 0;

    if (count >= limit) {
        return { allowed: false, remaining: 0 };
    }

    await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), { expirationTtl: 60 });
    return { allowed: true, remaining: limit - count - 1 };
}

/**
 * CORS headers
 */
function getCorsHeaders(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim());

    const isAllowed = allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin === '';

    return {
        'Access-Control-Allow-Origin': isAllowed ? origin || '*' : allowedOrigins[0] || '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
        'Access-Control-Max-Age': '86400',
    };
}

/**
 * OPTIONS preflight
 */
function handleOptions(request, env) {
    return new Response(null, {
        status: 204,
        headers: getCorsHeaders(request, env),
    });
}

/**
 * Health check
 */
function handleHealth(request, env) {
    return new Response(JSON.stringify({
        status: 'ok',
        service: 'openrouter-proxy',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        hasApiKey: !!env.OPENROUTER_API_KEY,
    }), {
        headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request, env),
        },
    });
}

/**
 * Проксирование chat completions
 */
async function handleChatCompletions(request, env) {
    if (!env.OPENROUTER_API_KEY) {
        return new Response(JSON.stringify({
            error: { message: 'OpenRouter API key not configured', type: 'configuration_error' }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request, env) },
        });
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(request, env);
    if (!rateLimit.allowed) {
        return new Response(JSON.stringify({
            error: { message: 'Rate limit exceeded', type: 'rate_limit_error' }
        }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...getCorsHeaders(request, env) },
        });
    }

    // Получить тело запроса
    let body;
    try {
        body = await request.text();
    } catch (e) {
        return new Response(JSON.stringify({
            error: { message: 'Invalid request body', type: 'invalid_request_error' }
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request, env) },
        });
    }

    // Прокси к OpenRouter
    const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
            'HTTP-Referer': env.SITE_URL || 'https://vedicai.ru',
            'X-Title': env.SITE_NAME || 'VedicAI',
        },
        body: body,
    });

    // Пробросить ответ
    const responseBody = await response.text();

    return new Response(responseBody, {
        status: response.status,
        headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/json',
            'X-RateLimit-Remaining': rateLimit.remaining?.toString() || 'unlimited',
            ...getCorsHeaders(request, env),
        },
    });
}

/**
 * Получение списка моделей
 */
async function handleModels(request, env) {
    if (!env.OPENROUTER_API_KEY) {
        return new Response(JSON.stringify({
            error: { message: 'API key not configured' }
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request, env) },
        });
    }

    const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        headers: {
            'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
        },
    });

    const data = await response.text();

    return new Response(data, {
        status: response.status,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request, env) },
    });
}

/**
 * Main handler
 */
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        if (request.method === 'OPTIONS') {
            return handleOptions(request, env);
        }

        switch (true) {
            case path === '/health':
            case path === '/':
                return handleHealth(request, env);

            case path === '/models':
            case path === '/v1/models':
                return handleModels(request, env);

            case path === '/v1/chat/completions':
            case path === '/chat/completions':
                if (request.method !== 'POST') {
                    return new Response(JSON.stringify({ error: { message: 'Method not allowed' } }), {
                        status: 405,
                        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request, env) },
                    });
                }
                return handleChatCompletions(request, env);

            default:
                return new Response(JSON.stringify({ error: { message: 'Not found' } }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json', ...getCorsHeaders(request, env) },
                });
        }
    },
};
