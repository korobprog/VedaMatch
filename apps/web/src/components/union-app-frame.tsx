"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { HeartHandshake, Inbox, LogOut, MessageCircle, Search, UserRound, Wallet } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-context";
import { ThemeSwitcher } from "@/components/theme-switcher";

const navItems = [
  { href: "/app/union", labelKey: "navSearch", icon: Search },
  { href: "/app/union/profile", labelKey: "navProfile", icon: UserRound },
  { href: "/app/union/requests", labelKey: "navRequests", icon: Inbox },
  { href: "/app/chats", labelKey: "navChats", icon: MessageCircle },
  { href: "/app/wallet", labelKey: "navWallet", icon: Wallet },
] as const;

export function UnionAppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dictionary, ready, session, logout } = useSession();
  const unionCopy = dictionary.union;

  useEffect(() => {
    if (ready && !session?.accessToken) {
      router.replace("/login");
    }
  }, [ready, router, session?.accessToken]);

  if (!ready) {
    return (
      <main className="shell shell--union">
        <div className="union-shell-container">
          <div className="union-auth-panel">
            <h1>{dictionary.portal.loadingTitle}</h1>
            <p>{dictionary.portal.loadingSubtitle}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!session?.accessToken) {
    return null;
  }

  return (
    <main className="shell shell--union">
      <div className="union-shell-container">
        <header className="union-topbar">
          <Link className="union-brand" href="/app/union">
            <span className="union-brand__mark" aria-hidden="true">
              <HeartHandshake size={22} />
            </span>
            <span className="union-brand__copy">
              <strong>{unionCopy.eyebrow}</strong>
              <span>{unionCopy.brandSubtitle}</span>
            </span>
          </Link>

          <nav className="union-nav" aria-label={unionCopy.navLabel}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/app/union" && pathname.startsWith(item.href));
              return (
                <Link aria-current={active ? "page" : undefined} className={active ? "union-nav__link is-active" : "union-nav__link"} href={item.href} key={item.href} title={unionCopy[item.labelKey]}>
                  <Icon aria-hidden="true" size={17} />
                  <span>{unionCopy[item.labelKey]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="union-topbar__actions">
            <ThemeSwitcher compact />
            <LanguageSwitcher />
            <button aria-label={dictionary.nav.logout} className="union-icon-action" onClick={() => void logout()} title={dictionary.nav.logout} type="button">
              <LogOut aria-hidden="true" size={18} />
              <span className="union-icon-action__label">{dictionary.nav.logout}</span>
            </button>
          </div>
        </header>

        <div className="union-shell-content">{children}</div>
      </div>
    </main>
  );
}
