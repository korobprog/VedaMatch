(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/admin/src/lib/api.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/axios@1.13.2/node_modules/axios/lib/axios.js [app-client] (ecmascript)");
;
// Функция для определения baseURL
const getBaseURL = ()=>{
    // Если переменная окружения установлена, используем её
    if ("TURBOPACK compile-time truthy", 1) {
        return "TURBOPACK compile-time value", "http://localhost:8081/api";
    }
    //TURBOPACK unreachable
    ;
};
const api = __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: getBaseURL()
});
// Add a request interceptor to add the auth headers if needed
api.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time truthy", 1) {
        const adminData = localStorage.getItem('admin_data');
        if (adminData) {
            const parsed = JSON.parse(adminData);
            // GORM returns ID with capital letters, so check both
            const adminId = parsed.ID || parsed.id;
            if (adminId) {
                config.headers['X-Admin-ID'] = adminId;
            }
        }
    }
    return config;
});
const __TURBOPACK__default__export__ = api;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/admin/src/app/news/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>NewsPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/swr@2.3.8_react@19.0.0-rc.1/node_modules/swr/dist/index/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_reac_3dd7e88324880d54d5ee19f5b48be478/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_reac_3dd7e88324880d54d5ee19f5b48be478/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/plus.js [app-client] (ecmascript) <export default as Plus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-check-big.js [app-client] (ecmascript) <export default as CheckCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-x.js [app-client] (ecmascript) <export default as XCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/trash-2.js [app-client] (ecmascript) <export default as Trash2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit3$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/pen-line.js [app-client] (ecmascript) <export default as Edit3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-client] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$archive$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Archive$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/archive.js [app-client] (ecmascript) <export default as Archive>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/clock.js [app-client] (ecmascript) <export default as Clock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$newspaper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Newspaper$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/newspaper.js [app-client] (ecmascript) <export default as Newspaper>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/globe.js [app-client] (ecmascript) <export default as Globe>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/star.js [app-client] (ecmascript) <export default as Star>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/send.js [app-client] (ecmascript) <export default as Send>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as X>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rss$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Rss$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/rss.js [app-client] (ecmascript) <export default as Rss>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/link-2.js [app-client] (ecmascript) <export default as Link2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/src/lib/api.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
'use client';
;
;
;
;
;
;
const fetcher = (url)=>__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].get(url).then((res)=>res.data);
const statusColors = {
    draft: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    published: 'bg-green-100 text-green-800 border-green-200',
    archived: 'bg-gray-100 text-gray-800 border-gray-200',
    deleted: 'bg-red-100 text-red-800 border-red-200'
};
const statusIcons = {
    draft: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock$3e$__["Clock"], {
        className: "w-3 h-3"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 17,
        columnNumber: 10
    }, ("TURBOPACK compile-time value", void 0)),
    published: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2d$big$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle$3e$__["CheckCircle"], {
        className: "w-3 h-3"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 18,
        columnNumber: 14
    }, ("TURBOPACK compile-time value", void 0)),
    archived: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$archive$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Archive$3e$__["Archive"], {
        className: "w-3 h-3"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 19,
        columnNumber: 13
    }, ("TURBOPACK compile-time value", void 0)),
    deleted: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XCircle$3e$__["XCircle"], {
        className: "w-3 h-3"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 20,
        columnNumber: 12
    }, ("TURBOPACK compile-time value", void 0))
};
const sourceTypeIcons = {
    rss: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$rss$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Rss$3e$__["Rss"], {
        className: "w-4 h-4"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 23,
        columnNumber: 8
    }, ("TURBOPACK compile-time value", void 0)),
    url: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$link$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Link2$3e$__["Link2"], {
        className: "w-4 h-4"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 24,
        columnNumber: 8
    }, ("TURBOPACK compile-time value", void 0)),
    vk: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
        className: "w-4 h-4"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 25,
        columnNumber: 7
    }, ("TURBOPACK compile-time value", void 0)),
    telegram: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
        className: "w-4 h-4"
    }, void 0, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 26,
        columnNumber: 13
    }, ("TURBOPACK compile-time value", void 0))
};
const MADH_OPTIONS = [
    {
        id: 'iskcon',
        label: 'ISKCON'
    },
    {
        id: 'gaudiya',
        label: 'Gaudiya Math'
    },
    {
        id: 'srivaishnava',
        label: 'Sri Vaishnava'
    },
    {
        id: 'vedic',
        label: 'Vedic'
    },
    {
        id: 'bvs-source',
        label: 'BVS Source'
    }
];
const YOGA_OPTIONS = [
    {
        id: 'bhakti',
        label: 'Bhakti Yoga'
    },
    {
        id: 'hatha',
        label: 'Hatha Yoga'
    },
    {
        id: 'kundalini',
        label: 'Kundalini'
    },
    {
        id: 'meditation',
        label: 'Meditation'
    },
    {
        id: 'kirtan',
        label: 'Kirtan'
    }
];
const IDENTITY_OPTIONS = [
    {
        id: 'brahmana',
        label: 'Brahmana'
    },
    {
        id: 'vaishya',
        label: 'Vaishya'
    },
    {
        id: 'seeker',
        label: 'Seeker'
    },
    {
        id: 'teacher',
        label: 'Teacher'
    },
    {
        id: 'mentor',
        label: 'Mentor'
    },
    {
        id: 'leader',
        label: 'Leader'
    }
];
function NewsPage() {
    _s();
    const [activeTab, setActiveTab] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('news');
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])('');
    const [actionLoading, setActionLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    // Modals
    const [newsModal, setNewsModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        open: false,
        news: null
    });
    const [sourceModal, setSourceModal] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({
        open: false,
        source: null
    });
    // News data
    const { data: newsData, error: newsError, mutate: mutateNews } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(`/admin/news?search=${search}&status=${status}`, fetcher);
    // Sources data
    const { data: sourcesData, error: sourcesError, mutate: mutateSources } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])('/admin/news/sources', fetcher);
    // Stats
    const { data: stats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])('/admin/news/stats', fetcher);
    const news = newsData?.news || [];
    const sources = sourcesData?.sources || [];
    // ========== NEWS ACTIONS ==========
    const handlePublish = async (id)=>{
        setActionLoading(id.toString());
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`/admin/news/${id}/publish`);
            mutateNews();
        } catch (err) {
            console.error('Failed to publish', err);
        } finally{
            setActionLoading(null);
        }
    };
    const handleDeleteNews = async (id_0)=>{
        if (!confirm('Вы уверены, что хотите удалить эту новость?')) return;
        setActionLoading(id_0.toString());
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/admin/news/${id_0}`);
            mutateNews();
        } catch (err_0) {
            console.error('Failed to delete', err_0);
        } finally{
            setActionLoading(null);
        }
    };
    const handleSaveNews = async (newsItem)=>{
        setActionLoading('save');
        try {
            if (newsModal.news?.ID) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/admin/news/${newsModal.news.ID}`, newsItem);
            } else {
                await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/admin/news', newsItem);
            }
            mutateNews();
            setNewsModal({
                open: false,
                news: null
            });
        } catch (err_1) {
            console.error('Failed to save news', err_1);
        } finally{
            setActionLoading(null);
        }
    };
    // ========== SOURCE ACTIONS ==========
    const handleToggleSource = async (id_1)=>{
        setActionLoading(`source-${id_1}`);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post(`/admin/news/sources/${id_1}/toggle`);
            mutateSources();
        } catch (err_2) {
            console.error('Failed to toggle source', err_2);
        } finally{
            setActionLoading(null);
        }
    };
    const handleDeleteSource = async (id_2)=>{
        if (!confirm('Вы уверены, что хотите удалить этот источник?')) return;
        setActionLoading(`source-${id_2}`);
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].delete(`/admin/news/sources/${id_2}`);
            mutateSources();
        } catch (err_3) {
            console.error('Failed to delete source', err_3);
        } finally{
            setActionLoading(null);
        }
    };
    const handleSaveSource = async (source)=>{
        setActionLoading('save');
        try {
            if (sourceModal.source?.ID) {
                await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].put(`/admin/news/sources/${sourceModal.source.ID}`, source);
            } else {
                await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"].post('/admin/news/sources', source);
            }
            mutateSources();
            setSourceModal({
                open: false,
                source: null
            });
        } catch (err_4) {
            console.error('Failed to save source', err_4);
        } finally{
            setActionLoading(null);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-bold tracking-tight flex items-center gap-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$newspaper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Newspaper$3e$__["Newspaper"], {
                                        className: "w-8 h-8 text-[var(--primary)]"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 259,
                                        columnNumber: 25
                                    }, this),
                                    "News Management"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 258,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[var(--muted-foreground)] mt-1",
                                children: "Manage news articles and content sources"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 262,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 257,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: activeTab === 'news' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setNewsModal({
                                    open: true,
                                    news: null
                                }),
                            className: "flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 269,
                                    columnNumber: 29
                                }, this),
                                "Add News"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 265,
                            columnNumber: 45
                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            onClick: ()=>setSourceModal({
                                    open: true,
                                    source: null
                                }),
                            className: "flex items-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-all font-medium",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Plus$3e$__["Plus"], {
                                    className: "w-4 h-4"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 275,
                                    columnNumber: 29
                                }, this),
                                "Add Source"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 271,
                            columnNumber: 37
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 264,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 256,
                columnNumber: 13
            }, this),
            stats && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-2 md:grid-cols-5 gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-2xl font-bold",
                                children: stats.totalNews || 0
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 284,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-[var(--muted-foreground)]",
                                children: "Total News"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 285,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 283,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl border border-green-200 dark:border-green-800",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-2xl font-bold text-green-600",
                                children: stats.publishedNews || 0
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 288,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-green-600",
                                children: "Published"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 289,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 287,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-2xl border border-yellow-200 dark:border-yellow-800",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-2xl font-bold text-yellow-600",
                                children: stats.draftNews || 0
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 292,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-yellow-600",
                                children: "Drafts"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 293,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 291,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-2xl font-bold",
                                children: stats.totalSources || 0
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 296,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-[var(--muted-foreground)]",
                                children: "Sources"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 297,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 295,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-800",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-2xl font-bold text-blue-600",
                                children: stats.activeSources || 0
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 300,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-blue-600",
                                children: "Active Sources"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 301,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 299,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 282,
                columnNumber: 23
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex gap-2 border-b border-[var(--border)]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveTab('news'),
                        className: `px-4 py-3 font-medium border-b-2 transition-all ${activeTab === 'news' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`,
                        children: "News Articles"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 307,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>setActiveTab('sources'),
                        className: `px-4 py-3 font-medium border-b-2 transition-all ${activeTab === 'sources' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`,
                        children: "Content Sources"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 310,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 306,
                columnNumber: 13
            }, this),
            activeTab === 'news' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 318,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Search by title...",
                                value: search,
                                onChange: (e)=>setSearch(e.target.value),
                                className: "w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 319,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 317,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                        value: status,
                        onChange: (e_0)=>setStatus(e_0.target.value),
                        className: "bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "",
                                children: "All Status"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 322,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "draft",
                                children: "Draft"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 323,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "published",
                                children: "Published"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 324,
                                columnNumber: 25
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                value: "archived",
                                children: "Archived"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 325,
                                columnNumber: 25
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 321,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 316,
                columnNumber: 38
            }, this),
            activeTab === 'news' ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NewsTable, {
                news: news,
                loading: !newsData && !newsError,
                error: newsError,
                actionLoading: actionLoading,
                onEdit: (n)=>setNewsModal({
                        open: true,
                        news: n
                    }),
                onPublish: handlePublish,
                onDelete: handleDeleteNews,
                onRetry: mutateNews
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 330,
                columnNumber: 37
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SourcesTable, {
                sources: sources,
                loading: !sourcesData && !sourcesError,
                error: sourcesError,
                actionLoading: actionLoading,
                onEdit: (s)=>setSourceModal({
                        open: true,
                        source: s
                    }),
                onToggle: handleToggleSource,
                onDelete: handleDeleteSource,
                onRetry: mutateSources
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 333,
                columnNumber: 89
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: newsModal.open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(NewsModal, {
                    news: newsModal.news,
                    sources: sources,
                    loading: actionLoading === 'save',
                    onClose: ()=>setNewsModal({
                            open: false,
                            news: null
                        }),
                    onSave: handleSaveNews
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 340,
                    columnNumber: 36
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 339,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: sourceModal.open && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SourceModal, {
                    source: sourceModal.source,
                    loading: actionLoading === 'save',
                    onClose: ()=>setSourceModal({
                            open: false,
                            source: null
                        }),
                    onSave: handleSaveSource
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 348,
                    columnNumber: 38
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 347,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 254,
        columnNumber: 10
    }, this);
}
_s(NewsPage, "nSvmaf3+dNFqI+iPg7mT+FoRAuM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"],
        __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"]
    ];
});
_c = NewsPage;
// ========== NewsTable Component ==========
function NewsTable(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(25);
    if ($[0] !== "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61") {
        for(let $i = 0; $i < 25; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61";
    }
    const { news, loading, error, actionLoading, onEdit, onPublish, onDelete, onRetry } = t0;
    if (error) {
        let t1;
        let t2;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                className: "w-12 h-12 mb-4"
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 379,
                columnNumber: 12
            }, this);
            t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-semibold",
                children: "Failed to load news"
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 380,
                columnNumber: 12
            }, this);
            $[1] = t1;
            $[2] = t2;
        } else {
            t1 = $[1];
            t2 = $[2];
        }
        let t3;
        if ($[3] !== onRetry) {
            t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500",
                children: [
                    t1,
                    t2,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onRetry,
                        className: "mt-4 text-sm underline",
                        children: "Try again"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 389,
                        columnNumber: 183
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 389,
                columnNumber: 12
            }, this);
            $[3] = onRetry;
            $[4] = t3;
        } else {
            t3 = $[4];
        }
        return t3;
    }
    if (loading) {
        let t1;
        if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center p-24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "w-8 h-8 animate-spin text-[var(--primary)]"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 400,
                    columnNumber: 67
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 400,
                columnNumber: 12
            }, this);
            $[5] = t1;
        } else {
            t1 = $[5];
        }
        return t1;
    }
    let t1;
    if ($[6] === Symbol.for("react.memo_cache_sentinel")) {
        t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                className: "border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 font-semibold",
                        children: "News"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 409,
                        columnNumber: 129
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 font-semibold",
                        children: "Source"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 409,
                        columnNumber: 178
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 font-semibold",
                        children: "Category"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 409,
                        columnNumber: 229
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 font-semibold",
                        children: "Status"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 409,
                        columnNumber: 282
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 font-semibold",
                        children: "Views"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 409,
                        columnNumber: 333
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                        className: "px-6 py-4 font-semibold text-right",
                        children: "Actions"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 409,
                        columnNumber: 383
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 409,
                columnNumber: 17
            }, this)
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 409,
            columnNumber: 10
        }, this);
        $[6] = t1;
    } else {
        t1 = $[6];
    }
    let t2;
    if ($[7] !== actionLoading || $[8] !== news || $[9] !== onDelete || $[10] !== onEdit || $[11] !== onPublish) {
        let t3;
        if ($[13] !== actionLoading || $[14] !== onDelete || $[15] !== onEdit || $[16] !== onPublish) {
            t3 = ({
                "NewsTable[news.map()]": (item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].tr, {
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
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-6 py-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center gap-3",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-12 h-12 bg-[var(--secondary)] rounded-xl flex items-center justify-center overflow-hidden border border-[var(--border)]",
                                            children: item.imageUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: item.imageUrl,
                                                alt: "",
                                                className: "w-full h-full object-cover"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 425,
                                                columnNumber: 296
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$newspaper$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Newspaper$3e$__["Newspaper"], {
                                                className: "w-5 h-5 text-[var(--muted-foreground)]"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 425,
                                                columnNumber: 372
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                            lineNumber: 425,
                                            columnNumber: 140
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "max-w-[300px]",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "font-semibold text-sm line-clamp-1 flex items-center gap-2",
                                                    children: [
                                                        item.titleRu,
                                                        item.isImportant && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                                                            className: "w-3 h-3 text-yellow-500 fill-yellow-500"
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                                            lineNumber: 425,
                                                            columnNumber: 583
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                                    lineNumber: 425,
                                                    columnNumber: 474
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "text-xs text-[var(--muted-foreground)] line-clamp-1",
                                                    children: item.summaryRu || "No summary"
                                                }, void 0, false, {
                                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                                    lineNumber: 425,
                                                    columnNumber: 648
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                            lineNumber: 425,
                                            columnNumber: 443
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 425,
                                    columnNumber: 99
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 425,
                                columnNumber: 73
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-6 py-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "text-sm",
                                    children: item.Source?.name || "Manual"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 425,
                                    columnNumber: 794
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 425,
                                columnNumber: 768
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-6 py-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: "text-xs font-medium bg-[var(--secondary)] px-2 py-1 rounded-lg",
                                    children: item.category || "Uncategorized"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 425,
                                    columnNumber: 883
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 425,
                                columnNumber: 857
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-6 py-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                    className: `flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border ${statusColors[item.status] || ""}`,
                                    children: [
                                        statusIcons[item.status],
                                        item.status
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 425,
                                    columnNumber: 1036
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 425,
                                columnNumber: 1010
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-6 py-4 text-sm text-[var(--muted-foreground)]",
                                children: item.viewsCount
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 425,
                                columnNumber: 1220
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                className: "px-6 py-4",
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                    className: "flex items-center justify-end gap-2",
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "NewsTable[news.map() > <button>.onClick]": ()=>onEdit(item)
                                            }["NewsTable[news.map() > <button>.onClick]"],
                                            className: "p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-all",
                                            title: "Edit",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$pen$2d$line$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Edit3$3e$__["Edit3"], {
                                                className: "w-5 h-5"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 427,
                                                columnNumber: 148
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                            lineNumber: 425,
                                            columnNumber: 1386
                                        }, this),
                                        item.status === "draft" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "NewsTable[news.map() > <button>.onClick]": ()=>onPublish(item.ID)
                                            }["NewsTable[news.map() > <button>.onClick]"],
                                            disabled: actionLoading === item.ID.toString(),
                                            className: "p-2 rounded-lg text-green-600 hover:bg-green-50 transition-all disabled:opacity-30",
                                            title: "Publish",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$send$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Send$3e$__["Send"], {
                                                className: "w-5 h-5"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 429,
                                                columnNumber: 221
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                            lineNumber: 427,
                                            columnNumber: 214
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: {
                                                "NewsTable[news.map() > <button>.onClick]": ()=>onDelete(item.ID)
                                            }["NewsTable[news.map() > <button>.onClick]"],
                                            disabled: actionLoading === item.ID.toString(),
                                            className: "p-2 rounded-lg text-red-500 hover:bg-red-50 transition-all disabled:opacity-30",
                                            title: "Delete",
                                            children: actionLoading === item.ID.toString() ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                className: "w-5 h-5 animate-spin"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 431,
                                                columnNumber: 256
                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                                className: "w-5 h-5"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 431,
                                                columnNumber: 303
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                            lineNumber: 429,
                                            columnNumber: 259
                                        }, this)
                                    ]
                                }, void 0, true, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 425,
                                    columnNumber: 1333
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 425,
                                columnNumber: 1307
                            }, this)
                        ]
                    }, item.ID, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 419,
                        columnNumber: 42
                    }, this)
            })["NewsTable[news.map()]"];
            $[13] = actionLoading;
            $[14] = onDelete;
            $[15] = onEdit;
            $[16] = onPublish;
            $[17] = t3;
        } else {
            t3 = $[17];
        }
        t2 = news.map(t3);
        $[7] = actionLoading;
        $[8] = news;
        $[9] = onDelete;
        $[10] = onEdit;
        $[11] = onPublish;
        $[12] = t2;
    } else {
        t2 = $[12];
    }
    let t3;
    if ($[18] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "overflow-x-auto",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                className: "w-full text-left",
                children: [
                    t1,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                        className: "divide-y divide-[var(--border)]",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                            children: t2
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 453,
                            columnNumber: 134
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 453,
                        columnNumber: 83
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 453,
                columnNumber: 43
            }, this)
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 453,
            columnNumber: 10
        }, this);
        $[18] = t2;
        $[19] = t3;
    } else {
        t3 = $[19];
    }
    let t4;
    if ($[20] !== news.length) {
        t4 = news.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "p-12 text-center text-[var(--muted-foreground)]",
            children: 'No news found. Click "Add News" to create your first article.'
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 461,
            columnNumber: 31
        }, this);
        $[20] = news.length;
        $[21] = t4;
    } else {
        t4 = $[21];
    }
    let t5;
    if ($[22] !== t3 || $[23] !== t4) {
        t5 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm",
            children: [
                t3,
                t4
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 469,
            columnNumber: 10
        }, this);
        $[22] = t3;
        $[23] = t4;
        $[24] = t5;
    } else {
        t5 = $[24];
    }
    return t5;
}
_c1 = NewsTable;
// ========== SourcesTable Component ==========
function SourcesTable(t0) {
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(22);
    if ($[0] !== "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61") {
        for(let $i = 0; $i < 22; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61";
    }
    const { sources, loading, error, actionLoading, onEdit, onToggle, onDelete, onRetry } = t0;
    if (error) {
        let t1;
        let t2;
        if ($[1] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                className: "w-12 h-12 mb-4"
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 502,
                columnNumber: 12
            }, this);
            t2 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-semibold",
                children: "Failed to load sources"
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 503,
                columnNumber: 12
            }, this);
            $[1] = t1;
            $[2] = t2;
        } else {
            t1 = $[1];
            t2 = $[2];
        }
        let t3;
        if ($[3] !== onRetry) {
            t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500",
                children: [
                    t1,
                    t2,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: onRetry,
                        className: "mt-4 text-sm underline",
                        children: "Try again"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 512,
                        columnNumber: 183
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 512,
                columnNumber: 12
            }, this);
            $[3] = onRetry;
            $[4] = t3;
        } else {
            t3 = $[4];
        }
        return t3;
    }
    if (loading) {
        let t1;
        if ($[5] === Symbol.for("react.memo_cache_sentinel")) {
            t1 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center p-24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "w-8 h-8 animate-spin text-[var(--primary)]"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 523,
                    columnNumber: 67
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 523,
                columnNumber: 12
            }, this);
            $[5] = t1;
        } else {
            t1 = $[5];
        }
        return t1;
    }
    let t1;
    if ($[6] !== actionLoading || $[7] !== onDelete || $[8] !== onEdit || $[9] !== onToggle || $[10] !== sources) {
        let t2;
        if ($[12] !== actionLoading || $[13] !== onDelete || $[14] !== onEdit || $[15] !== onToggle) {
            t2 = ({
                "SourcesTable[sources.map()]": (source)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
                        initial: {
                            opacity: 0,
                            y: 10
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        className: "bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-lg transition-all",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start justify-between mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: `w-10 h-10 rounded-xl flex items-center justify-center ${source.isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"}`,
                                                children: sourceTypeIcons[source.sourceType] || /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$globe$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Globe$3e$__["Globe"], {
                                                    className: "w-5 h-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                                    lineNumber: 541,
                                                    columnNumber: 407
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 541,
                                                columnNumber: 214
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "font-semibold text-sm",
                                                        children: source.name
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                                        lineNumber: 541,
                                                        columnNumber: 448
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-[var(--muted-foreground)] uppercase",
                                                        children: source.sourceType
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                                        lineNumber: 541,
                                                        columnNumber: 504
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/news/page.tsx",
                                                lineNumber: 541,
                                                columnNumber: 443
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 541,
                                        columnNumber: 173
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: {
                                            "SourcesTable[sources.map() > <button>.onClick]": ()=>onToggle(source.ID)
                                        }["SourcesTable[sources.map() > <button>.onClick]"],
                                        disabled: actionLoading === `source-${source.ID}`,
                                        className: `px-3 py-1 rounded-full text-xs font-medium transition-all ${source.isActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`,
                                        children: source.isActive ? "Active" : "Paused"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 541,
                                        columnNumber: 603
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 541,
                                columnNumber: 118
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-sm text-[var(--muted-foreground)] line-clamp-2 mb-4",
                                children: source.description || "No description"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 543,
                                columnNumber: 361
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 text-xs text-[var(--muted-foreground)] mb-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "bg-[var(--secondary)] px-2 py-1 rounded",
                                        children: [
                                            "Mode: ",
                                            source.mode
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 543,
                                        columnNumber: 562
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "bg-[var(--secondary)] px-2 py-1 rounded",
                                        children: [
                                            "Every ",
                                            Math.round(source.fetchInterval / 60),
                                            "min"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 543,
                                        columnNumber: 646
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 543,
                                columnNumber: 477
                            }, this),
                            source.lastError && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "bg-red-50 text-red-600 text-xs p-2 rounded-lg mb-4 line-clamp-2",
                                children: [
                                    "⚠️ ",
                                    source.lastError
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 543,
                                columnNumber: 786
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex gap-2",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: {
                                            "SourcesTable[sources.map() > <button>.onClick]": ()=>onEdit(source)
                                        }["SourcesTable[sources.map() > <button>.onClick]"],
                                        className: "flex-1 py-2 text-sm font-medium bg-[var(--secondary)] rounded-xl hover:bg-[var(--primary)] hover:text-white transition-all",
                                        children: "Edit"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 543,
                                        columnNumber: 923
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: {
                                            "SourcesTable[sources.map() > <button>.onClick]": ()=>onDelete(source.ID)
                                        }["SourcesTable[sources.map() > <button>.onClick]"],
                                        disabled: actionLoading === `source-${source.ID}`,
                                        className: "p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trash$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Trash2$3e$__["Trash2"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/news/page.tsx",
                                            lineNumber: 547,
                                            columnNumber: 188
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/news/page.tsx",
                                        lineNumber: 545,
                                        columnNumber: 214
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/news/page.tsx",
                                lineNumber: 543,
                                columnNumber: 895
                            }, this)
                        ]
                    }, source.ID, true, {
                        fileName: "[project]/admin/src/app/news/page.tsx",
                        lineNumber: 535,
                        columnNumber: 50
                    }, this)
            })["SourcesTable[sources.map()]"];
            $[12] = actionLoading;
            $[13] = onDelete;
            $[14] = onEdit;
            $[15] = onToggle;
            $[16] = t2;
        } else {
            t2 = $[16];
        }
        t1 = sources.map(t2);
        $[6] = actionLoading;
        $[7] = onDelete;
        $[8] = onEdit;
        $[9] = onToggle;
        $[10] = sources;
        $[11] = t1;
    } else {
        t1 = $[11];
    }
    let t2;
    if ($[17] !== sources.length) {
        t2 = sources.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "col-span-full p-12 text-center text-[var(--muted-foreground)] bg-[var(--card)] rounded-2xl border border-[var(--border)]",
            children: 'No sources configured. Click "Add Source" to add RSS, VK, or Telegram sources.'
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 569,
            columnNumber: 34
        }, this);
        $[17] = sources.length;
        $[18] = t2;
    } else {
        t2 = $[18];
    }
    let t3;
    if ($[19] !== t1 || $[20] !== t2) {
        t3 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4",
            children: [
                t1,
                t2
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 577,
            columnNumber: 10
        }, this);
        $[19] = t1;
        $[20] = t2;
        $[21] = t3;
    } else {
        t3 = $[21];
    }
    return t3;
}
_c2 = SourcesTable;
// ========== NewsModal Component ==========
function NewsModal(t0) {
    _s1();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(156);
    if ($[0] !== "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61") {
        for(let $i = 0; $i < 156; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61";
    }
    const { news, sources, loading, onClose, onSave } = t0;
    const t1 = news?.titleRu || "";
    const t2 = news?.titleEn || "";
    const t3 = news?.summaryRu || "";
    const t4 = news?.summaryEn || "";
    const t5 = news?.contentRu || "";
    const t6 = news?.contentEn || "";
    const t7 = news?.imageUrl || "";
    const t8 = news?.tags || "";
    const t9 = news?.category || "";
    const t10 = news?.status || "draft";
    const t11 = news?.isImportant || false;
    const t12 = news?.sourceId || undefined;
    let t13;
    if ($[1] !== t1 || $[2] !== t10 || $[3] !== t11 || $[4] !== t12 || $[5] !== t2 || $[6] !== t3 || $[7] !== t4 || $[8] !== t5 || $[9] !== t6 || $[10] !== t7 || $[11] !== t8 || $[12] !== t9) {
        t13 = {
            titleRu: t1,
            titleEn: t2,
            summaryRu: t3,
            summaryEn: t4,
            contentRu: t5,
            contentEn: t6,
            imageUrl: t7,
            tags: t8,
            category: t9,
            status: t10,
            isImportant: t11,
            sourceId: t12
        };
        $[1] = t1;
        $[2] = t10;
        $[3] = t11;
        $[4] = t12;
        $[5] = t2;
        $[6] = t3;
        $[7] = t4;
        $[8] = t5;
        $[9] = t6;
        $[10] = t7;
        $[11] = t8;
        $[12] = t9;
        $[13] = t13;
    } else {
        t13 = $[13];
    }
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t13);
    let t14;
    if ($[14] !== formData || $[15] !== onSave) {
        t14 = ({
            "NewsModal[handleSubmit]": (e)=>{
                e.preventDefault();
                onSave(formData);
            }
        })["NewsModal[handleSubmit]"];
        $[14] = formData;
        $[15] = onSave;
        $[16] = t14;
    } else {
        t14 = $[16];
    }
    const handleSubmit = t14;
    let t15;
    let t16;
    let t17;
    if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = {
            opacity: 0
        };
        t16 = {
            opacity: 1
        };
        t17 = {
            opacity: 0
        };
        $[17] = t15;
        $[18] = t16;
        $[19] = t17;
    } else {
        t15 = $[17];
        t16 = $[18];
        t17 = $[19];
    }
    let t18;
    if ($[20] !== onClose) {
        t18 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: t15,
            animate: t16,
            exit: t17,
            onClick: onClose,
            className: "fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 686,
            columnNumber: 11
        }, this);
        $[20] = onClose;
        $[21] = t18;
    } else {
        t18 = $[21];
    }
    let t19;
    let t20;
    let t21;
    if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = {
            opacity: 0,
            scale: 0.95
        };
        t20 = {
            opacity: 1,
            scale: 1
        };
        t21 = {
            opacity: 0,
            scale: 0.95
        };
        $[22] = t19;
        $[23] = t20;
        $[24] = t21;
    } else {
        t19 = $[22];
        t20 = $[23];
        t21 = $[24];
    }
    const t22 = news ? "Edit News" : "Create News";
    let t23;
    if ($[25] !== t22) {
        t23 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            className: "text-lg font-bold",
            children: t22
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 719,
            columnNumber: 11
        }, this);
        $[25] = t22;
        $[26] = t23;
    } else {
        t23 = $[26];
    }
    let t24;
    if ($[27] === Symbol.for("react.memo_cache_sentinel")) {
        t24 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
            className: "w-5 h-5"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 727,
            columnNumber: 11
        }, this);
        $[27] = t24;
    } else {
        t24 = $[27];
    }
    let t25;
    if ($[28] !== onClose) {
        t25 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: onClose,
            className: "p-2 hover:bg-[var(--secondary)] rounded-lg",
            children: t24
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 734,
            columnNumber: 11
        }, this);
        $[28] = onClose;
        $[29] = t25;
    } else {
        t25 = $[29];
    }
    let t26;
    if ($[30] !== t23 || $[31] !== t25) {
        t26 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-4 flex items-center justify-between",
            children: [
                t23,
                t25
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 742,
            columnNumber: 11
        }, this);
        $[30] = t23;
        $[31] = t25;
        $[32] = t26;
    } else {
        t26 = $[32];
    }
    let t27;
    if ($[33] === Symbol.for("react.memo_cache_sentinel")) {
        t27 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Title (Russian) *"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 751,
            columnNumber: 11
        }, this);
        $[33] = t27;
    } else {
        t27 = $[33];
    }
    let t28;
    if ($[34] !== formData) {
        t28 = ({
            "NewsModal[<input>.onChange]": (e_0)=>setFormData({
                    ...formData,
                    titleRu: e_0.target.value
                })
        })["NewsModal[<input>.onChange]"];
        $[34] = formData;
        $[35] = t28;
    } else {
        t28 = $[35];
    }
    let t29;
    if ($[36] !== formData.titleRu || $[37] !== t28) {
        t29 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t27,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.titleRu,
                    onChange: t28,
                    required: true,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "\u0417\u0430\u0433\u043E\u043B\u043E\u0432\u043E\u043A \u043D\u043E\u0432\u043E\u0441\u0442\u0438"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 771,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 771,
            columnNumber: 11
        }, this);
        $[36] = formData.titleRu;
        $[37] = t28;
        $[38] = t29;
    } else {
        t29 = $[38];
    }
    let t30;
    if ($[39] === Symbol.for("react.memo_cache_sentinel")) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Title (English)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 780,
            columnNumber: 11
        }, this);
        $[39] = t30;
    } else {
        t30 = $[39];
    }
    let t31;
    if ($[40] !== formData) {
        t31 = ({
            "NewsModal[<input>.onChange]": (e_1)=>setFormData({
                    ...formData,
                    titleEn: e_1.target.value
                })
        })["NewsModal[<input>.onChange]"];
        $[40] = formData;
        $[41] = t31;
    } else {
        t31 = $[41];
    }
    let t32;
    if ($[42] !== formData.titleEn || $[43] !== t31) {
        t32 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t30,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.titleEn,
                    onChange: t31,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "News title"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 800,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 800,
            columnNumber: 11
        }, this);
        $[42] = formData.titleEn;
        $[43] = t31;
        $[44] = t32;
    } else {
        t32 = $[44];
    }
    let t33;
    if ($[45] !== t29 || $[46] !== t32) {
        t33 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: [
                t29,
                t32
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 809,
            columnNumber: 11
        }, this);
        $[45] = t29;
        $[46] = t32;
        $[47] = t33;
    } else {
        t33 = $[47];
    }
    let t34;
    if ($[48] === Symbol.for("react.memo_cache_sentinel")) {
        t34 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Summary (Russian)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 818,
            columnNumber: 11
        }, this);
        $[48] = t34;
    } else {
        t34 = $[48];
    }
    let t35;
    if ($[49] !== formData) {
        t35 = ({
            "NewsModal[<textarea>.onChange]": (e_2)=>setFormData({
                    ...formData,
                    summaryRu: e_2.target.value
                })
        })["NewsModal[<textarea>.onChange]"];
        $[49] = formData;
        $[50] = t35;
    } else {
        t35 = $[50];
    }
    let t36;
    if ($[51] !== formData.summaryRu || $[52] !== t35) {
        t36 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t34,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    value: formData.summaryRu,
                    onChange: t35,
                    rows: 2,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "\u041A\u0440\u0430\u0442\u043A\u043E\u0435 \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 838,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 838,
            columnNumber: 11
        }, this);
        $[51] = formData.summaryRu;
        $[52] = t35;
        $[53] = t36;
    } else {
        t36 = $[53];
    }
    let t37;
    if ($[54] === Symbol.for("react.memo_cache_sentinel")) {
        t37 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Summary (English)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 847,
            columnNumber: 11
        }, this);
        $[54] = t37;
    } else {
        t37 = $[54];
    }
    let t38;
    if ($[55] !== formData) {
        t38 = ({
            "NewsModal[<textarea>.onChange]": (e_3)=>setFormData({
                    ...formData,
                    summaryEn: e_3.target.value
                })
        })["NewsModal[<textarea>.onChange]"];
        $[55] = formData;
        $[56] = t38;
    } else {
        t38 = $[56];
    }
    let t39;
    if ($[57] !== formData.summaryEn || $[58] !== t38) {
        t39 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t37,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    value: formData.summaryEn,
                    onChange: t38,
                    rows: 2,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "Short description"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 867,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 867,
            columnNumber: 11
        }, this);
        $[57] = formData.summaryEn;
        $[58] = t38;
        $[59] = t39;
    } else {
        t39 = $[59];
    }
    let t40;
    if ($[60] !== t36 || $[61] !== t39) {
        t40 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: [
                t36,
                t39
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 876,
            columnNumber: 11
        }, this);
        $[60] = t36;
        $[61] = t39;
        $[62] = t40;
    } else {
        t40 = $[62];
    }
    let t41;
    if ($[63] === Symbol.for("react.memo_cache_sentinel")) {
        t41 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Content (Russian) *"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 885,
            columnNumber: 11
        }, this);
        $[63] = t41;
    } else {
        t41 = $[63];
    }
    let t42;
    if ($[64] !== formData) {
        t42 = ({
            "NewsModal[<textarea>.onChange]": (e_4)=>setFormData({
                    ...formData,
                    contentRu: e_4.target.value
                })
        })["NewsModal[<textarea>.onChange]"];
        $[64] = formData;
        $[65] = t42;
    } else {
        t42 = $[65];
    }
    let t43;
    if ($[66] !== formData.contentRu || $[67] !== t42) {
        t43 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t41,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    value: formData.contentRu,
                    onChange: t42,
                    required: true,
                    rows: 6,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "\u041F\u043E\u043B\u043D\u044B\u0439 \u0442\u0435\u043A\u0441\u0442 \u043D\u043E\u0432\u043E\u0441\u0442\u0438..."
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 905,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 905,
            columnNumber: 11
        }, this);
        $[66] = formData.contentRu;
        $[67] = t42;
        $[68] = t43;
    } else {
        t43 = $[68];
    }
    let t44;
    if ($[69] === Symbol.for("react.memo_cache_sentinel")) {
        t44 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Content (English)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 914,
            columnNumber: 11
        }, this);
        $[69] = t44;
    } else {
        t44 = $[69];
    }
    let t45;
    if ($[70] !== formData) {
        t45 = ({
            "NewsModal[<textarea>.onChange]": (e_5)=>setFormData({
                    ...formData,
                    contentEn: e_5.target.value
                })
        })["NewsModal[<textarea>.onChange]"];
        $[70] = formData;
        $[71] = t45;
    } else {
        t45 = $[71];
    }
    let t46;
    if ($[72] !== formData.contentEn || $[73] !== t45) {
        t46 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t44,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    value: formData.contentEn,
                    onChange: t45,
                    rows: 6,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "Full news text..."
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 934,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 934,
            columnNumber: 11
        }, this);
        $[72] = formData.contentEn;
        $[73] = t45;
        $[74] = t46;
    } else {
        t46 = $[74];
    }
    let t47;
    if ($[75] !== t43 || $[76] !== t46) {
        t47 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: [
                t43,
                t46
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 943,
            columnNumber: 11
        }, this);
        $[75] = t43;
        $[76] = t46;
        $[77] = t47;
    } else {
        t47 = $[77];
    }
    let t48;
    if ($[78] === Symbol.for("react.memo_cache_sentinel")) {
        t48 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Image URL"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 952,
            columnNumber: 11
        }, this);
        $[78] = t48;
    } else {
        t48 = $[78];
    }
    let t49;
    if ($[79] !== formData) {
        t49 = ({
            "NewsModal[<input>.onChange]": (e_6)=>setFormData({
                    ...formData,
                    imageUrl: e_6.target.value
                })
        })["NewsModal[<input>.onChange]"];
        $[79] = formData;
        $[80] = t49;
    } else {
        t49 = $[80];
    }
    let t50;
    if ($[81] !== formData.imageUrl || $[82] !== t49) {
        t50 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t48,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "url",
                    value: formData.imageUrl,
                    onChange: t49,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "https://..."
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 972,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 972,
            columnNumber: 11
        }, this);
        $[81] = formData.imageUrl;
        $[82] = t49;
        $[83] = t50;
    } else {
        t50 = $[83];
    }
    let t51;
    if ($[84] === Symbol.for("react.memo_cache_sentinel")) {
        t51 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Category"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 981,
            columnNumber: 11
        }, this);
        $[84] = t51;
    } else {
        t51 = $[84];
    }
    let t52;
    if ($[85] !== formData) {
        t52 = ({
            "NewsModal[<input>.onChange]": (e_7)=>setFormData({
                    ...formData,
                    category: e_7.target.value
                })
        })["NewsModal[<input>.onChange]"];
        $[85] = formData;
        $[86] = t52;
    } else {
        t52 = $[86];
    }
    let t53;
    if ($[87] !== formData.category || $[88] !== t52) {
        t53 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t51,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.category,
                    onChange: t52,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "spiritual, events, etc."
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1001,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1001,
            columnNumber: 11
        }, this);
        $[87] = formData.category;
        $[88] = t52;
        $[89] = t53;
    } else {
        t53 = $[89];
    }
    let t54;
    if ($[90] === Symbol.for("react.memo_cache_sentinel")) {
        t54 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Tags"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1010,
            columnNumber: 11
        }, this);
        $[90] = t54;
    } else {
        t54 = $[90];
    }
    let t55;
    if ($[91] !== formData) {
        t55 = ({
            "NewsModal[<input>.onChange]": (e_8)=>setFormData({
                    ...formData,
                    tags: e_8.target.value
                })
        })["NewsModal[<input>.onChange]"];
        $[91] = formData;
        $[92] = t55;
    } else {
        t55 = $[92];
    }
    let t56;
    if ($[93] !== formData.tags || $[94] !== t55) {
        t56 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t54,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.tags,
                    onChange: t55,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "yoga, meditation"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1030,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1030,
            columnNumber: 11
        }, this);
        $[93] = formData.tags;
        $[94] = t55;
        $[95] = t56;
    } else {
        t56 = $[95];
    }
    let t57;
    if ($[96] !== t50 || $[97] !== t53 || $[98] !== t56) {
        t57 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-4",
            children: [
                t50,
                t53,
                t56
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1039,
            columnNumber: 11
        }, this);
        $[96] = t50;
        $[97] = t53;
        $[98] = t56;
        $[99] = t57;
    } else {
        t57 = $[99];
    }
    let t58;
    if ($[100] === Symbol.for("react.memo_cache_sentinel")) {
        t58 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Status"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1049,
            columnNumber: 11
        }, this);
        $[100] = t58;
    } else {
        t58 = $[100];
    }
    let t59;
    if ($[101] !== formData) {
        t59 = ({
            "NewsModal[<select>.onChange]": (e_9)=>setFormData({
                    ...formData,
                    status: e_9.target.value
                })
        })["NewsModal[<select>.onChange]"];
        $[101] = formData;
        $[102] = t59;
    } else {
        t59 = $[102];
    }
    let t60;
    let t61;
    let t62;
    if ($[103] === Symbol.for("react.memo_cache_sentinel")) {
        t60 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "draft",
            children: "Draft"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1071,
            columnNumber: 11
        }, this);
        t61 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "published",
            children: "Published"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1072,
            columnNumber: 11
        }, this);
        t62 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "archived",
            children: "Archived"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1073,
            columnNumber: 11
        }, this);
        $[103] = t60;
        $[104] = t61;
        $[105] = t62;
    } else {
        t60 = $[103];
        t61 = $[104];
        t62 = $[105];
    }
    let t63;
    if ($[106] !== formData.status || $[107] !== t59) {
        t63 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t58,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: formData.status,
                    onChange: t59,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer",
                    children: [
                        t60,
                        t61,
                        t62
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1084,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1084,
            columnNumber: 11
        }, this);
        $[106] = formData.status;
        $[107] = t59;
        $[108] = t63;
    } else {
        t63 = $[108];
    }
    let t64;
    if ($[109] === Symbol.for("react.memo_cache_sentinel")) {
        t64 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Source"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1093,
            columnNumber: 11
        }, this);
        $[109] = t64;
    } else {
        t64 = $[109];
    }
    const t65 = formData.sourceId || "";
    let t66;
    if ($[110] !== formData) {
        t66 = ({
            "NewsModal[<select>.onChange]": (e_10)=>setFormData({
                    ...formData,
                    sourceId: e_10.target.value ? Number(e_10.target.value) : undefined
                })
        })["NewsModal[<select>.onChange]"];
        $[110] = formData;
        $[111] = t66;
    } else {
        t66 = $[111];
    }
    let t67;
    if ($[112] === Symbol.for("react.memo_cache_sentinel")) {
        t67 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "",
            children: "Manual Entry"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1114,
            columnNumber: 11
        }, this);
        $[112] = t67;
    } else {
        t67 = $[112];
    }
    let t68;
    if ($[113] !== sources) {
        t68 = sources.map(_NewsModalSourcesMap);
        $[113] = sources;
        $[114] = t68;
    } else {
        t68 = $[114];
    }
    let t69;
    if ($[115] !== t65 || $[116] !== t66 || $[117] !== t68) {
        t69 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t64,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: t65,
                    onChange: t66,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer",
                    children: [
                        t67,
                        t68
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1129,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1129,
            columnNumber: 11
        }, this);
        $[115] = t65;
        $[116] = t66;
        $[117] = t68;
        $[118] = t69;
    } else {
        t69 = $[118];
    }
    let t70;
    if ($[119] !== formData) {
        t70 = ({
            "NewsModal[<input>.onChange]": (e_11)=>setFormData({
                    ...formData,
                    isImportant: e_11.target.checked
                })
        })["NewsModal[<input>.onChange]"];
        $[119] = formData;
        $[120] = t70;
    } else {
        t70 = $[120];
    }
    let t71;
    if ($[121] !== formData.isImportant || $[122] !== t70) {
        t71 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "checkbox",
            checked: formData.isImportant,
            onChange: t70,
            className: "w-5 h-5 rounded border-[var(--border)]"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1152,
            columnNumber: 11
        }, this);
        $[121] = formData.isImportant;
        $[122] = t70;
        $[123] = t71;
    } else {
        t71 = $[123];
    }
    let t72;
    if ($[124] === Symbol.for("react.memo_cache_sentinel")) {
        t72 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-sm font-medium",
            children: "Mark as Important (Push)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1161,
            columnNumber: 11
        }, this);
        $[124] = t72;
    } else {
        t72 = $[124];
    }
    let t73;
    if ($[125] !== t71) {
        t73 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center",
            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                className: "flex items-center gap-3 cursor-pointer",
                children: [
                    t71,
                    t72
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/news/page.tsx",
                lineNumber: 1168,
                columnNumber: 46
            }, this)
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1168,
            columnNumber: 11
        }, this);
        $[125] = t71;
        $[126] = t73;
    } else {
        t73 = $[126];
    }
    let t74;
    if ($[127] !== t63 || $[128] !== t69 || $[129] !== t73) {
        t74 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-4",
            children: [
                t63,
                t69,
                t73
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1176,
            columnNumber: 11
        }, this);
        $[127] = t63;
        $[128] = t69;
        $[129] = t73;
        $[130] = t74;
    } else {
        t74 = $[130];
    }
    let t75;
    if ($[131] !== onClose) {
        t75 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: onClose,
            className: "px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--secondary)]",
            children: "Cancel"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1186,
            columnNumber: 11
        }, this);
        $[131] = onClose;
        $[132] = t75;
    } else {
        t75 = $[132];
    }
    let t76;
    if ($[133] !== loading) {
        t76 = loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
            className: "w-4 h-4 animate-spin"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1194,
            columnNumber: 22
        }, this);
        $[133] = loading;
        $[134] = t76;
    } else {
        t76 = $[134];
    }
    const t77 = news ? "Save Changes" : "Create News";
    let t78;
    if ($[135] !== loading || $[136] !== t76 || $[137] !== t77) {
        t78 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "submit",
            disabled: loading,
            className: "px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2",
            children: [
                t76,
                t77
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1203,
            columnNumber: 11
        }, this);
        $[135] = loading;
        $[136] = t76;
        $[137] = t77;
        $[138] = t78;
    } else {
        t78 = $[138];
    }
    let t79;
    if ($[139] !== t75 || $[140] !== t78) {
        t79 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-end gap-3 pt-4 border-t border-[var(--border)]",
            children: [
                t75,
                t78
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1213,
            columnNumber: 11
        }, this);
        $[139] = t75;
        $[140] = t78;
        $[141] = t79;
    } else {
        t79 = $[141];
    }
    let t80;
    if ($[142] !== handleSubmit || $[143] !== t33 || $[144] !== t40 || $[145] !== t47 || $[146] !== t57 || $[147] !== t74 || $[148] !== t79) {
        t80 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSubmit,
            className: "p-6 space-y-6",
            children: [
                t33,
                t40,
                t47,
                t57,
                t74,
                t79
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1222,
            columnNumber: 11
        }, this);
        $[142] = handleSubmit;
        $[143] = t33;
        $[144] = t40;
        $[145] = t47;
        $[146] = t57;
        $[147] = t74;
        $[148] = t79;
        $[149] = t80;
    } else {
        t80 = $[149];
    }
    let t81;
    if ($[150] !== t26 || $[151] !== t80) {
        t81 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: t19,
            animate: t20,
            exit: t21,
            className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] rounded-2xl shadow-xl z-50 w-full max-w-3xl max-h-[90vh] overflow-auto border border-[var(--border)]",
            children: [
                t26,
                t80
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1236,
            columnNumber: 11
        }, this);
        $[150] = t26;
        $[151] = t80;
        $[152] = t81;
    } else {
        t81 = $[152];
    }
    let t82;
    if ($[153] !== t18 || $[154] !== t81) {
        t82 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                t18,
                t81
            ]
        }, void 0, true);
        $[153] = t18;
        $[154] = t81;
        $[155] = t82;
    } else {
        t82 = $[155];
    }
    return t82;
}
_s1(NewsModal, "8kB29njzwg3GCBfTpQt/Jo6yFVI=");
_c3 = NewsModal;
// ========== SourceModal Component ==========
function _NewsModalSourcesMap(s) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
        value: s.ID,
        children: s.name
    }, s.ID, false, {
        fileName: "[project]/admin/src/app/news/page.tsx",
        lineNumber: 1257,
        columnNumber: 10
    }, this);
}
function SourceModal(t0) {
    _s2();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(170);
    if ($[0] !== "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61") {
        for(let $i = 0; $i < 170; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "06e3dc8d4a0d1b46bb059af948bf04e509400c03b8be974db751928715672f61";
    }
    const { source, loading, onClose, onSave } = t0;
    const t1 = source?.name || "";
    const t2 = source?.description || "";
    const t3 = source?.sourceType || "rss";
    const t4 = source?.url || "";
    const t5 = source?.vkGroupId || "";
    const t6 = source?.telegramId || "";
    const t7 = source?.isActive ?? true;
    const t8 = source?.fetchInterval || 3600;
    const t9 = source?.mode || "draft";
    const t10 = source?.autoTranslate ?? true;
    const t11 = source?.styleTransfer ?? true;
    const t12 = source?.defaultTags || "";
    const t13 = source?.tgParserType || "bot";
    const t14 = source?.targetMadh || "";
    const t15 = source?.targetYoga || "";
    const t16 = source?.targetIdentity || "";
    let t17;
    if ($[1] !== t1 || $[2] !== t10 || $[3] !== t11 || $[4] !== t12 || $[5] !== t13 || $[6] !== t14 || $[7] !== t15 || $[8] !== t16 || $[9] !== t2 || $[10] !== t3 || $[11] !== t4 || $[12] !== t5 || $[13] !== t6 || $[14] !== t7 || $[15] !== t8 || $[16] !== t9) {
        t17 = {
            name: t1,
            description: t2,
            sourceType: t3,
            url: t4,
            vkGroupId: t5,
            telegramId: t6,
            isActive: t7,
            fetchInterval: t8,
            mode: t9,
            autoTranslate: t10,
            styleTransfer: t11,
            defaultTags: t12,
            tgParserType: t13,
            targetMadh: t14,
            targetYoga: t15,
            targetIdentity: t16
        };
        $[1] = t1;
        $[2] = t10;
        $[3] = t11;
        $[4] = t12;
        $[5] = t13;
        $[6] = t14;
        $[7] = t15;
        $[8] = t16;
        $[9] = t2;
        $[10] = t3;
        $[11] = t4;
        $[12] = t5;
        $[13] = t6;
        $[14] = t7;
        $[15] = t8;
        $[16] = t9;
        $[17] = t17;
    } else {
        t17 = $[17];
    }
    const [formData, setFormData] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(t17);
    let t18;
    if ($[18] !== formData || $[19] !== onSave) {
        t18 = ({
            "SourceModal[handleSubmit]": (e)=>{
                e.preventDefault();
                onSave(formData);
            }
        })["SourceModal[handleSubmit]"];
        $[18] = formData;
        $[19] = onSave;
        $[20] = t18;
    } else {
        t18 = $[20];
    }
    const handleSubmit = t18;
    let t19;
    let t20;
    let t21;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t19 = {
            opacity: 0
        };
        t20 = {
            opacity: 1
        };
        t21 = {
            opacity: 0
        };
        $[21] = t19;
        $[22] = t20;
        $[23] = t21;
    } else {
        t19 = $[21];
        t20 = $[22];
        t21 = $[23];
    }
    let t22;
    if ($[24] !== onClose) {
        t22 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: t19,
            animate: t20,
            exit: t21,
            onClick: onClose,
            className: "fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1368,
            columnNumber: 11
        }, this);
        $[24] = onClose;
        $[25] = t22;
    } else {
        t22 = $[25];
    }
    let t23;
    let t24;
    let t25;
    if ($[26] === Symbol.for("react.memo_cache_sentinel")) {
        t23 = {
            opacity: 0,
            scale: 0.95
        };
        t24 = {
            opacity: 1,
            scale: 1
        };
        t25 = {
            opacity: 0,
            scale: 0.95
        };
        $[26] = t23;
        $[27] = t24;
        $[28] = t25;
    } else {
        t23 = $[26];
        t24 = $[27];
        t25 = $[28];
    }
    const t26 = source ? "Edit Source" : "Add Source";
    let t27;
    if ($[29] !== t26) {
        t27 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
            className: "text-lg font-bold",
            children: t26
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1401,
            columnNumber: 11
        }, this);
        $[29] = t26;
        $[30] = t27;
    } else {
        t27 = $[30];
    }
    let t28;
    if ($[31] === Symbol.for("react.memo_cache_sentinel")) {
        t28 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__X$3e$__["X"], {
            className: "w-5 h-5"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1409,
            columnNumber: 11
        }, this);
        $[31] = t28;
    } else {
        t28 = $[31];
    }
    let t29;
    if ($[32] !== onClose) {
        t29 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            onClick: onClose,
            className: "p-2 hover:bg-[var(--secondary)] rounded-lg",
            children: t28
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1416,
            columnNumber: 11
        }, this);
        $[32] = onClose;
        $[33] = t29;
    } else {
        t29 = $[33];
    }
    let t30;
    if ($[34] !== t27 || $[35] !== t29) {
        t30 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-4 flex items-center justify-between",
            children: [
                t27,
                t29
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1424,
            columnNumber: 11
        }, this);
        $[34] = t27;
        $[35] = t29;
        $[36] = t30;
    } else {
        t30 = $[36];
    }
    let t31;
    if ($[37] === Symbol.for("react.memo_cache_sentinel")) {
        t31 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Name *"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1433,
            columnNumber: 11
        }, this);
        $[37] = t31;
    } else {
        t31 = $[37];
    }
    let t32;
    if ($[38] !== formData) {
        t32 = ({
            "SourceModal[<input>.onChange]": (e_0)=>setFormData({
                    ...formData,
                    name: e_0.target.value
                })
        })["SourceModal[<input>.onChange]"];
        $[38] = formData;
        $[39] = t32;
    } else {
        t32 = $[39];
    }
    let t33;
    if ($[40] !== formData.name || $[41] !== t32) {
        t33 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t31,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.name,
                    onChange: t32,
                    required: true,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "Source name"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1453,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1453,
            columnNumber: 11
        }, this);
        $[40] = formData.name;
        $[41] = t32;
        $[42] = t33;
    } else {
        t33 = $[42];
    }
    let t34;
    if ($[43] === Symbol.for("react.memo_cache_sentinel")) {
        t34 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Description"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1462,
            columnNumber: 11
        }, this);
        $[43] = t34;
    } else {
        t34 = $[43];
    }
    let t35;
    if ($[44] !== formData) {
        t35 = ({
            "SourceModal[<textarea>.onChange]": (e_1)=>setFormData({
                    ...formData,
                    description: e_1.target.value
                })
        })["SourceModal[<textarea>.onChange]"];
        $[44] = formData;
        $[45] = t35;
    } else {
        t35 = $[45];
    }
    let t36;
    if ($[46] !== formData.description || $[47] !== t35) {
        t36 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t34,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
                    value: formData.description,
                    onChange: t35,
                    rows: 2,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none resize-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "Optional description"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1482,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1482,
            columnNumber: 11
        }, this);
        $[46] = formData.description;
        $[47] = t35;
        $[48] = t36;
    } else {
        t36 = $[48];
    }
    let t37;
    if ($[49] === Symbol.for("react.memo_cache_sentinel")) {
        t37 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Source Type *"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1491,
            columnNumber: 11
        }, this);
        $[49] = t37;
    } else {
        t37 = $[49];
    }
    let t38;
    if ($[50] !== formData) {
        t38 = ({
            "SourceModal[<select>.onChange]": (e_2)=>setFormData({
                    ...formData,
                    sourceType: e_2.target.value
                })
        })["SourceModal[<select>.onChange]"];
        $[50] = formData;
        $[51] = t38;
    } else {
        t38 = $[51];
    }
    let t39;
    let t40;
    let t41;
    let t42;
    if ($[52] === Symbol.for("react.memo_cache_sentinel")) {
        t39 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "rss",
            children: "RSS Feed"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1514,
            columnNumber: 11
        }, this);
        t40 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "url",
            children: "Direct URL"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1515,
            columnNumber: 11
        }, this);
        t41 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "vk",
            children: "VKontakte Group"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1516,
            columnNumber: 11
        }, this);
        t42 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "telegram",
            children: "Telegram Channel"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1517,
            columnNumber: 11
        }, this);
        $[52] = t39;
        $[53] = t40;
        $[54] = t41;
        $[55] = t42;
    } else {
        t39 = $[52];
        t40 = $[53];
        t41 = $[54];
        t42 = $[55];
    }
    let t43;
    if ($[56] !== formData.sourceType || $[57] !== t38) {
        t43 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t37,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: formData.sourceType,
                    onChange: t38,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer",
                    children: [
                        t39,
                        t40,
                        t41,
                        t42
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1530,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1530,
            columnNumber: 11
        }, this);
        $[56] = formData.sourceType;
        $[57] = t38;
        $[58] = t43;
    } else {
        t43 = $[58];
    }
    let t44;
    if ($[59] !== formData) {
        t44 = (formData.sourceType === "rss" || formData.sourceType === "url") && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "block text-sm font-medium mb-2",
                    children: "URL *"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1539,
                    columnNumber: 84
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "url",
                    value: formData.url,
                    onChange: {
                        "SourceModal[<input>.onChange]": (e_3)=>setFormData({
                                ...formData,
                                url: e_3.target.value
                            })
                    }["SourceModal[<input>.onChange]"],
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "https://example.com/rss"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1539,
                    columnNumber: 147
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1539,
            columnNumber: 79
        }, this);
        $[59] = formData;
        $[60] = t44;
    } else {
        t44 = $[60];
    }
    let t45;
    if ($[61] !== formData) {
        t45 = formData.sourceType === "vk" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "block text-sm font-medium mb-2",
                    children: "VK Group ID"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1552,
                    columnNumber: 48
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.vkGroupId,
                    onChange: {
                        "SourceModal[<input>.onChange]": (e_4)=>setFormData({
                                ...formData,
                                vkGroupId: e_4.target.value
                            })
                    }["SourceModal[<input>.onChange]"],
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "club12345678"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1552,
                    columnNumber: 117
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1552,
            columnNumber: 43
        }, this);
        $[61] = formData;
        $[62] = t45;
    } else {
        t45 = $[62];
    }
    let t46;
    if ($[63] !== formData) {
        t46 = formData.sourceType === "telegram" && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-2 gap-4",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs font-bold text-[var(--muted-foreground)] uppercase mb-2",
                            children: "Telegram Channel ID"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1565,
                            columnNumber: 109
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            value: formData.telegramId,
                            onChange: {
                                "SourceModal[<input>.onChange]": (e_5)=>setFormData({
                                        ...formData,
                                        telegramId: e_5.target.value
                                    })
                            }["SourceModal[<input>.onChange]"],
                            className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                            placeholder: "@channelname"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1565,
                            columnNumber: 225
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1565,
                    columnNumber: 104
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                            className: "block text-xs font-bold text-[var(--muted-foreground)] uppercase mb-2",
                            children: "TG Parser Method"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1570,
                            columnNumber: 218
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                            value: formData.tgParserType,
                            onChange: {
                                "SourceModal[<select>.onChange]": (e_6)=>setFormData({
                                        ...formData,
                                        tgParserType: e_6.target.value
                                    })
                            }["SourceModal[<select>.onChange]"],
                            className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-xs outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "bot",
                                    children: "Bot API (Requires Admin)"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 1575,
                                    columnNumber: 194
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                    value: "web",
                                    children: "Web Scraper (Public Only)"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/news/page.tsx",
                                    lineNumber: 1575,
                                    columnNumber: 247
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1570,
                            columnNumber: 331
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1570,
                    columnNumber: 213
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1565,
            columnNumber: 49
        }, this);
        $[63] = formData;
        $[64] = t46;
    } else {
        t46 = $[64];
    }
    let t47;
    if ($[65] === Symbol.for("react.memo_cache_sentinel")) {
        t47 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Fetch Interval"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1583,
            columnNumber: 11
        }, this);
        $[65] = t47;
    } else {
        t47 = $[65];
    }
    let t48;
    if ($[66] !== formData) {
        t48 = ({
            "SourceModal[<select>.onChange]": (e_7)=>setFormData({
                    ...formData,
                    fetchInterval: Number(e_7.target.value)
                })
        })["SourceModal[<select>.onChange]"];
        $[66] = formData;
        $[67] = t48;
    } else {
        t48 = $[67];
    }
    let t49;
    let t50;
    let t51;
    let t52;
    let t53;
    if ($[68] === Symbol.for("react.memo_cache_sentinel")) {
        t49 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: 900,
            children: "Every 15 min"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1607,
            columnNumber: 11
        }, this);
        t50 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: 1800,
            children: "Every 30 min"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1608,
            columnNumber: 11
        }, this);
        t51 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: 3600,
            children: "Every hour"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1609,
            columnNumber: 11
        }, this);
        t52 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: 7200,
            children: "Every 2 hours"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1610,
            columnNumber: 11
        }, this);
        t53 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: 86400,
            children: "Once a day"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1611,
            columnNumber: 11
        }, this);
        $[68] = t49;
        $[69] = t50;
        $[70] = t51;
        $[71] = t52;
        $[72] = t53;
    } else {
        t49 = $[68];
        t50 = $[69];
        t51 = $[70];
        t52 = $[71];
        t53 = $[72];
    }
    let t54;
    if ($[73] !== formData.fetchInterval || $[74] !== t48) {
        t54 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t47,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: formData.fetchInterval,
                    onChange: t48,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer",
                    children: [
                        t49,
                        t50,
                        t51,
                        t52,
                        t53
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1626,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1626,
            columnNumber: 11
        }, this);
        $[73] = formData.fetchInterval;
        $[74] = t48;
        $[75] = t54;
    } else {
        t54 = $[75];
    }
    let t55;
    if ($[76] === Symbol.for("react.memo_cache_sentinel")) {
        t55 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Mode"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1635,
            columnNumber: 11
        }, this);
        $[76] = t55;
    } else {
        t55 = $[76];
    }
    let t56;
    if ($[77] !== formData) {
        t56 = ({
            "SourceModal[<select>.onChange]": (e_8)=>setFormData({
                    ...formData,
                    mode: e_8.target.value
                })
        })["SourceModal[<select>.onChange]"];
        $[77] = formData;
        $[78] = t56;
    } else {
        t56 = $[78];
    }
    let t57;
    let t58;
    if ($[79] === Symbol.for("react.memo_cache_sentinel")) {
        t57 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "draft",
            children: "Save as Draft"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1656,
            columnNumber: 11
        }, this);
        t58 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
            value: "auto_publish",
            children: "Auto-publish"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1657,
            columnNumber: 11
        }, this);
        $[79] = t57;
        $[80] = t58;
    } else {
        t57 = $[79];
        t58 = $[80];
    }
    let t59;
    if ($[81] !== formData.mode || $[82] !== t56) {
        t59 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t55,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    value: formData.mode,
                    onChange: t56,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none cursor-pointer",
                    children: [
                        t57,
                        t58
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1666,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1666,
            columnNumber: 11
        }, this);
        $[81] = formData.mode;
        $[82] = t56;
        $[83] = t59;
    } else {
        t59 = $[83];
    }
    let t60;
    if ($[84] !== t54 || $[85] !== t59) {
        t60 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-2 gap-4",
            children: [
                t54,
                t59
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1675,
            columnNumber: 11
        }, this);
        $[84] = t54;
        $[85] = t59;
        $[86] = t60;
    } else {
        t60 = $[86];
    }
    let t61;
    if ($[87] === Symbol.for("react.memo_cache_sentinel")) {
        t61 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-sm font-medium mb-2",
            children: "Default Tags"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1684,
            columnNumber: 11
        }, this);
        $[87] = t61;
    } else {
        t61 = $[87];
    }
    let t62;
    if ($[88] !== formData) {
        t62 = ({
            "SourceModal[<input>.onChange]": (e_9)=>setFormData({
                    ...formData,
                    defaultTags: e_9.target.value
                })
        })["SourceModal[<input>.onChange]"];
        $[88] = formData;
        $[89] = t62;
    } else {
        t62 = $[89];
    }
    let t63;
    if ($[90] !== formData.defaultTags || $[91] !== t62) {
        t63 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                t61,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                    type: "text",
                    value: formData.defaultTags,
                    onChange: t62,
                    className: "w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20",
                    placeholder: "news, updates"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1704,
                    columnNumber: 21
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1704,
            columnNumber: 11
        }, this);
        $[90] = formData.defaultTags;
        $[91] = t62;
        $[92] = t63;
    } else {
        t63 = $[92];
    }
    let t64;
    if ($[93] === Symbol.for("react.memo_cache_sentinel")) {
        t64 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-xs font-bold text-[var(--muted-foreground)] uppercase",
            children: "Target Madh"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1713,
            columnNumber: 11
        }, this);
        $[93] = t64;
    } else {
        t64 = $[93];
    }
    let t65;
    if ($[94] !== formData) {
        t65 = MADH_OPTIONS.map({
            "SourceModal[MADH_OPTIONS.map()]": (opt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex items-center gap-2 py-1 cursor-pointer hover:text-[var(--primary)] transition-all",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "checkbox",
                            checked: formData.targetMadh.split(",").includes(opt.id),
                            onChange: {
                                "SourceModal[MADH_OPTIONS.map() > <input>.onChange]": (e_10)=>{
                                    const current = formData.targetMadh.split(",").filter(_SourceModalMADH_OPTIONSMapInputOnChangeAnonymous);
                                    const next = e_10.target.checked ? [
                                        ...current,
                                        opt.id
                                    ] : current.filter({
                                        "SourceModal[MADH_OPTIONS.map() > <input>.onChange > current.filter()]": (x_0)=>x_0 !== opt.id
                                    }["SourceModal[MADH_OPTIONS.map() > <input>.onChange > current.filter()]"]);
                                    setFormData({
                                        ...formData,
                                        targetMadh: next.join(",")
                                    });
                                }
                            }["SourceModal[MADH_OPTIONS.map() > <input>.onChange]"],
                            className: "rounded border-[var(--border)]"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1721,
                            columnNumber: 168
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs",
                            children: opt.label
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1732,
                            columnNumber: 111
                        }, this)
                    ]
                }, opt.id, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1721,
                    columnNumber: 49
                }, this)
        }["SourceModal[MADH_OPTIONS.map()]"]);
        $[94] = formData;
        $[95] = t65;
    } else {
        t65 = $[95];
    }
    let t66;
    if ($[96] !== t65) {
        t66 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-2",
            children: [
                t64,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-[var(--secondary)] rounded-xl p-3 max-h-40 overflow-y-auto border border-[var(--border)]",
                    children: t65
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1741,
                    columnNumber: 43
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1741,
            columnNumber: 11
        }, this);
        $[96] = t65;
        $[97] = t66;
    } else {
        t66 = $[97];
    }
    let t67;
    if ($[98] === Symbol.for("react.memo_cache_sentinel")) {
        t67 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-xs font-bold text-[var(--muted-foreground)] uppercase",
            children: "Target Yoga Style"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1749,
            columnNumber: 11
        }, this);
        $[98] = t67;
    } else {
        t67 = $[98];
    }
    let t68;
    if ($[99] !== formData) {
        t68 = YOGA_OPTIONS.map({
            "SourceModal[YOGA_OPTIONS.map()]": (opt_0)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex items-center gap-2 py-1 cursor-pointer hover:text-[var(--primary)] transition-all",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "checkbox",
                            checked: formData.targetYoga.split(",").includes(opt_0.id),
                            onChange: {
                                "SourceModal[YOGA_OPTIONS.map() > <input>.onChange]": (e_11)=>{
                                    const current_0 = formData.targetYoga.split(",").filter(_SourceModalYOGA_OPTIONSMapInputOnChangeAnonymous);
                                    const next_0 = e_11.target.checked ? [
                                        ...current_0,
                                        opt_0.id
                                    ] : current_0.filter({
                                        "SourceModal[YOGA_OPTIONS.map() > <input>.onChange > current_0.filter()]": (x_2)=>x_2 !== opt_0.id
                                    }["SourceModal[YOGA_OPTIONS.map() > <input>.onChange > current_0.filter()]"]);
                                    setFormData({
                                        ...formData,
                                        targetYoga: next_0.join(",")
                                    });
                                }
                            }["SourceModal[YOGA_OPTIONS.map() > <input>.onChange]"],
                            className: "rounded border-[var(--border)]"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1757,
                            columnNumber: 172
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs",
                            children: opt_0.label
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1768,
                            columnNumber: 111
                        }, this)
                    ]
                }, opt_0.id, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1757,
                    columnNumber: 51
                }, this)
        }["SourceModal[YOGA_OPTIONS.map()]"]);
        $[99] = formData;
        $[100] = t68;
    } else {
        t68 = $[100];
    }
    let t69;
    if ($[101] !== t68) {
        t69 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-2",
            children: [
                t67,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-[var(--secondary)] rounded-xl p-3 max-h-40 overflow-y-auto border border-[var(--border)]",
                    children: t68
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1777,
                    columnNumber: 43
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1777,
            columnNumber: 11
        }, this);
        $[101] = t68;
        $[102] = t69;
    } else {
        t69 = $[102];
    }
    let t70;
    if ($[103] === Symbol.for("react.memo_cache_sentinel")) {
        t70 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "block text-xs font-bold text-[var(--muted-foreground)] uppercase",
            children: "Target Identity"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1785,
            columnNumber: 11
        }, this);
        $[103] = t70;
    } else {
        t70 = $[103];
    }
    let t71;
    if ($[104] !== formData) {
        t71 = IDENTITY_OPTIONS.map({
            "SourceModal[IDENTITY_OPTIONS.map()]": (opt_1)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                    className: "flex items-center gap-2 py-1 cursor-pointer hover:text-[var(--primary)] transition-all",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "checkbox",
                            checked: formData.targetIdentity.split(",").includes(opt_1.id),
                            onChange: {
                                "SourceModal[IDENTITY_OPTIONS.map() > <input>.onChange]": (e_12)=>{
                                    const current_1 = formData.targetIdentity.split(",").filter(_SourceModalIDENTITY_OPTIONSMapInputOnChangeAnonymous);
                                    const next_1 = e_12.target.checked ? [
                                        ...current_1,
                                        opt_1.id
                                    ] : current_1.filter({
                                        "SourceModal[IDENTITY_OPTIONS.map() > <input>.onChange > current_1.filter()]": (x_4)=>x_4 !== opt_1.id
                                    }["SourceModal[IDENTITY_OPTIONS.map() > <input>.onChange > current_1.filter()]"]);
                                    setFormData({
                                        ...formData,
                                        targetIdentity: next_1.join(",")
                                    });
                                }
                            }["SourceModal[IDENTITY_OPTIONS.map() > <input>.onChange]"],
                            className: "rounded border-[var(--border)]"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1793,
                            columnNumber: 176
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            className: "text-xs",
                            children: opt_1.label
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/news/page.tsx",
                            lineNumber: 1804,
                            columnNumber: 115
                        }, this)
                    ]
                }, opt_1.id, true, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1793,
                    columnNumber: 55
                }, this)
        }["SourceModal[IDENTITY_OPTIONS.map()]"]);
        $[104] = formData;
        $[105] = t71;
    } else {
        t71 = $[105];
    }
    let t72;
    if ($[106] !== t71) {
        t72 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-2",
            children: [
                t70,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-[var(--secondary)] rounded-xl p-3 max-h-40 overflow-y-auto border border-[var(--border)]",
                    children: t71
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/news/page.tsx",
                    lineNumber: 1813,
                    columnNumber: 43
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1813,
            columnNumber: 11
        }, this);
        $[106] = t71;
        $[107] = t72;
    } else {
        t72 = $[107];
    }
    let t73;
    if ($[108] !== t66 || $[109] !== t69 || $[110] !== t72) {
        t73 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 md:grid-cols-3 gap-6",
            children: [
                t66,
                t69,
                t72
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1821,
            columnNumber: 11
        }, this);
        $[108] = t66;
        $[109] = t69;
        $[110] = t72;
        $[111] = t73;
    } else {
        t73 = $[111];
    }
    let t74;
    if ($[112] !== formData) {
        t74 = ({
            "SourceModal[<input>.onChange]": (e_13)=>setFormData({
                    ...formData,
                    isActive: e_13.target.checked
                })
        })["SourceModal[<input>.onChange]"];
        $[112] = formData;
        $[113] = t74;
    } else {
        t74 = $[113];
    }
    let t75;
    if ($[114] !== formData.isActive || $[115] !== t74) {
        t75 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "checkbox",
            checked: formData.isActive,
            onChange: t74,
            className: "w-5 h-5 rounded border-[var(--border)]"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1844,
            columnNumber: 11
        }, this);
        $[114] = formData.isActive;
        $[115] = t74;
        $[116] = t75;
    } else {
        t75 = $[116];
    }
    let t76;
    if ($[117] === Symbol.for("react.memo_cache_sentinel")) {
        t76 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-sm",
            children: "Active (enable automatic fetching)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1853,
            columnNumber: 11
        }, this);
        $[117] = t76;
    } else {
        t76 = $[117];
    }
    let t77;
    if ($[118] !== t75) {
        t77 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex items-center gap-3 cursor-pointer",
            children: [
                t75,
                t76
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1860,
            columnNumber: 11
        }, this);
        $[118] = t75;
        $[119] = t77;
    } else {
        t77 = $[119];
    }
    let t78;
    if ($[120] !== formData) {
        t78 = ({
            "SourceModal[<input>.onChange]": (e_14)=>setFormData({
                    ...formData,
                    autoTranslate: e_14.target.checked
                })
        })["SourceModal[<input>.onChange]"];
        $[120] = formData;
        $[121] = t78;
    } else {
        t78 = $[121];
    }
    let t79;
    if ($[122] !== formData.autoTranslate || $[123] !== t78) {
        t79 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "checkbox",
            checked: formData.autoTranslate,
            onChange: t78,
            className: "w-5 h-5 rounded border-[var(--border)]"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1881,
            columnNumber: 11
        }, this);
        $[122] = formData.autoTranslate;
        $[123] = t78;
        $[124] = t79;
    } else {
        t79 = $[124];
    }
    let t80;
    if ($[125] === Symbol.for("react.memo_cache_sentinel")) {
        t80 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-sm",
            children: "Auto-translate (RU ↔ EN)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1890,
            columnNumber: 11
        }, this);
        $[125] = t80;
    } else {
        t80 = $[125];
    }
    let t81;
    if ($[126] !== t79) {
        t81 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex items-center gap-3 cursor-pointer",
            children: [
                t79,
                t80
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1897,
            columnNumber: 11
        }, this);
        $[126] = t79;
        $[127] = t81;
    } else {
        t81 = $[127];
    }
    let t82;
    if ($[128] !== formData) {
        t82 = ({
            "SourceModal[<input>.onChange]": (e_15)=>setFormData({
                    ...formData,
                    styleTransfer: e_15.target.checked
                })
        })["SourceModal[<input>.onChange]"];
        $[128] = formData;
        $[129] = t82;
    } else {
        t82 = $[129];
    }
    let t83;
    if ($[130] !== formData.styleTransfer || $[131] !== t82) {
        t83 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
            type: "checkbox",
            checked: formData.styleTransfer,
            onChange: t82,
            className: "w-5 h-5 rounded border-[var(--border)]"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1918,
            columnNumber: 11
        }, this);
        $[130] = formData.styleTransfer;
        $[131] = t82;
        $[132] = t83;
    } else {
        t83 = $[132];
    }
    let t84;
    if ($[133] === Symbol.for("react.memo_cache_sentinel")) {
        t84 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
            className: "text-sm",
            children: "Style transfer (Sattva style)"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1927,
            columnNumber: 11
        }, this);
        $[133] = t84;
    } else {
        t84 = $[133];
    }
    let t85;
    if ($[134] !== t83) {
        t85 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
            className: "flex items-center gap-3 cursor-pointer",
            children: [
                t83,
                t84
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1934,
            columnNumber: 11
        }, this);
        $[134] = t83;
        $[135] = t85;
    } else {
        t85 = $[135];
    }
    let t86;
    if ($[136] !== t77 || $[137] !== t81 || $[138] !== t85) {
        t86 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex flex-col gap-3",
            children: [
                t77,
                t81,
                t85
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1942,
            columnNumber: 11
        }, this);
        $[136] = t77;
        $[137] = t81;
        $[138] = t85;
        $[139] = t86;
    } else {
        t86 = $[139];
    }
    let t87;
    if ($[140] !== onClose) {
        t87 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "button",
            onClick: onClose,
            className: "px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--secondary)]",
            children: "Cancel"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1952,
            columnNumber: 11
        }, this);
        $[140] = onClose;
        $[141] = t87;
    } else {
        t87 = $[141];
    }
    let t88;
    if ($[142] !== loading) {
        t88 = loading && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
            className: "w-4 h-4 animate-spin"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1960,
            columnNumber: 22
        }, this);
        $[142] = loading;
        $[143] = t88;
    } else {
        t88 = $[143];
    }
    const t89 = source ? "Save Changes" : "Add Source";
    let t90;
    if ($[144] !== loading || $[145] !== t88 || $[146] !== t89) {
        t90 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
            type: "submit",
            disabled: loading,
            className: "px-5 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-90 disabled:opacity-50 flex items-center gap-2",
            children: [
                t88,
                t89
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1969,
            columnNumber: 11
        }, this);
        $[144] = loading;
        $[145] = t88;
        $[146] = t89;
        $[147] = t90;
    } else {
        t90 = $[147];
    }
    let t91;
    if ($[148] !== t87 || $[149] !== t90) {
        t91 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex justify-end gap-3 pt-4 border-t border-[var(--border)]",
            children: [
                t87,
                t90
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1979,
            columnNumber: 11
        }, this);
        $[148] = t87;
        $[149] = t90;
        $[150] = t91;
    } else {
        t91 = $[150];
    }
    let t92;
    if ($[151] !== handleSubmit || $[152] !== t33 || $[153] !== t36 || $[154] !== t43 || $[155] !== t44 || $[156] !== t45 || $[157] !== t46 || $[158] !== t60 || $[159] !== t63 || $[160] !== t73 || $[161] !== t86 || $[162] !== t91) {
        t92 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("form", {
            onSubmit: handleSubmit,
            className: "p-6 space-y-4",
            children: [
                t33,
                t36,
                t43,
                t44,
                t45,
                t46,
                t60,
                t63,
                t73,
                t86,
                t91
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 1988,
            columnNumber: 11
        }, this);
        $[151] = handleSubmit;
        $[152] = t33;
        $[153] = t36;
        $[154] = t43;
        $[155] = t44;
        $[156] = t45;
        $[157] = t46;
        $[158] = t60;
        $[159] = t63;
        $[160] = t73;
        $[161] = t86;
        $[162] = t91;
        $[163] = t92;
    } else {
        t92 = $[163];
    }
    let t93;
    if ($[164] !== t30 || $[165] !== t92) {
        t93 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
            initial: t23,
            animate: t24,
            exit: t25,
            className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[var(--card)] rounded-2xl shadow-xl z-50 w-full max-w-lg max-h-[90vh] overflow-auto border border-[var(--border)]",
            children: [
                t30,
                t92
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/news/page.tsx",
            lineNumber: 2007,
            columnNumber: 11
        }, this);
        $[164] = t30;
        $[165] = t92;
        $[166] = t93;
    } else {
        t93 = $[166];
    }
    let t94;
    if ($[167] !== t22 || $[168] !== t93) {
        t94 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
            children: [
                t22,
                t93
            ]
        }, void 0, true);
        $[167] = t22;
        $[168] = t93;
        $[169] = t94;
    } else {
        t94 = $[169];
    }
    return t94;
}
_s2(SourceModal, "2+9x/qqBB3und+9E+NOpBgYdjw0=");
_c4 = SourceModal;
function _SourceModalIDENTITY_OPTIONSMapInputOnChangeAnonymous(x_3) {
    return x_3;
}
function _SourceModalYOGA_OPTIONSMapInputOnChangeAnonymous(x_1) {
    return x_1;
}
function _SourceModalMADH_OPTIONSMapInputOnChangeAnonymous(x) {
    return x;
}
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "NewsPage");
__turbopack_context__.k.register(_c1, "NewsTable");
__turbopack_context__.k.register(_c2, "SourcesTable");
__turbopack_context__.k.register(_c3, "NewsModal");
__turbopack_context__.k.register(_c4, "SourceModal");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=admin_src_a68da5cc._.js.map