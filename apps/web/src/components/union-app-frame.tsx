"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { BookOpen, CalendarDays, HeartHandshake, LogOut, MessageCircle, Search, ThumbsUp, UserRound, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-context";
import { ThemeSwitcher } from "@/components/theme-switcher";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export function UnionAppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dictionary, language, ready, session, logout } = useSession();
  const copy = dictionary.datingWeb;
  const vedabaseHref = language === "ru" ? "https://vedabase.vedamatch.ru" : "https://vedabase.vedamatch.com";
  const navItems: NavItem[] = [
    { href: "/app/union", label: copy.nav.browse, icon: Search, exact: true },
    { href: "/app/union/profile", label: copy.nav.profile, icon: UserRound },
    { href: "/app/dating/likes", label: copy.nav.likes, icon: ThumbsUp },
    { href: "/app/dating/meetings", label: copy.nav.meetings, icon: CalendarDays },
    { href: "/app/chats", label: dictionary.nav.chats, icon: MessageCircle },
    { href: "/app/wallet", label: dictionary.nav.wallet, icon: Wallet },
  ];

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
              <strong>{copy.eyebrow}</strong>
              <span>{copy.subtitle}</span>
            </span>
          </Link>

          <nav className="union-nav" aria-label={copy.eyebrow}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link aria-current={active ? "page" : undefined} className={active ? "union-nav__link is-active" : "union-nav__link"} href={item.href} key={item.href} title={item.label}>
                  <Icon aria-hidden="true" size={17} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
            <a className="union-nav__link" href={vedabaseHref} rel="noreferrer" target="_blank" title={copy.nav.books}>
              <BookOpen aria-hidden="true" size={17} />
              <span>{copy.nav.books}</span>
            </a>
          </nav>

          <div className="union-topbar__actions">
            <ThemeSwitcher className="theme-switcher--compact" />
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
