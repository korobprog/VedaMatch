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
"[project]/admin/src/app/dashboard/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>DashboardPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/next@16.1.1-canary.5_babel-plugin-react-compiler@1.0.0_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/next/dist/compiled/react/compiler-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/swr@2.3.8_react@19.0.0-rc.1/node_modules/swr/dist/index/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/framer-motion@12.23.26_react-dom@19.0.0-rc.1_react@19.0.0-rc.1__react@19.0.0-rc.1/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/users.js [app-client] (ecmascript) <export default as Users>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/user-plus.js [app-client] (ecmascript) <export default as UserPlus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserMinus$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/user-minus.js [app-client] (ecmascript) <export default as UserMinus>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/shield-check.js [app-client] (ecmascript) <export default as ShieldCheck>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/trending-up.js [app-client] (ecmascript) <export default as TrendingUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/activity.js [app-client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpRight$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/arrow-up-right.js [app-client] (ecmascript) <export default as ArrowUpRight>");
var __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownRight$3e$__ = __turbopack_context__.i("[project]/admin/node_modules/.pnpm/lucide-react@0.562.0_react@19.0.0-rc.1/node_modules/lucide-react/dist/esm/icons/arrow-down-right.js [app-client] (ecmascript) <export default as ArrowDownRight>");
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
function DashboardPage() {
    _s();
    const $ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$compiler$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["c"])(25);
    if ($[0] !== "1cb481a1003a1405e6265547b0fd71f18d074ee6a4317f2ea9f43880e45ea5f2") {
        for(let $i = 0; $i < 25; $i += 1){
            $[$i] = Symbol.for("react.memo_cache_sentinel");
        }
        $[0] = "1cb481a1003a1405e6265547b0fd71f18d074ee6a4317f2ea9f43880e45ea5f2";
    }
    const { data: stats } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"])("/admin/stats", fetcher);
    const t0 = stats?.totalUsers || 0;
    let t1;
    if ($[1] !== t0) {
        t1 = {
            label: "Total Users",
            value: t0,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$users$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Users$3e$__["Users"],
            color: "bg-blue-500",
            trend: "+12%",
            isUp: true
        };
        $[1] = t0;
        $[2] = t1;
    } else {
        t1 = $[2];
    }
    const t2 = stats?.activeUsers || 0;
    let t3;
    if ($[3] !== t2) {
        t3 = {
            label: "Active Users",
            value: t2,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"],
            color: "bg-emerald-500",
            trend: "+5%",
            isUp: true
        };
        $[3] = t2;
        $[4] = t3;
    } else {
        t3 = $[4];
    }
    const t4 = stats?.blockedUsers || 0;
    let t5;
    if ($[5] !== t4) {
        t5 = {
            label: "Blocked Users",
            value: t4,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$minus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserMinus$3e$__["UserMinus"],
            color: "bg-red-500",
            trend: "-2%",
            isUp: false
        };
        $[5] = t4;
        $[6] = t5;
    } else {
        t5 = $[6];
    }
    const t6 = stats?.admins || 0;
    let t7;
    if ($[7] !== t6) {
        t7 = {
            label: "Administrators",
            value: t6,
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"],
            color: "bg-purple-500",
            trend: "0%",
            isUp: true
        };
        $[7] = t6;
        $[8] = t7;
    } else {
        t7 = $[8];
    }
    let t8;
    if ($[9] !== t1 || $[10] !== t3 || $[11] !== t5 || $[12] !== t7) {
        t8 = [
            t1,
            t3,
            t5,
            t7
        ];
        $[9] = t1;
        $[10] = t3;
        $[11] = t5;
        $[12] = t7;
        $[13] = t8;
    } else {
        t8 = $[13];
    }
    const cards = t8;
    let t9;
    if ($[14] === Symbol.for("react.memo_cache_sentinel")) {
        t9 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                    className: "text-3xl font-bold tracking-tight",
                    children: "Overview"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 99,
                    columnNumber: 15
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-[var(--muted-foreground)] mt-2",
                    children: "Welcome back! Here's what's happening today."
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 99,
                    columnNumber: 78
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 99,
            columnNumber: 10
        }, this);
        $[14] = t9;
    } else {
        t9 = $[14];
    }
    let t10;
    if ($[15] !== cards) {
        t10 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6",
            children: cards.map(_DashboardPageCardsMap)
        }, void 0, false, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 106,
            columnNumber: 11
        }, this);
        $[15] = cards;
        $[16] = t10;
    } else {
        t10 = $[16];
    }
    let t11;
    if ($[17] === Symbol.for("react.memo_cache_sentinel")) {
        t11 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                    className: "text-xl font-bold",
                    children: "User Growth"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 114,
                    columnNumber: 16
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                    className: "text-sm text-[var(--muted-foreground)]",
                    children: "System activity over the last 30 days"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 114,
                    columnNumber: 66
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 114,
            columnNumber: 11
        }, this);
        $[17] = t11;
    } else {
        t11 = $[17];
    }
    let t12;
    if ($[18] === Symbol.for("react.memo_cache_sentinel")) {
        t12 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "flex items-center justify-between mb-8",
            children: [
                t11,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                    className: "bg-[var(--secondary)] border-none rounded-lg text-sm px-3 py-2 outline-none",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            children: "Last 7 days"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 121,
                            columnNumber: 168
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            children: "Last 30 days"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 121,
                            columnNumber: 196
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                            children: "Last 12 months"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 121,
                            columnNumber: 225
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 121,
                    columnNumber: 72
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 121,
            columnNumber: 11
        }, this);
        $[18] = t12;
    } else {
        t12 = $[18];
    }
    let t13;
    if ($[19] === Symbol.for("react.memo_cache_sentinel")) {
        t13 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "h-64 flex items-end gap-2 px-2",
            children: [
                40,
                70,
                45,
                90,
                65,
                80,
                50,
                95,
                75,
                60,
                85,
                45
            ].map(_DashboardPageAnonymous)
        }, void 0, false, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 128,
            columnNumber: 11
        }, this);
        $[19] = t13;
    } else {
        t13 = $[19];
    }
    let t14;
    if ($[20] === Symbol.for("react.memo_cache_sentinel")) {
        t14 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "lg:col-span-2 bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm",
            children: [
                t12,
                t13,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex justify-between mt-4 text-xs text-[var(--muted-foreground)] px-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Jan"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 135,
                            columnNumber: 212
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Mar"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 135,
                            columnNumber: 228
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "May"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 135,
                            columnNumber: 244
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Jul"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 135,
                            columnNumber: 260
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Sep"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 135,
                            columnNumber: 276
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                            children: "Nov"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 135,
                            columnNumber: 292
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 135,
                    columnNumber: 125
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 135,
            columnNumber: 11
        }, this);
        $[20] = t14;
    } else {
        t14 = $[20];
    }
    let t15;
    if ($[21] === Symbol.for("react.memo_cache_sentinel")) {
        t15 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
            className: "text-xl font-bold mb-6",
            children: "Recent Activity"
        }, void 0, false, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 142,
            columnNumber: 11
        }, this);
        $[21] = t15;
    } else {
        t15 = $[21];
    }
    let t16;
    if ($[22] === Symbol.for("react.memo_cache_sentinel")) {
        t16 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "grid grid-cols-1 lg:grid-cols-3 gap-8",
            children: [
                t14,
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "bg-[var(--card)] p-8 rounded-3xl border border-[var(--border)] shadow-sm",
                    children: [
                        t15,
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            className: "space-y-6",
                            children: [
                                {
                                    user: "Bhakta John",
                                    action: "Registered",
                                    time: "2m ago",
                                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$user$2d$plus$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__UserPlus$3e$__["UserPlus"],
                                    color: "text-blue-500"
                                },
                                {
                                    user: "Admin Rama",
                                    action: "Blocked user #432",
                                    time: "45m ago",
                                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$shield$2d$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ShieldCheck$3e$__["ShieldCheck"],
                                    color: "text-purple-500"
                                },
                                {
                                    user: "Krishna Das",
                                    action: "Updated profile",
                                    time: "2h ago",
                                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$trending$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__TrendingUp$3e$__["TrendingUp"],
                                    color: "text-emerald-500"
                                },
                                {
                                    user: "System",
                                    action: "Database backup",
                                    time: "5h ago",
                                    icon: __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"],
                                    color: "text-orange-500"
                                }
                            ].map(_DashboardPageAnonymous2)
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 149,
                            columnNumber: 166
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                            className: "w-full mt-8 py-3 rounded-xl border border-[var(--border)] text-sm font-medium hover:bg-[var(--secondary)] transition-all",
                            children: "View All Logs"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 173,
                            columnNumber: 50
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 149,
                    columnNumber: 71
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 149,
            columnNumber: 11
        }, this);
        $[22] = t16;
    } else {
        t16 = $[22];
    }
    let t17;
    if ($[23] !== t10) {
        t17 = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "space-y-8",
            children: [
                t9,
                t10,
                t16
            ]
        }, void 0, true, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 180,
            columnNumber: 11
        }, this);
        $[23] = t10;
        $[24] = t17;
    } else {
        t17 = $[24];
    }
    return t17;
}
_s(DashboardPage, "55FJmD8xBBA0sKWZYJ/96mNEwJ0=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$swr$40$2$2e$3$2e$8_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$swr$2f$dist$2f$index$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["default"]
    ];
});
_c = DashboardPage;
function _DashboardPageAnonymous2(item, i_0) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex gap-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: `w-10 h-10 rounded-full bg-[var(--secondary)] flex items-center justify-center shrink-0 ${item.color}`,
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(item.icon, {
                    className: "w-5 h-5"
                }, void 0, false, {
                    fileName: "[project]/admin/src/app/dashboard/page.tsx",
                    lineNumber: 189,
                    columnNumber: 168
                }, this)
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                lineNumber: 189,
                columnNumber: 48
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-semibold",
                        children: item.user
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dashboard/page.tsx",
                        lineNumber: 189,
                        columnNumber: 212
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-[var(--muted-foreground)]",
                        children: item.action
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dashboard/page.tsx",
                        lineNumber: 189,
                        columnNumber: 264
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-[10px] text-[var(--muted-foreground)] mt-1",
                        children: item.time
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dashboard/page.tsx",
                        lineNumber: 189,
                        columnNumber: 335
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                lineNumber: 189,
                columnNumber: 207
            }, this)
        ]
    }, i_0, true, {
        fileName: "[project]/admin/src/app/dashboard/page.tsx",
        lineNumber: 189,
        columnNumber: 10
    }, this);
}
function _DashboardPageAnonymous(h, i) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            height: 0
        },
        animate: {
            height: `${h}%`
        },
        transition: {
            delay: 0.5 + i * 0.05,
            duration: 1
        },
        className: "flex-1 bg-[var(--primary)]/20 hover:bg-[var(--primary)] rounded-t-lg transition-all relative group",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            className: "absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--foreground)] text-[var(--background)] text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity",
            children: h * 10
        }, void 0, false, {
            fileName: "[project]/admin/src/app/dashboard/page.tsx",
            lineNumber: 199,
            columnNumber: 117
        }, this)
    }, i, false, {
        fileName: "[project]/admin/src/app/dashboard/page.tsx",
        lineNumber: 192,
        columnNumber: 10
    }, this);
}
function _DashboardPageCardsMap(card, idx) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$framer$2d$motion$40$12$2e$23$2e$26_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].div, {
        initial: {
            opacity: 0,
            y: 20
        },
        animate: {
            opacity: 1,
            y: 0
        },
        transition: {
            delay: idx * 0.1
        },
        className: "bg-[var(--card)] p-6 rounded-2xl border border-[var(--border)] shadow-sm hover:shadow-md transition-all group",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex justify-between items-start mb-4",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `p-3 rounded-xl ${card.color} bg-opacity-10 text-${card.color.split("-")[1]}-500 group-hover:scale-110 transition-transform`,
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(card.icon, {
                            className: "w-6 h-6"
                        }, void 0, false, {
                            fileName: "[project]/admin/src/app/dashboard/page.tsx",
                            lineNumber: 210,
                            columnNumber: 325
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/admin/src/app/dashboard/page.tsx",
                        lineNumber: 210,
                        columnNumber: 183
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: `flex items-center gap-1 text-xs font-medium ${card.isUp ? "text-emerald-500" : "text-red-500"} bg-opacity-10 py-1 px-2 rounded-full`,
                        children: [
                            card.isUp ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUpRight$3e$__["ArrowUpRight"], {
                                className: "w-3 h-3"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                                lineNumber: 210,
                                columnNumber: 528
                            }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$lucide$2d$react$40$0$2e$562$2e$0_react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2d$right$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDownRight$3e$__["ArrowDownRight"], {
                                className: "w-3 h-3"
                            }, void 0, false, {
                                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                                lineNumber: 210,
                                columnNumber: 567
                            }, this),
                            card.trend
                        ]
                    }, void 0, true, {
                        fileName: "[project]/admin/src/app/dashboard/page.tsx",
                        lineNumber: 210,
                        columnNumber: 364
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                lineNumber: 210,
                columnNumber: 128
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                className: "text-[var(--muted-foreground)] text-sm font-medium",
                children: card.label
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                lineNumber: 210,
                columnNumber: 630
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$admin$2f$node_modules$2f2e$pnpm$2f$next$40$16$2e$1$2e$1$2d$canary$2e$5_babel$2d$plugin$2d$react$2d$compiler$40$1$2e$0$2e$0_react$2d$dom$40$19$2e$0$2e$0$2d$rc$2e$1_react$40$19$2e$0$2e$0$2d$rc$2e$1_$5f$react$40$19$2e$0$2e$0$2d$rc$2e$1$2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-3xl font-bold mt-1 tracking-tight",
                children: card.value
            }, void 0, false, {
                fileName: "[project]/admin/src/app/dashboard/page.tsx",
                lineNumber: 210,
                columnNumber: 714
            }, this)
        ]
    }, card.label, true, {
        fileName: "[project]/admin/src/app/dashboard/page.tsx",
        lineNumber: 202,
        columnNumber: 10
    }, this);
}
var _c;
__turbopack_context__.k.register(_c, "DashboardPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=admin_src_dbee5cd1._.js.map