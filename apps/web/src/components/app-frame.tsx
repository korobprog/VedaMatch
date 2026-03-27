"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session-context";

const links = [
  { href: "/app", label: "Overview" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/contacts", label: "Contacts" },
  { href: "/app/chats", label: "Chats" },
  { href: "/app/library", label: "Library" },
  { href: "/app/news", label: "News" },
  { href: "/app/services", label: "Services" },
  { href: "/app/travel", label: "Travel" },
  { href: "/app/support", label: "Support" },
  { href: "/app/wallet", label: "Wallet" },
] as const;

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, ready, session, logout, setLanguage } = useSession();

  useEffect(() => {
    if (ready && !session?.accessToken) {
      router.replace("/login");
    }
  }, [ready, router, session?.accessToken]);

  if (!ready) {
    return (
      <main className="shell">
        <div className="container" style={{ padding: "72px 0" }}>
          <div className="panel page-card">
            <h1>Loading web session</h1>
            <p className="muted">Restoring browser auth state and shared settings.</p>
          </div>
        </div>
      </main>
    );
  }

  if (!session?.accessToken) {
    return null;
  }

  return (
    <main className="shell">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
        <div className="panel" style={{ marginBottom: 20 }}>
          <div className="panel-inner stack" style={{ gap: 18 }}>
            <div className="split" style={{ alignItems: "center" }}>
              <div>
                <span className="eyebrow">Authenticated shell</span>
                <h1 style={{ marginBottom: 8 }}>VedaMatch Web</h1>
                <p className="muted">
                  Browser-native entrypoint for profile, social core, content, support, and wallet routing.
                </p>
              </div>
              <div className="actions" style={{ alignItems: "center" }}>
                <Link className="button-secondary" href="/">
                  Public home
                </Link>
                <select
                  aria-label="Language"
                  className="select"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  <option value="en">EN</option>
                  <option value="ru">RU</option>
                  <option value="hi">HI</option>
                </select>
                <button className="button" onClick={() => void logout()} type="button">
                  Log out
                </button>
              </div>
            </div>
            <nav className="nav-grid">
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={active ? "nav-chip active" : "nav-chip"}
                    href={link.href}
                    key={link.href}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        <div className="stack">{children}</div>
      </div>
    </main>
  );
}
