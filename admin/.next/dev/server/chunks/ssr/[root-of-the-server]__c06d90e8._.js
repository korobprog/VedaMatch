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
// Функция для определения baseURL
const getBaseURL = ()=>{
    // Если переменная окружения установлена, используем её
    if ("TURBOPACK compile-time truthy", 1) {
        return "TURBOPACK compile-time value", "http://localhost:8081/api";
    }
    //TURBOPACK unreachable
    ;
};
const api = __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$axios$40$1$2e$13$2e$2$2f$node_modules$2f$axios$2f$lib$2f$axios$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].create({
    baseURL: getBaseURL()
});
// Add a request interceptor to add the auth headers if needed
api.interceptors.request.use((config)=>{
    if ("TURBOPACK compile-time falsy", 0) //TURBOPACK unreachable
    ;
    return config;
});
const __TURBOPACK__default__export__ = api;
}),
"[project]/admin/src/app/users/page.tsx [app-ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>UsersPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react-jsx-dev-runtime.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/server/route-modules/app-page/vendored/ssr/react.js [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/swr@2.3.8_react@19.0.0-rc.1/node_modules/swr/dist/index/index.mjs [app-ssr] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_reac_3dd7e88324880d54d5ee19f5b48be478/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_reac_3dd7e88324880d54d5ee19f5b48be478/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/search.js [app-ssr] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserX$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/user-x.js [app-ssr] (ecmascript) <export default as UserX>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/user-check.js [app-ssr] (ecmascript) <export default as UserCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/mail.js [app-ssr] (ecmascript) <export default as Mail>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/map-pin.js [app-ssr] (ecmascript) <export default as MapPin>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-ssr] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/circle-alert.js [app-ssr] (ecmascript) <export default as AlertCircle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flag$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Flag$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/flag.js [app-ssr] (ecmascript) <export default as Flag>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/heart.js [app-ssr] (ecmascript) <export default as Heart>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/src/lib/api.ts [app-ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-_97ac69f6cbe3ec58554d7688bfd8505e/node_modules/next/dist/client/app-dir/link.js [app-ssr] (ecmascript)");
'use client';
;
;
;
;
;
;
;
const fetcher = (url)=>__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].get(url).then((res)=>res.data);
function UsersPage() {
    const [search, setSearch] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [role, setRole] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [status, setStatus] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])('');
    const [actionLoading, setActionLoading] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["useState"])(null);
    const { data: users, error, mutate } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])(`/admin/users?search=${search}&role=${role}&status=${status}`, fetcher);
    const handleToggleBlock = async (userId, isBlocked)=>{
        setActionLoading(userId.toString());
        try {
            await __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].post(`/admin/users/${userId}/toggle-block`);
            mutate(); // Refresh data
        } catch (err) {
            console.error('Failed to toggle block status', err);
        } finally{
            setActionLoading(null);
        }
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-6",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col md:flex-row md:items-center justify-between gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                                className: "text-3xl font-bold tracking-tight",
                                children: "Users"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 52,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-[var(--muted-foreground)] mt-1",
                                children: "Manage and monitor all system users"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 53,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 51,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-3",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "px-4 py-2 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full text-sm font-semibold border border-[var(--primary)]/20",
                            children: [
                                users?.length || 0,
                                " Total"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/users/page.tsx",
                            lineNumber: 56,
                            columnNumber: 21
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 55,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/users/page.tsx",
                lineNumber: 50,
                columnNumber: 13
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "bg-[var(--card)] p-4 rounded-2xl border border-[var(--border)] shadow-sm flex flex-col md:flex-row gap-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "relative flex-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 65,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                type: "text",
                                placeholder: "Search by name, email...",
                                value: search,
                                onChange: (e)=>setSearch(e.target.value),
                                className: "w-full bg-[var(--secondary)] border-none rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 66,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 64,
                        columnNumber: 17
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: role,
                                onChange: (e)=>setRole(e.target.value),
                                className: "bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "",
                                        children: "All Roles"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 80,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "user",
                                        children: "Users"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 81,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "admin",
                                        children: "Admins"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 82,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "superadmin",
                                        children: "Super Admins"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 83,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 75,
                                columnNumber: 21
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                value: status,
                                onChange: (e)=>setStatus(e.target.value),
                                className: "bg-[var(--secondary)] border-none rounded-xl py-2.5 px-4 text-sm outline-none cursor-pointer",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "",
                                        children: "All Status"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 90,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "active",
                                        children: "Active"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 91,
                                        columnNumber: 25
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                        value: "blocked",
                                        children: "Blocked"
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 92,
                                        columnNumber: 25
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 85,
                                columnNumber: 21
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 74,
                        columnNumber: 17
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/users/page.tsx",
                lineNumber: 63,
                columnNumber: 13
            }, this),
            error ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex flex-col items-center justify-center p-12 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/20 text-red-500",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                        className: "w-12 h-12 mb-4"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 99,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "font-semibold",
                        children: "Failed to load users"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 100,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                        onClick: ()=>mutate(),
                        className: "mt-4 text-sm underline",
                        children: "Try again"
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 101,
                        columnNumber: 21
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/users/page.tsx",
                lineNumber: 98,
                columnNumber: 17
            }, this) : !users ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center justify-center p-24",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                    className: "w-8 h-8 animate-spin text-[var(--primary)]"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/users/page.tsx",
                    lineNumber: 105,
                    columnNumber: 21
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/users/page.tsx",
                lineNumber: 104,
                columnNumber: 17
            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "hidden md:block overflow-x-auto",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
                            className: "w-full text-left",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
                                        className: "border-b border-[var(--border)] text-[var(--muted-foreground)] text-xs uppercase tracking-wider",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "User"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 114,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Location"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 115,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Role"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 116,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Dating"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 117,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold",
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 118,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
                                                className: "px-6 py-4 font-semibold text-right",
                                                children: "Actions"
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 119,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 113,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                    lineNumber: 112,
                                    columnNumber: 29
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
                                    className: "divide-y divide-[var(--border)]",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                        children: users.map((user)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_reac_3dd7e88324880d54d5ee19f5b48be478$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["motion"].tr, {
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
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                            className: "flex items-center gap-3",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    className: "w-10 h-10 bg-[var(--secondary)] rounded-full flex items-center justify-center font-bold text-[var(--primary)] border border-[var(--border)]",
                                                                    children: user.spiritualName?.[0] || user.karmicName?.[0] || '?'
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 134,
                                                                    columnNumber: 53
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                    children: [
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "font-semibold text-sm",
                                                                            children: user.spiritualName || user.karmicName || 'Anonymous'
                                                                        }, void 0, false, {
                                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                                            lineNumber: 138,
                                                                            columnNumber: 57
                                                                        }, this),
                                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                            className: "text-xs text-[var(--muted-foreground)] flex items-center gap-1",
                                                                            children: [
                                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$mail$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Mail$3e$__["Mail"], {
                                                                                    className: "w-3 h-3"
                                                                                }, void 0, false, {
                                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                                    lineNumber: 140,
                                                                                    columnNumber: 61
                                                                                }, this),
                                                                                " ",
                                                                                user.email
                                                                            ]
                                                                        }, void 0, true, {
                                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                                            lineNumber: 139,
                                                                            columnNumber: 57
                                                                        }, this)
                                                                    ]
                                                                }, void 0, true, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 137,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 133,
                                                            columnNumber: 49
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 132,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "text-sm flex items-center gap-1",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$map$2d$pin$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__MapPin$3e$__["MapPin"], {
                                                                    className: "w-3 h-3 text-[var(--muted-foreground)]"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 147,
                                                                    columnNumber: 53
                                                                }, this),
                                                                user.city || 'Unknown',
                                                                ", ",
                                                                user.country || 'N/A'
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 146,
                                                            columnNumber: 49
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 145,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                                            value: user.role,
                                                            onChange: (e)=>{
                                                                const newRole = e.target.value;
                                                                __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$src$2f$lib$2f$api$2e$ts__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"].put(`/admin/users/${user.ID}/role`, {
                                                                    role: newRole
                                                                }).then(()=>mutate());
                                                            },
                                                            disabled: user.role === 'superadmin',
                                                            className: `text-[10px] font-bold uppercase py-1 px-2 rounded-lg border bg-transparent outline-none cursor-pointer ${user.role === 'superadmin' ? 'text-purple-600 border-purple-200' : user.role === 'admin' ? 'text-blue-600 border-blue-200' : 'text-gray-600 border-gray-200'}`,
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "user",
                                                                    children: "User"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 164,
                                                                    columnNumber: 53
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "admin",
                                                                    children: "Admin"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 165,
                                                                    columnNumber: 53
                                                                }, this),
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                                    value: "superadmin",
                                                                    children: "Super Admin"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 166,
                                                                    columnNumber: 53
                                                                }, this)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 152,
                                                            columnNumber: 49
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 151,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: user.datingEnabled ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                            href: `/dating?search=${user.email}`,
                                                            className: `flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg transition-all ${user.isFlagged ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-pink-50 text-pink-600 hover:bg-pink-100'}`,
                                                            children: [
                                                                user.isFlagged ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$flag$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Flag$3e$__["Flag"], {
                                                                    className: "w-3.5 h-3.5"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 176,
                                                                    columnNumber: 75
                                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$heart$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Heart$3e$__["Heart"], {
                                                                    className: "w-3.5 h-3.5"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 176,
                                                                    columnNumber: 110
                                                                }, this),
                                                                user.isFlagged ? 'Flagged' : 'Profile'
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 171,
                                                            columnNumber: 53
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "text-[10px] text-[var(--muted-foreground)] uppercase",
                                                            children: "Not Active"
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 180,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 169,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4",
                                                        children: user.isBlocked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "flex items-center gap-1 text-xs text-red-500 font-medium",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$circle$2d$alert$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertCircle$3e$__["AlertCircle"], {
                                                                    className: "w-3 h-3"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 186,
                                                                    columnNumber: 57
                                                                }, this),
                                                                " Blocked"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 185,
                                                            columnNumber: 53
                                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "flex items-center gap-1 text-xs text-emerald-500 font-medium",
                                                            children: [
                                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"], {
                                                                    className: "w-3 h-3"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                                                    lineNumber: 190,
                                                                    columnNumber: 57
                                                                }, this),
                                                                " Active"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 189,
                                                            columnNumber: 53
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 45
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
                                                        className: "px-6 py-4 text-right",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                            onClick: ()=>handleToggleBlock(user.ID, user.isBlocked),
                                                            disabled: actionLoading === user.ID.toString() || user.role === 'superadmin',
                                                            className: `p-2 rounded-lg transition-all ${user.isBlocked ? 'text-emerald-500 hover:bg-emerald-50' : 'text-red-500 hover:bg-red-50'} disabled:opacity-30 disabled:cursor-not-allowed`,
                                                            title: user.isBlocked ? 'Unblock user' : 'Block user',
                                                            children: actionLoading === user.ID.toString() ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                                                                className: "w-5 h-5 animate-spin"
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                                lineNumber: 205,
                                                                columnNumber: 57
                                                            }, this) : user.isBlocked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"], {
                                                                className: "w-5 h-5"
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                                lineNumber: 207,
                                                                columnNumber: 57
                                                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserX$3e$__["UserX"], {
                                                                className: "w-5 h-5"
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                                lineNumber: 209,
                                                                columnNumber: 57
                                                            }, this)
                                                        }, void 0, false, {
                                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                                            lineNumber: 195,
                                                            columnNumber: 49
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 194,
                                                        columnNumber: 45
                                                    }, this)
                                                ]
                                            }, user.ID, true, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 125,
                                                columnNumber: 41
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 123,
                                        columnNumber: 33
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/admin/src/app/users/page.tsx",
                                    lineNumber: 122,
                                    columnNumber: 29
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/admin/src/app/users/page.tsx",
                            lineNumber: 111,
                            columnNumber: 25
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 110,
                        columnNumber: 21
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "md:hidden divide-y divide-[var(--border)]",
                        children: users.map((user)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "p-4 flex items-center justify-between gap-4",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex items-center gap-3",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "w-12 h-12 bg-[var(--secondary)] rounded-2xl flex items-center justify-center font-bold text-[var(--primary)] border border-[var(--border)]",
                                                children: user.spiritualName?.[0] || user.karmicName?.[0] || '?'
                                            }, void 0, false, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 225,
                                                columnNumber: 37
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                                        className: "font-semibold",
                                                        children: user.spiritualName || user.karmicName
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 229,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-xs text-[var(--muted-foreground)]",
                                                        children: user.email
                                                    }, void 0, false, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 230,
                                                        columnNumber: 41
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2 mt-1",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-[10px] font-bold uppercase py-0.5 px-1.5 bg-[var(--secondary)] rounded-md",
                                                                children: user.role
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                                lineNumber: 232,
                                                                columnNumber: 45
                                                            }, this),
                                                            user.isBlocked && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "text-[10px] font-bold text-red-500 uppercase",
                                                                children: "Blocked"
                                                            }, void 0, false, {
                                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                                lineNumber: 236,
                                                                columnNumber: 49
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                                        lineNumber: 231,
                                                        columnNumber: 41
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/admin/src/app/users/page.tsx",
                                                lineNumber: 228,
                                                columnNumber: 37
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 224,
                                        columnNumber: 33
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        onClick: ()=>handleToggleBlock(user.ID, user.isBlocked),
                                        disabled: actionLoading === user.ID.toString() || user.role === 'superadmin',
                                        className: `p-3 rounded-xl ${user.isBlocked ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'} disabled:opacity-30`,
                                        children: user.isBlocked ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$check$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserCheck$3e$__["UserCheck"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                            lineNumber: 247,
                                            columnNumber: 55
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$x$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__$3c$export__default__as__UserX$3e$__["UserX"], {
                                            className: "w-5 h-5"
                                        }, void 0, false, {
                                            fileName: "[project]/admin/src/app/users/page.tsx",
                                            lineNumber: 247,
                                            columnNumber: 91
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/admin/src/app/users/page.tsx",
                                        lineNumber: 241,
                                        columnNumber: 33
                                    }, this)
                                ]
                            }, user.ID, true, {
                                fileName: "[project]/admin/src/app/users/page.tsx",
                                lineNumber: 223,
                                columnNumber: 29
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 221,
                        columnNumber: 21
                    }, this),
                    users.length === 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$_97ac69f6cbe3ec58554d7688bfd8505e$2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$ssr$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$ssr$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "p-12 text-center text-[var(--muted-foreground)]",
                        children: "No users found matching your filters."
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/users/page.tsx",
                        lineNumber: 254,
                        columnNumber: 25
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/users/page.tsx",
                lineNumber: 108,
                columnNumber: 17
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/admin/src/app/users/page.tsx",
        lineNumber: 49,
        columnNumber: 9
    }, this);
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__c06d90e8._.js.map