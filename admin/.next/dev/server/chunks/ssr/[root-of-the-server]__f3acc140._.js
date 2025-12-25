module.exports = [
"[externals]/util [external] (util, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("util", () => require("util"));

module.exports = mod;
}),
"[externals]/stream [external] (stream, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("stream", () => require("stream"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[externals]/http [external] (http, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http", () => require("http"));

module.exports = mod;
}),
"[externals]/https [external] (https, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("https", () => require("https"));

module.exports = mod;
}),
"[externals]/url [external] (url, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("url", () => require("url"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/crypto [external] (crypto, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("crypto", () => require("crypto"));

module.exports = mod;
}),
"[externals]/http2 [external] (http2, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("http2", () => require("http2"));

module.exports = mod;
}),
"[externals]/assert [external] (assert, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("assert", () => require("assert"));

module.exports = mod;
}),
"[externals]/zlib [external] (zlib, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("zlib", () => require("zlib"));

module.exports = mod;
}),
"[externals]/events [external] (events, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("events", () => require("events"));

module.exports = mod;
}),
"[project]/admin/src/lib/api.ts [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/axios@1.13.2/node_modules/axios/lib/axios.js [app-ssr] (ecmascript)");
;
const api = __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: ("TURBOPACK compile-time value", "http://localhost:8081/api") || 'http://localhost:8081/api'
});
// Add a request interceptor to add the auth headers if needed
api.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return config;
});
const __TURBOPACK__default__export__ = api;
}),
"[project]/admin/src/app/dating/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DatingManagementPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/swr@2.3.8_react@19.0.0-rc.1/node_modules/swr/dist/index/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/search.js [app-ssr] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/heart.js [app-ssr] (ecmascript) <export default as Heart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flag$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Flag$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/flag.js [app-ssr] (ecmascript) <export default as Flag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/shield-alert.js [app-ssr] (ecmascript) <export default as ShieldAlert>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/mail.js [app-ssr] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-ssr] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-check.js [app-ssr] (ecmascript) <export default as CheckCircle2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/eye.js [app-ssr] (ecmascript) <export default as Eye>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/src/lib/api.ts [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
const fetcher = (url)=>__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(url).then((res)=>res.data);
// Simple blacklisted words for demo moderation
const BLACKLIST = [
    'porn',
    'sexy',
    'money',
    'crypto',
    'scam',
    'dating site',
    '18+',
    'drugs',
    'weapons'
];
function DatingManagementPage() {
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [actionLoading, setActionLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const [selectedProfile, setSelectedProfile] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const { data: profiles, error, mutate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(`/admin/dating/profiles?search=${search}`, fetcher);
    const handleToggleFlag = async (userId, currentFlagged)=>{
        setActionLoading(userId.toString());
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`/admin/dating/profiles/${userId}/flag`, {
                isFlagged: !currentFlagged,
                flagReason: !currentFlagged ? 'Moderated by Admin' : ''
            });
            mutate();
        } catch (err) {
            console.error('Failed to toggle flag', err);
        } finally{
            setActionLoading(null);
        }
    };
    const isSuspicious = (text)=>{
        if (!text) return false;
        const lowerText = text.toLowerCase();
        return BLACKLIST.some((word)=>lowerText.includes(word));
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-bold tracking-tight",
                                children: "Dating Management"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 63,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[var(--muted-foreground)] mt-1",
                                children: "Moderate and manage community dating profiles"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 64,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 62,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-4 py-2 bg-pink-500/10 text-pink-500 rounded-full text-sm font-semibold border border-pink-500/20",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__["Heart"], {
                                    className: "w-4 h-4 inline mr-2"
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/dating/page.tsx",
                                    lineNumber: 68,
                                    columnNumber: 25
                                }, this),
                                profiles?.length || 0,
                                " Registered Profiles"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/dating/page.tsx",
                            lineNumber: 67,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 66,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 61,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "relative flex-1",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                            className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dating/page.tsx",
                            lineNumber: 77,
                            columnNumber: 21
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                            type: "text",
                            placeholder: "Search by name, email, interests...",
                            value: search,
                            onChange: (e)=>setSearch(e.target.value),
                            className: "w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dating/page.tsx",
                            lineNumber: 78,
                            columnNumber: 21
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/dating/page.tsx",
                    lineNumber: 76,
                    columnNumber: 17
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 75,
                columnNumber: 13
            }, this),
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "w-12 h-12 mb-4"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 90,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-semibold",
                        children: "Failed to load profiles"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 91,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>mutate(),
                        className: "mt-4 text-sm underline",
                        children: "Try again"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 92,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 89,
                columnNumber: 17
            }, this) : !profiles ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center p-24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "w-8 h-8 animate-spin text-[var(--primary)]"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dating/page.tsx",
                    lineNumber: 96,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 95,
                columnNumber: 17
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                children: profiles.map((user)=>{
                    const suspicious = isSuspicious(user.bio) || isSuspicious(user.interests);
                    const flagged = user.isFlagged;
                    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
                        layout: true,
                        initial: {
                            opacity: 0,
                            y: 20
                        },
                        animate: {
                            opacity: 1,
                            y: 0
                        },
                        className: `group relative bg-[var(--card)] rounded-3xl border-2 transition-all p-5 flex flex-col gap-4 shadow-sm hover:shadow-md ${flagged ? 'border-red-500 bg-red-50/50' : suspicious ? 'border-amber-400 bg-amber-50/20' : 'border-[var(--border)] hover:border-[var(--primary)]/50'}`,
                        children: [
                            flagged && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg animate-pulse",
                                children: "Flagged"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 116,
                                columnNumber: 37
                            }, this),
                            suspicious && !flagged && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "absolute top-4 right-4 bg-amber-500 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg",
                                children: "Suspicious"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 121,
                                columnNumber: 37
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-start gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "w-16 h-16 bg-[var(--secondary)] rounded-2xl flex items-center justify-center font-bold text-2xl text-[var(--primary)] border border-[var(--border)] overflow-hidden shrink-0",
                                        children: user.avatarUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                            src: `${__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].defaults.baseURL?.replace('/api', '')}${user.avatarUrl}`,
                                            alt: "",
                                            className: "w-full h-full object-cover"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 129,
                                            columnNumber: 45
                                        }, this) : user.spiritualName?.[0] || user.karmicName?.[0] || '?'
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 127,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex-1 min-w-0",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                className: "font-bold text-lg truncate",
                                                children: user.spiritualName || user.karmicName
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 135,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-[var(--muted-foreground)] flex items-center gap-1 truncate",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                                        className: "w-3 h-3"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 137,
                                                        columnNumber: 45
                                                    }, this),
                                                    " ",
                                                    user.email
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 136,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-[var(--muted-foreground)] flex items-center gap-1 truncate mt-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                                        className: "w-3 h-3"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 140,
                                                        columnNumber: 45
                                                    }, this),
                                                    " ",
                                                    user.city,
                                                    ", ",
                                                    user.country
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 139,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 134,
                                        columnNumber: 37
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 126,
                                columnNumber: 33
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 flex-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-[var(--secondary)]/50 rounded-2xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] font-bold uppercase text-[var(--muted-foreground)] mb-1",
                                                children: "Tradition & Interest"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 147,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs font-semibold text-[var(--foreground)]",
                                                children: user.madh || 'N/A'
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 148,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] text-[var(--muted-foreground)] mt-1 truncate",
                                                children: user.interests
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 149,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 146,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "p-3 bg-[var(--secondary)]/50 rounded-2xl",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[10px] font-bold uppercase text-[var(--muted-foreground)] mb-1",
                                                children: "Bio"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 152,
                                                columnNumber: 41
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-xs text-[var(--foreground)] line-clamp-3 italic",
                                                children: [
                                                    '"',
                                                    user.bio || 'No bio provided',
                                                    '"'
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 153,
                                                columnNumber: 41
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 151,
                                        columnNumber: 37
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 145,
                                columnNumber: 33
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-2 pt-2 border-t border-[var(--border)]",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setSelectedProfile(user),
                                        className: "flex-1 flex items-center justify-center gap-2 py-2.5 bg-[var(--secondary)] hover:bg-[var(--border)] rounded-xl text-xs font-bold transition-all",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$eye$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Eye$3e$__["Eye"], {
                                                className: "w-4 h-4"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 164,
                                                columnNumber: 41
                                            }, this),
                                            " Full View"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 160,
                                        columnNumber: 37
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleToggleFlag(user.ID, flagged),
                                        disabled: actionLoading === user.ID.toString(),
                                        className: `p-2.5 rounded-xl transition-all ${flagged ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20'}`,
                                        title: flagged ? 'Unflag profile' : 'Flag profile',
                                        children: actionLoading === user.ID.toString() ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                            className: "w-4 h-4 animate-spin"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 174,
                                            columnNumber: 45
                                        }, this) : flagged ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 176,
                                            columnNumber: 45
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flag$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Flag$3e$__["Flag"], {
                                            className: "w-4 h-4"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 178,
                                            columnNumber: 45
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 166,
                                        columnNumber: 37
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 159,
                                columnNumber: 33
                            }, this)
                        ]
                    }, user.ID, true, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 105,
                        columnNumber: 29
                    }, this);
                })
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 99,
                columnNumber: 17
            }, this),
            profiles && profiles.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "p-24 bg-[var(--card)] rounded-3xl border-2 border-dashed border-[var(--border)] text-center",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__["Heart"], {
                        className: "w-16 h-16 text-[var(--muted-foreground)] mx-auto mb-4 opacity-20"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 190,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[var(--muted-foreground)] font-medium",
                        children: "No dating profiles found matching your search."
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 191,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 189,
                columnNumber: 17
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                children: selectedProfile && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm",
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].div, {
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
                        className: "bg-[var(--card)] w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-[var(--border)]",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "relative h-48 bg-gradient-to-r from-pink-500 to-indigo-600",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>setSelectedProfile(null),
                                        className: "absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-all",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                            className: "w-5 h-5 rotate-45"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 210,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 206,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "absolute -bottom-12 left-8 p-1 bg-[var(--card)] rounded-3xl border-4 border-[var(--card)]",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "w-24 h-24 bg-[var(--secondary)] rounded-2xl flex items-center justify-center text-4xl overflow-hidden",
                                            children: selectedProfile.avatarUrl ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("img", {
                                                src: `${__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].defaults.baseURL?.replace('/api', '')}${selectedProfile.avatarUrl}`,
                                                alt: "",
                                                className: "w-full h-full object-cover"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 215,
                                                columnNumber: 45
                                            }, this) : '👤'
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 213,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 212,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 205,
                                columnNumber: 29
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "pt-16 p-8 space-y-6",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "flex items-center gap-3",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                                        className: "text-2xl font-bold",
                                                        children: selectedProfile.spiritualName || selectedProfile.karmicName
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 223,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "px-2 py-1 bg-[var(--secondary)] rounded-lg text-[10px] uppercase font-bold text-[var(--muted-foreground)]",
                                                        children: selectedProfile.gender
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 224,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 222,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "text-[var(--muted-foreground)] flex items-center gap-2 mt-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                                        className: "w-4 h-4"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 229,
                                                        columnNumber: 41
                                                    }, this),
                                                    " ",
                                                    selectedProfile.email
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 228,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 221,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "grid grid-cols-2 gap-4",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs font-bold text-pink-500 uppercase mb-1",
                                                        children: "Astro"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 235,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "space-y-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm",
                                                                children: [
                                                                    "📅 ",
                                                                    selectedProfile.dob || 'Not set'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                                lineNumber: 237,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm",
                                                                children: [
                                                                    "🕒 ",
                                                                    selectedProfile.birthTime || 'Not set'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                                lineNumber: 238,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-[var(--muted-foreground)] truncate",
                                                                children: [
                                                                    "📍 ",
                                                                    selectedProfile.birthPlaceLink || 'Not set'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                                lineNumber: 239,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 236,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 234,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "p-4 bg-[var(--secondary)]/30 rounded-2xl border border-[var(--border)]",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs font-bold text-indigo-500 uppercase mb-1",
                                                        children: "Lifestyle"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 243,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "space-y-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm",
                                                                children: [
                                                                    "🌱 ",
                                                                    selectedProfile.diet || 'N/A'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                                lineNumber: 245,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-sm",
                                                                children: [
                                                                    "☸️ ",
                                                                    selectedProfile.madh || 'N/A'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                                lineNumber: 246,
                                                                columnNumber: 45
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "text-xs text-[var(--muted-foreground)] truncate",
                                                                children: [
                                                                    "💍 ",
                                                                    selectedProfile.maritalStatus || 'N/A'
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                                lineNumber: 247,
                                                                columnNumber: 45
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 244,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 242,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 233,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "text-xs font-bold uppercase text-[var(--muted-foreground)]",
                                                        children: "About Me"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 254,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: `p-4 rounded-2xl border ${isSuspicious(selectedProfile.bio) ? 'bg-amber-50 border-amber-200' : 'bg-[var(--secondary)]/20 border-[var(--border)]'}`,
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm leading-relaxed",
                                                            children: selectedProfile.bio
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                                            lineNumber: 256,
                                                            columnNumber: 45
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 255,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 253,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "space-y-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                        className: "text-xs font-bold uppercase text-[var(--muted-foreground)]",
                                                        children: "Looking For"
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 260,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "p-4 bg-[var(--secondary)]/20 rounded-2xl border border-[var(--border)]",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm leading-relaxed",
                                                            children: selectedProfile.lookingFor
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                                            lineNumber: 262,
                                                            columnNumber: 45
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                                        lineNumber: 261,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                                lineNumber: 259,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 252,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "pt-4 flex gap-3",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                            onClick: ()=>handleToggleFlag(selectedProfile.ID, selectedProfile.isFlagged),
                                            className: `flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-all shadow-lg ${selectedProfile.isFlagged ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`,
                                            children: [
                                                selectedProfile.isFlagged ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckCircle2$3e$__["CheckCircle2"], {
                                                    className: "w-5 h-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/admin/src/app/dating/page.tsx",
                                                    lineNumber: 273,
                                                    columnNumber: 70
                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldAlert$3e$__["ShieldAlert"], {
                                                    className: "w-5 h-5"
                                                }, void 0, false, {
                                                    fileName: "[project]/admin/src/app/dating/page.tsx",
                                                    lineNumber: 273,
                                                    columnNumber: 109
                                                }, this),
                                                selectedProfile.isFlagged ? 'Looks Good (Unflag)' : 'Flag as Inappropriate'
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/admin/src/app/dating/page.tsx",
                                            lineNumber: 268,
                                            columnNumber: 37
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/dating/page.tsx",
                                        lineNumber: 267,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/dating/page.tsx",
                                lineNumber: 220,
                                columnNumber: 29
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/dating/page.tsx",
                        lineNumber: 199,
                        columnNumber: 25
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dating/page.tsx",
                    lineNumber: 198,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dating/page.tsx",
                lineNumber: 196,
                columnNumber: 13
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/admin/src/app/dating/page.tsx",
        lineNumber: 60,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__f3acc140._.js.map