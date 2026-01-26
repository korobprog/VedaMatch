'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    Settings,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    UserCircle,
    Sparkles,
    Heart,
    MessageSquare,
    Key,
    ShoppingBag,
    Route,
    Newspaper,
    GraduationCap,
    Library,
    MapPin,
    Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Users, label: 'Users', path: '/users' },
    { icon: Music, label: 'Multimedia Hub', path: '/multimedia' },
    { icon: Heart, label: 'Dating', path: '/dating' },
    { icon: ShoppingBag, label: 'Ads', path: '/ads' },
    { icon: MapPin, label: 'Map', path: '/map' },
    { icon: Newspaper, label: 'News', path: '/news' },
    { icon: GraduationCap, label: 'Education', path: '/education' },
    { icon: Library, label: 'Knowledge Base', path: '/library' },
    { icon: Sparkles, label: 'AI Models', path: '/ai-models' },
    { icon: Route, label: 'Polza AI', path: '/polza' },
    { icon: MessageSquare, label: 'AI Prompts', path: '/ai-prompts' },
    { icon: ShieldAlert, label: 'Admin Management', path: '/admins' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [admin, setAdmin] = useState<any>(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const data = localStorage.getItem('admin_data');
        if (!data) {
            if (pathname !== '/login' && pathname !== '/' && pathname !== '/register') {
                router.push('/login');
            }
        } else {
            const parsedData = JSON.parse(data);
            setAdmin(parsedData);

            // Protect admin routes
            const isAdmin = parsedData.role === 'admin' || parsedData.role === 'superadmin';

            // List of routes that are EXCLUSIVELY for admins
            const exclusiveAdminRoutes = [
                '/dashboard',
                '/users',
                '/admins',
                '/settings',
                '/polza',
                '/ai-prompts',
                '/multimedia'
            ];

            if (!isAdmin && exclusiveAdminRoutes.some(route => pathname.startsWith(route))) {
                router.push('/');
            }
        }
    }, [pathname, router]);

    const handleLogout = () => {
        localStorage.removeItem('admin_data');
        router.push('/login');
    };

    const isPublicRoute = pathname === '/login' || pathname === '/' || pathname === '/register' || pathname === '/admin-login';
    const isUserDashboard = pathname === '/user/dashboard';

    // Shared routes that both admins and users can access, but with different layouts
    const sharedRoutes = ['/library', '/dating', '/ads', '/map', '/news', '/education', '/ai-models', '/contacts', '/chat', '/calls', '/shops'];
    const isSharedRoute = sharedRoutes.some(route => pathname.startsWith(route));

    // For regular users, we don't want the admin sidebar/layout on dashboard and shared portal routes
    const isAdmin = admin?.role === 'admin' || admin?.role === 'superadmin';

    if (isPublicRoute || isUserDashboard || (!isAdmin && isSharedRoute)) return <>{children}</>;

    return (
        <div className="min-h-screen bg-[var(--background)] flex">
            {/* Sidebar - Desktop */}
            {isAdmin && (
                <aside
                    className={`hidden md:flex flex-col border-r border-[var(--border)] bg-[var(--card)] transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'
                        }`}
                >
                    <div className="p-6 flex items-center gap-3">
                        <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center shrink-0">
                            <ShieldAlert className="w-5 h-5 text-white" />
                        </div>
                        {isSidebarOpen && <span className="font-bold text-xl tracking-tight">VedicAI</span>}
                    </div>

                    <nav className="flex-1 px-3 space-y-1">
                        {menuItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all ${pathname === item.path
                                    ? 'bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary)]/20'
                                    : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)] hover:text-[var(--foreground)]'
                                    }`}
                            >
                                <item.icon className="w-5 h-5 shrink-0" />
                                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                            </button>
                        ))}
                    </nav>

                    <div className="p-4 border-t border-[var(--border)]">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 cursor-pointer transition-all font-medium"
                        >
                            <LogOut className="w-5 h-5 shrink-0" />
                            {isSidebarOpen && <span>Logout</span>}
                        </button>
                    </div>
                </aside>
            )}

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-4 md:px-8">
                    <div className="flex items-center gap-4">
                        {isAdmin && (
                            <>
                                <button
                                    className="md:hidden p-2 hover:bg-[var(--secondary)] rounded-lg"
                                    onClick={() => setIsMobileMenuOpen(true)}
                                >
                                    <Menu className="w-6 h-6" />
                                </button>
                                <button
                                    className="hidden md:p-2 hover:bg-[var(--secondary)] rounded-lg"
                                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                >
                                    {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                                </button>
                            </>
                        )}
                        <div className="relative hidden sm:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                            <input
                                type="text"
                                placeholder="Search anything..."
                                className="bg-[var(--secondary)] border-none rounded-full py-2 pl-10 pr-4 w-64 text-sm focus:ring-2 focus:ring-[var(--primary)]/20 outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <button className="relative p-2 hover:bg-[var(--secondary)] rounded-full cursor-pointer transition-all">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--card)]"></span>
                        </button>
                        <div className="flex items-center gap-3 pl-3 border-l border-[var(--border)]">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-semibold leading-none">{admin?.spiritualName || 'Admin'}</p>
                                <p className="text-xs text-[var(--muted-foreground)] mt-1">{admin?.role?.toUpperCase()}</p>
                            </div>
                            <div className="w-10 h-10 bg-[var(--secondary)] rounded-full flex items-center justify-center border border-[var(--border)]">
                                <UserCircle className="w-6 h-6 text-[var(--muted-foreground)]" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-4 md:p-8">
                    {children}
                </div>
            </main>

            {/* Mobile Menu Overlay */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '-100%' }}
                            className="fixed inset-y-0 left-0 w-72 bg-[var(--card)] z-50 md:hidden shadow-2xl flex flex-col"
                        >
                            <div className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
                                        <ShieldAlert className="w-5 h-5 text-white" />
                                    </div>
                                    <span className="font-bold text-xl">VedicAI</span>
                                </div>
                                <button
                                    className="p-2 hover:bg-[var(--secondary)] rounded-lg"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <nav className="flex-1 px-4 space-y-2 mt-4">
                                {menuItems.map((item) => (
                                    <button
                                        key={item.path}
                                        onClick={() => {
                                            router.push(item.path);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl cursor-pointer transition-all ${pathname === item.path
                                            ? 'bg-[var(--primary)] text-white'
                                            : 'text-[var(--muted-foreground)] hover:bg-[var(--secondary)]'
                                            }`}
                                    >
                                        <item.icon className="w-6 h-6" />
                                        <span className="font-medium text-lg">{item.label}</span>
                                    </button>
                                ))}
                            </nav>
                            <div className="p-6 border-t border-[var(--border)]">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-red-500 hover:bg-red-50 font-medium text-lg"
                                >
                                    <LogOut className="w-6 h-6" />
                                    <span>Logout</span>
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
