(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/admin/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/axios@1.13.2/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
;
const api = __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: ("TURBOPACK compile-time value", "http://localhost:8081/api") || 'http://localhost:8081/api'
});
// Add a request interceptor to add the auth headers if needed
api.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time truthy", 1) {
        const adminData = localStorage.getItem('admin_data');
        if (adminData) {
            const parsed = JSON.parse(adminData);
            // For now we just send the user id in a header since we don't have JWT yet
            // But we will use this to identify the admin
            config.headers['X-Admin-ID'] = parsed.id;
        }
    }
    return config;
});
const __TURBOPACK__default__export__ = api;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/admin/src/app/ai-models/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>AiModelsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/swr@2.3.8_react@19.0.0-rc.1/node_modules/swr/dist/index/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/refresh-cw.js [app-client] (ecmascript) <export default as RefreshCw>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/play.js [app-client] (ecmascript) <export default as Play>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/zap.js [app-client] (ecmascript) <export default as Zap>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/message-square.js [app-client] (ecmascript) <export default as MessageSquare>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Image$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/image.js [app-client] (ecmascript) <export default as Image>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/mic.js [app-client] (ecmascript) <export default as Mic>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/video.js [app-client] (ecmascript) <export default as Video>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-client] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/activity.js [app-client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/star.js [app-client] (ecmascript) <export default as Star>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/sparkles.js [app-client] (ecmascript) <export default as Sparkles>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$test$2d$tube$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TestTube$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/test-tube.js [app-client] (ecmascript) <export default as TestTube>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/database.js [app-client] (ecmascript) <export default as Database>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
const fetcher = (url)=>__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(url).then((res)=>res.data);
const categoryIcons = {
    text: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"],
    image: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$image$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Image$3e$__["Image"],
    audio: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mic$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Mic$3e$__["Mic"],
    video: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$video$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Video$3e$__["Video"]
};
const categoryLabels = {
    text: 'Текст',
    image: 'Картинки',
    audio: 'Аудио',
    video: 'Видео'
};
function AiModelsPage() {
    _s();
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [category, setCategory] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [isSyncing, setIsSyncing] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isBulkTesting, setIsBulkTesting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [isDisablingOffline, setIsDisablingOffline] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [testingId, setTestingId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [showRecommendations, setShowRecommendations] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const { data: models, error, mutate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(`/admin/ai-models?search=${search}&category=${category}`, fetcher);
    const handleSync = async ()=>{
        setIsSyncing(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/admin/ai-models/sync');
            mutate();
        } catch (err) {
            console.error('Failed to sync models', err);
        } finally{
            setIsSyncing(false);
        }
    };
    const handleBulkTest = async ()=>{
        setIsBulkTesting(true);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/admin/ai-models/bulk-test');
            mutate();
        } catch (err_0) {
            console.error('Failed to bulk test models', err_0);
        } finally{
            setIsBulkTesting(false);
        }
    };
    const handleDisableOffline = async ()=>{
        if (!confirm('Отключить все оффлайн модели?')) return;
        setIsDisablingOffline(true);
        try {
            const res = await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/admin/ai-models/disable-offline');
            alert(`Отключено моделей: ${res.data.disabled}`);
            mutate();
        } catch (err_1) {
            console.error('Failed to disable offline models', err_1);
        } finally{
            setIsDisablingOffline(false);
        }
    };
    const handleToggleEnabled = async (id, currentStatus)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/admin/ai-models/${id}`, {
                isEnabled: !currentStatus
            });
            mutate();
        } catch (err_2) {
            console.error('Failed to toggle model status', err_2);
        }
    };
    const handleToggleRecommended = async (id_0, currentStatus_0)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/admin/ai-models/${id_0}`, {
                isRecommended: !currentStatus_0
            });
            mutate();
        } catch (err_3) {
            console.error('Failed to toggle recommendation status', err_3);
        }
    };
    const handleToggleRagEnabled = async (id_1, currentStatus_1)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/admin/ai-models/${id_1}`, {
                isRagEnabled: !currentStatus_1
            });
            mutate();
        } catch (err_4) {
            console.error('Failed to toggle RAG status', err_4);
        }
    };
    const handleTestModel = async (id_2)=>{
        setTestingId(id_2);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`/admin/ai-models/${id_2}/test`);
            mutate();
        } catch (err_5) {
            console.error('Failed to test model', err_5);
        } finally{
            setTestingId(null);
        }
    };
    const handleDelete = async (id_3)=>{
        if (!confirm('Вы уверены, что хотите удалить эту модель из списка?')) return;
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/admin/ai-models/${id_3}`);
            mutate();
        } catch (err_6) {
            console.error('Failed to delete model', err_6);
        }
    };
    const handleMarkOld = async (id_4)=>{
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/admin/ai-models/${id_4}`, {
                isNew: false
            });
            mutate();
        } catch (err_7) {
            console.error('Failed to update model', err_7);
        }
    };
    // Get recommended models
    const recommendedModels = models?.filter((m)=>m.isRecommended) || [];
    // Get fast models (online and response time < 3s)
    const fastModels = models?.filter((m_0)=>m_0.lastTestStatus === 'online' && m_0.lastResponseTime > 0 && m_0.lastResponseTime < 3000).sort((a, b)=>a.lastResponseTime - b.lastResponseTime).slice(0, 5) || [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-bold tracking-tight",
                                children: "AI Models"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 138,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[var(--muted-foreground)] mt-1",
                                children: "Управление доступными ИИ моделями и мониторинг"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 139,
                                columnNumber: 21
                            }, this),
                            models && models.length > 0 && models[0].lastSyncDate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[10px] text-[var(--muted-foreground)] mt-1 font-mono",
                                children: [
                                    "Последняя синхронизация: ",
                                    new Date(models[0].lastSyncDate).toLocaleString()
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 140,
                                columnNumber: 79
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 137,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2 flex-wrap",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: ()=>setShowRecommendations(true),
                                className: "flex items-center gap-2 bg-amber-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-amber-500/20",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 146,
                                        columnNumber: 25
                                    }, this),
                                    "Рекомендации"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 145,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleDisableOffline,
                                disabled: isDisablingOffline,
                                className: "flex items-center gap-2 bg-red-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50",
                                children: [
                                    isDisablingOffline ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "w-4 h-4 animate-spin"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 150,
                                        columnNumber: 47
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 150,
                                        columnNumber: 94
                                    }, this),
                                    "Откл. оффлайн"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 149,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleBulkTest,
                                disabled: isBulkTesting,
                                className: "flex items-center gap-2 bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50",
                                children: [
                                    isBulkTesting ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "w-4 h-4 animate-spin"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 154,
                                        columnNumber: 42
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$test$2d$tube$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TestTube$3e$__["TestTube"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 154,
                                        columnNumber: 89
                                    }, this),
                                    "Массовый тест"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 153,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                onClick: handleSync,
                                disabled: isSyncing,
                                className: "flex items-center gap-2 bg-[var(--primary)] text-white px-4 py-2.5 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[var(--primary)]/20 disabled:opacity-50",
                                children: [
                                    isSyncing ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                        className: "w-4 h-4 animate-spin"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 158,
                                        columnNumber: 38
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$refresh$2d$cw$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__RefreshCw$3e$__["RefreshCw"], {
                                        className: "w-4 h-4"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 158,
                                        columnNumber: 85
                                    }, this),
                                    "Синхронизировать"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 157,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 144,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                lineNumber: 136,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: showRecommendations && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                    initial: {
                        opacity: 0
                    },
                    animate: {
                        opacity: 1
                    },
                    exit: {
                        opacity: 0
                    },
                    className: "fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4",
                    onClick: ()=>setShowRecommendations(false),
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            scale: 0.9,
                            opacity: 0
                        },
                        animate: {
                            scale: 1,
                            opacity: 1
                        },
                        exit: {
                            scale: 0.9,
                            opacity: 0
                        },
                        className: "bg-[var(--card)] rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl",
                        onClick: (e)=>e.stopPropagation(),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center justify-between mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$sparkles$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Sparkles$3e$__["Sparkles"], {
                                                    className: "w-6 h-6 text-amber-600"
                                                }, void 0, false, {
                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                    lineNumber: 186,
                                                    columnNumber: 41
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 185,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                        className: "text-xl font-bold",
                                                        children: "Рекомендации по моделям"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 189,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm text-[var(--muted-foreground)]",
                                                        children: "Выберите лучшие модели для ваших пользователей"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 190,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 188,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 184,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setShowRecommendations(false),
                                        className: "p-2 hover:bg-[var(--secondary)] rounded-xl transition-colors",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                            lineNumber: 194,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 193,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 183,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mb-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 201,
                                                columnNumber: 37
                                            }, this),
                                            "Самые быстрые модели"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 200,
                                        columnNumber: 33
                                    }, this),
                                    fastModels.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2",
                                        children: fastModels.map((model, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-lg font-bold text-emerald-600",
                                                                children: [
                                                                    "#",
                                                                    idx + 1
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 207,
                                                                columnNumber: 53
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold text-sm",
                                                                        children: model.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 209,
                                                                        columnNumber: 57
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-[10px] text-[var(--muted-foreground)] font-mono",
                                                                        children: model.provider
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 210,
                                                                        columnNumber: 57
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 208,
                                                                columnNumber: 53
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 206,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "text-right",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm font-bold text-emerald-600",
                                                                children: [
                                                                    (model.lastResponseTime / 1000).toFixed(2),
                                                                    "s"
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 214,
                                                                columnNumber: 53
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-[10px] text-[var(--muted-foreground)]",
                                                                children: categoryLabels[model.category]
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 215,
                                                                columnNumber: 53
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 213,
                                                        columnNumber: 49
                                                    }, this)
                                                ]
                                            }, model.ID, true, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 205,
                                                columnNumber: 86
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 204,
                                        columnNumber: 58
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-[var(--muted-foreground)] p-4 bg-[var(--secondary)] rounded-xl text-center",
                                        children: "Нет данных. Запустите массовый тест для получения рекомендаций."
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 218,
                                        columnNumber: 46
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 199,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                        className: "text-sm font-bold text-amber-600 uppercase tracking-wider mb-3 flex items-center gap-2",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 226,
                                                columnNumber: 37
                                            }, this),
                                            "Отмеченные как рекомендуемые (",
                                            recommendedModels.length,
                                            ")"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 225,
                                        columnNumber: 33
                                    }, this),
                                    recommendedModels.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2",
                                        children: recommendedModels.map((model_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/20",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-3",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                                                                className: "w-5 h-5 text-amber-500 fill-amber-500"
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 232,
                                                                columnNumber: 53
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold text-sm",
                                                                        children: model_0.name
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 234,
                                                                        columnNumber: 57
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-[10px] text-[var(--muted-foreground)] font-mono",
                                                                        children: model_0.provider
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 235,
                                                                        columnNumber: 57
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 233,
                                                                columnNumber: 53
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 231,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: `text-xs font-medium px-2 py-0.5 rounded-full ${model_0.isEnabled ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`,
                                                                children: model_0.isEnabled ? 'Активна' : 'Выкл'
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 53
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                onClick: ()=>handleToggleRecommended(model_0.ID, model_0.isRecommended),
                                                                className: "p-1.5 text-red-500 hover:bg-red-50 rounded-lg",
                                                                title: "Убрать из рекомендуемых",
                                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
                                                                    className: "w-4 h-4"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 243,
                                                                    columnNumber: 57
                                                                }, this)
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 242,
                                                                columnNumber: 53
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 238,
                                                        columnNumber: 49
                                                    }, this)
                                                ]
                                            }, model_0.ID, true, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 230,
                                                columnNumber: 82
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 229,
                                        columnNumber: 65
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm text-[var(--muted-foreground)] p-4 bg-[var(--secondary)] rounded-xl text-center",
                                        children: "Нет рекомендуемых моделей. Отметьте модели звёздочкой в таблице."
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 247,
                                        columnNumber: 46
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 224,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "mt-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm text-blue-700 dark:text-blue-300",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("strong", {
                                            children: "Совет:"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                            lineNumber: 254,
                                            columnNumber: 37
                                        }, this),
                                        " Рекомендуемые модели будут отображаться пользователям в первую очередь. Выбирайте модели с быстрым откликом и стабильной работой."
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 253,
                                    columnNumber: 33
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 252,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 173,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                    lineNumber: 166,
                    columnNumber: 41
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                lineNumber: 165,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 265,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Поиск по названию или ID...",
                                value: search,
                                onChange: (e_0)=>setSearch(e_0.target.value),
                                className: "w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                lineNumber: 266,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 264,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: category,
                            onChange: (e_1)=>setCategory(e_1.target.value),
                            className: "bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer min-w-[150px]",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "",
                                    children: "Все типы"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 270,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "text",
                                    children: "Текст"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 271,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "image",
                                    children: "Картинки"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 272,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "audio",
                                    children: "Аудио"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 273,
                                    columnNumber: 25
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "video",
                                    children: "Видео"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 274,
                                    columnNumber: 25
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                            lineNumber: 269,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 268,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                lineNumber: 263,
                columnNumber: 13
            }, this),
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "w-12 h-12 mb-4"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 280,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-semibold",
                        children: "Ошибка загрузки моделей"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 281,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>mutate(),
                        className: "mt-4 text-sm underline",
                        children: "Попробовать снова"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 282,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                lineNumber: 279,
                columnNumber: 22
            }, this) : !models ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center p-24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "w-8 h-8 animate-spin text-[var(--primary)]"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                    lineNumber: 284,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                lineNumber: 283,
                columnNumber: 36
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full text-left",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Модель"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 290,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Тип"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 291,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Статус"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 292,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Рек."
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 293,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "RAG"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 294,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Мониторинг"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 295,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold text-right",
                                                children: "Действия"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 296,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 289,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 288,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "divide-y divide-[var(--border)]",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                        children: models.map((model_1)=>{
                                            const Icon = categoryIcons[model_1.category] || __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$message$2d$square$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__MessageSquare$3e$__["MessageSquare"];
                                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].tr, {
                                                initial: {
                                                    opacity: 0
                                                },
                                                animate: {
                                                    opacity: 1
                                                },
                                                exit: {
                                                    opacity: 0
                                                },
                                                className: "hover:bg-[var(--secondary)]/50 transition-colors",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "relative",
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            className: "w-10 h-10 bg-[var(--secondary)] rounded-xl flex items-center justify-center text-[var(--primary)] border border-[var(--border)]",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(Icon, {
                                                                                className: "w-5 h-5"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                                lineNumber: 314,
                                                                                columnNumber: 65
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 313,
                                                                            columnNumber: 61
                                                                        }, this),
                                                                        model_1.isNew && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                            onClick: (e_2)=>{
                                                                                e_2.stopPropagation();
                                                                                handleMarkOld(model_1.ID);
                                                                            },
                                                                            className: "absolute -top-1 -right-1 bg-amber-500 text-white p-0.5 rounded-full border-2 border-[var(--card)] cursor-pointer hover:scale-110 transition-transform",
                                                                            title: "Новая модель! Нажмите, чтобы убрать пометку",
                                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$zap$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Zap$3e$__["Zap"], {
                                                                                className: "w-2.5 h-2.5 fill-current"
                                                                            }, void 0, false, {
                                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                                lineNumber: 320,
                                                                                columnNumber: 69
                                                                            }, this)
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 316,
                                                                            columnNumber: 79
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 312,
                                                                    columnNumber: 57
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "font-bold text-sm",
                                                                            children: model_1.name
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 324,
                                                                            columnNumber: 61
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-[10px] text-[var(--muted-foreground)] font-mono uppercase",
                                                                            children: model_1.provider
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 325,
                                                                            columnNumber: 61
                                                                        }, this),
                                                                        model_1.isNew && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-[9px] text-amber-600 font-bold uppercase tracking-tighter bg-amber-50 px-1 rounded",
                                                                            children: "New"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 326,
                                                                            columnNumber: 79
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 323,
                                                                    columnNumber: 57
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 311,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 310,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-xs font-medium px-2.5 py-1 bg-[var(--secondary)] rounded-full border border-[var(--border)]",
                                                            children: categoryLabels[model_1.category] || model_1.category
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 331,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 330,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>handleToggleEnabled(model_1.ID, model_1.isEnabled),
                                                                    className: `relative w-10 h-5 rounded-full transition-colors ${model_1.isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`,
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                        className: `absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${model_1.isEnabled ? 'right-1' : 'left-1'}`
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 338,
                                                                        columnNumber: 61
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 337,
                                                                    columnNumber: 57
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    className: `text-xs font-semibold ${model_1.isEnabled ? 'text-emerald-500' : 'text-[var(--muted-foreground)]'}`,
                                                                    children: model_1.isEnabled ? 'Активна' : 'Выкл'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 340,
                                                                    columnNumber: 57
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 336,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 335,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleToggleRecommended(model_1.ID, model_1.isRecommended),
                                                            className: `p-2 rounded-lg transition-all ${model_1.isRecommended ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:bg-gray-50'}`,
                                                            title: model_1.isRecommended ? 'Убрать из рекомендуемых' : 'Добавить в рекомендуемые',
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                                                                className: `w-5 h-5 ${model_1.isRecommended ? 'fill-amber-500' : ''}`
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 347,
                                                                columnNumber: 57
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 346,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 345,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleToggleRagEnabled(model_1.ID, model_1.isRagEnabled),
                                                            className: `p-2 rounded-lg transition-all ${model_1.isRagEnabled ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:bg-gray-50'}`,
                                                            title: model_1.isRagEnabled ? 'Отключить RAG' : 'Включить RAG',
                                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$database$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Database$3e$__["Database"], {
                                                                className: `w-5 h-5 ${model_1.isRagEnabled ? 'fill-blue-500' : ''}`
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                lineNumber: 352,
                                                                columnNumber: 57
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 351,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 350,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex flex-col gap-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "flex items-center gap-2",
                                                                    children: [
                                                                        model_1.lastTestStatus === 'online' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                                            className: "w-3.5 h-3.5 text-emerald-500"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 358,
                                                                            columnNumber: 100
                                                                        }, this) : model_1.lastTestStatus === 'offline' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
                                                                            className: "w-3.5 h-3.5 text-red-500"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 358,
                                                                            columnNumber: 199
                                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"], {
                                                                            className: "w-3.5 h-3.5 text-[var(--muted-foreground)]"
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 358,
                                                                            columnNumber: 250
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: "text-xs font-medium",
                                                                            children: model_1.lastTestStatus === 'online' ? 'Доступна' : model_1.lastTestStatus === 'offline' ? 'Оффлайн' : model_1.lastTestStatus === 'error' ? 'Ошибка' : 'Нет данных'
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 359,
                                                                            columnNumber: 61
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 357,
                                                                    columnNumber: 57
                                                                }, this),
                                                                model_1.lastResponseTime > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                    className: "text-[10px] text-[var(--muted-foreground)]",
                                                                    children: [
                                                                        "Задержка: ",
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                            className: model_1.lastResponseTime < 2000 ? 'text-emerald-500' : 'text-amber-500',
                                                                            children: [
                                                                                (model_1.lastResponseTime / 1000).toFixed(2),
                                                                                "s"
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                            lineNumber: 364,
                                                                            columnNumber: 75
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 363,
                                                                    columnNumber: 90
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 356,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 355,
                                                        columnNumber: 49
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 text-right",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center justify-end gap-2",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>handleTestModel(model_1.ID),
                                                                    disabled: testingId === model_1.ID,
                                                                    className: "p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-all",
                                                                    title: "Протестировать скорость",
                                                                    children: testingId === model_1.ID ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                                        className: "w-4 h-4 animate-spin"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 373,
                                                                        columnNumber: 89
                                                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$play$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Play$3e$__["Play"], {
                                                                        className: "w-4 h-4 fill-current"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 373,
                                                                        columnNumber: 136
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 372,
                                                                    columnNumber: 57
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                                    onClick: ()=>handleDelete(model_1.ID),
                                                                    className: "p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all",
                                                                    title: "Удалить из списка",
                                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                                        className: "w-4 h-4"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                        lineNumber: 376,
                                                                        columnNumber: 61
                                                                    }, this)
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                                    lineNumber: 375,
                                                                    columnNumber: 57
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                            lineNumber: 371,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                        lineNumber: 370,
                                                        columnNumber: 49
                                                    }, this)
                                                ]
                                            }, model_1.ID, true, {
                                                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                                lineNumber: 303,
                                                columnNumber: 24
                                            }, this);
                                        })
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                        lineNumber: 300,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/ai-models/page.tsx",
                                    lineNumber: 299,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/ai-models/page.tsx",
                            lineNumber: 287,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 286,
                        columnNumber: 21
                    }, this),
                    models.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-12 text-center text-[var(--muted-foreground)]",
                        children: "Модели не найдены. Попробуйте синхронизировать с API."
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/ai-models/page.tsx",
                        lineNumber: 386,
                        columnNumber: 45
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/ai-models/page.tsx",
                lineNumber: 285,
                columnNumber: 26
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/admin/src/app/ai-models/page.tsx",
        lineNumber: 135,
        columnNumber: 10
    }, this);
}
_s(AiModelsPage, "yMwonFE1gS1Os3LaOd5DQaRs3sc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"]
    ];
});
_c = AiModelsPage;
var _c;
__turbopack_context__.k.register(_c, "AiModelsPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=admin_src_b8d26814._.js.map