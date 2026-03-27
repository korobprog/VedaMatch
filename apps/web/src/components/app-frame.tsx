"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/session-context";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dictionary, language, ready, session, logout, setLanguage } = useSession();

  const links = [
    { href: "/app", label: dictionary.nav.portal },
    { href: "/app/profile", label: dictionary.nav.profile },
    { href: "/app/contacts", label: dictionary.nav.contacts },
    { href: "/app/chats", label: dictionary.nav.chats },
    { href: "/app/library", label: dictionary.nav.library },
    { href: "/app/news", label: dictionary.nav.news },
    { href: "/app/services", label: dictionary.nav.services },
    { href: "/app/travel", label: dictionary.nav.travel },
    { href: "/app/support", label: dictionary.nav.support },
    { href: "/app/wallet", label: dictionary.nav.wallet },
  ] as const;

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
            <h1>{dictionary.portal.loadingTitle}</h1>
            <p className="muted">{dictionary.portal.loadingSubtitle}</p>
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
                <span className="eyebrow">{dictionary.portal.shellEyebrow}</span>
                <h1 style={{ marginBottom: 8 }}>{dictionary.portal.shellTitle}</h1>
                <p className="muted">{dictionary.portal.shellSubtitle}</p>
              </div>
              <div className="actions" style={{ alignItems: "center" }}>
                <Link className="button-secondary" href="/">
                  {dictionary.portal.publicHome}
                </Link>
                <select
                  aria-label={dictionary.languageLabel}
                  className="select"
                  onChange={(event) => setLanguage(event.target.value)}
                  value={language}
                >
                  <option value="en">EN</option>
                  <option value="ru">RU</option>
                  <option value="hi">HI</option>
                </select>
                <button className="button" onClick={() => void logout()} type="button">
                  {dictionary.nav.logout}
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
