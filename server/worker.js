export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // 1. CORS Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-goog-api-key',
                },
            });
        }

        // 2. Image Proxy
        const proxyUrl = url.searchParams.get('url');
        if (proxyUrl) {
            try {
                const imageResponse = await fetch(proxyUrl, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                    }
                });
                const newHeaders = new Headers(imageResponse.headers);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                return new Response(imageResponse.body, { status: imageResponse.status, headers: newHeaders });
            } catch (e) {
                return new Response('Proxy Error: ' + e.message, { status: 500 });
            }
        }

        // 3. Gemini API Proxy (With Key Rotation)
        if (url.pathname.startsWith('/v1beta/')) {
            const targetUrl = `https://generativelanguage.googleapis.com${url.pathname}${url.search}`;

            // 1. Collect all available keys and TRIM them
            let keys = [];

            // Helper to add key if valid
            const addKey = (k) => {
                if (k && typeof k === 'string' && k.trim().length > 0) {
                    keys.push(k.trim());
                }
            };

            addKey(request.headers.get('X-goog-api-key'));
            addKey(url.searchParams.get('key'));

            // Secrets
            if (env.GEMINI_API_KEY_1) addKey(env.GEMINI_API_KEY_1);
            if (env.GEMINI_API_KEY_2) addKey(env.GEMINI_API_KEY_2);
            if (env.GEMINI_API_KEY_3) addKey(env.GEMINI_API_KEY_3);
            if (env.GEMINI_API_KEY) addKey(env.GEMINI_API_KEY);

            if (keys.length === 0) {
                return new Response(JSON.stringify({
                    error: "No API Keys found in Worker Secrets or Request",
                    debug_env_keys: Object.keys(env).filter(k => k.includes('GEMINI')) // Show variable names present
                }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }

            const reqBody = request.method === 'POST' ? await request.text() : null;
            let lastError = null;
            let lastStatus = 0;

            // 2. Try keys sequentially
            for (let i = 0; i < keys.length; i++) {
                const currentKey = keys[i];

                const newHeaders = new Headers();
                newHeaders.set('Content-Type', 'application/json');
                newHeaders.set('X-goog-api-key', currentKey);
                newHeaders.set('User-Agent', 'Gemini-Proxy/1.0');

                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

                    const response = await fetch(targetUrl, {
                        method: request.method,
                        headers: newHeaders,
                        body: reqBody,
                        signal: controller.signal,
                        keepalive: false // Disable keepalive to prevent hang
                    });
                    clearTimeout(timeoutId);

                    // If success, return immediately
                    if (response.ok) {
                        const respHeaders = new Headers(response.headers);
                        respHeaders.set('Access-Control-Allow-Origin', '*');

                        const responseData = await response.arrayBuffer();
                        return new Response(responseData, {
                            status: response.status,
                            headers: respHeaders,
                        });
                    }

                    // If Error:
                    lastStatus = response.status;
                    const errText = await response.text();
                    lastError = errText;

                    // Debug log (in Cloudflare logs)
                    console.log(`Key ${i} failed. Status: ${response.status}. Err: ${errText.substring(0, 100)}`);

                    // If the key is invalid (400 or 403), try next key.
                    // If it's a 429 (Rate Limit), definitely try next key.
                    // If 500, maybe Google is down? Try next anyway.

                } catch (e) {
                    lastError = e.message;
                    console.log(`Key ${i} exception: ${e.message}`);
                }
            }

            // 3. All keys failed
            return new Response(JSON.stringify({
                error: "All Gemini keys exhausted or failed",
                last_status: lastStatus,
                last_error: lastError,
                keys_tried: keys.length
            }), { status: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
        }

        return new Response('Worker Online (Trim+Keepalive Fix)', { status: 200 });
    },
};
