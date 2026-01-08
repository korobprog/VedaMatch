// Cloudflare Worker для проксирования Google Gemini API
// URL: https://mute-waterfall-ef1e.makstreid.workers.dev

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
    // Разрешаем CORS
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-goog-api-key',
            },
        })
    }

    // Проксируем запрос к Google Gemini API
    const url = new URL(request.url)

    // Определяем целевой URL
    let targetUrl
    if (url.pathname.startsWith('/upload/')) {
        // Upload API
        targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`
    } else if (url.pathname.startsWith('/v1beta/')) {
        // Gemini API v1beta
        targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`
    } else {
        // По умолчанию - Gemini API
        targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`
    }

    // Копируем заголовки
    const headers = new Headers()
    headers.set('Content-Type', request.headers.get('Content-Type') || 'application/json')

    // Передаем API ключ если есть в заголовке
    const apiKey = request.headers.get('X-goog-api-key')
    if (apiKey) {
        headers.set('X-goog-api-key', apiKey)
    }

    const modifiedRequest = new Request(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' ? request.body : null,
    })

    try {
        const response = await fetch(modifiedRequest)

        // Создаем новый ответ с CORS заголовками
        const responseHeaders = new Headers(response.headers)
        responseHeaders.set('Access-Control-Allow-Origin', '*')
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-goog-api-key')

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
        })
    }
}
