"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { LauncherItems } from "@/components/social-launcher";
import { useSession } from "@/components/session-context";
import { getSocialLauncherModel, resolveActiveLauncherId } from "@/lib/social-launcher";

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dictionary, language, ready, session, logout, setLanguage } = useSession();
  const launcher = getSocialLauncherModel(language);
  const activeLauncherId = resolveActiveLauncherId(pathname);
  const activeGroup = launcher.groups.find((group) => group.items.some((item) => item.id === activeLauncherId)) ?? null;
  const showContextLauncher = Boolean(activeGroup) && pathname !== "/app" && !pathname.startsWith("/app/services");

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
    <main className="shell shell--dashboard">
      <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div className="social-shell-topbar">
          <Link className="dashboard-brand dashboard-brand--compact" href="/app">
            <div className="dashboard-brand__mark">VM</div>
            <div className="dashboard-brand__copy">
              <strong>VedaMatch</strong>
              <span>{launcher.copy.brandSubtitle}</span>
            </div>
          </Link>
          <div className="social-shell-topbar__actions">
            <Link className="dashboard-action dashboard-action--ghost" href="/">
              {launcher.copy.publicHome}
            </Link>
            <Link
              aria-current={pathname.startsWith("/app/profile") ? "page" : undefined}
              className={pathname.startsWith("/app/profile") ? "dashboard-action" : "dashboard-action dashboard-action--ghost"}
              href="/app/profile"
            >
              {launcher.copy.profile}
            </Link>
            <select
              aria-label={dictionary.languageLabel}
              className="dashboard-select"
              onChange={(event) => setLanguage(event.target.value)}
              value={language}
            >
              <option value="en">EN</option>
              <option value="ru">RU</option>
              <option value="hi">HI</option>
            </select>
            <button className="dashboard-action dashboard-action--ghost" onClick={() => void logout()} type="button">
              {dictionary.nav.logout}
            </button>
          </div>
        </div>

        <div className="social-shell-panel">
          <div className="social-shell-panel__head">
            <div>
              <span className="eyebrow">{launcher.copy.quickAccessTitle}</span>
              <h2>{launcher.copy.shortcutsTitle}</h2>
            </div>
            <Link className="dashboard-inline-link" href="/app/services">
              {launcher.copy.browseAllServices}
            </Link>
          </div>
          <LauncherItems
            activeId={activeLauncherId}
            compact
            currentLabel={launcher.copy.current}
            items={launcher.dockItems}
            soonLabel={launcher.copy.comingSoon}
          />
        </div>

        {showContextLauncher && activeGroup ? (
          <div className="social-shell-panel social-shell-panel--context">
            <div className="social-shell-panel__head">
              <div>
                <span className="eyebrow">{launcher.copy.current}</span>
                <h2>{activeGroup.label}</h2>
              </div>
              <Link className="dashboard-inline-link" href="/app/services">
                {launcher.copy.browseAllServices}
              </Link>
            </div>
            <LauncherItems
              activeId={activeLauncherId}
              currentLabel={launcher.copy.current}
              items={activeGroup.items}
              soonLabel={launcher.copy.comingSoon}
            />
          </div>
        ) : null}

        <div className="stack social-shell-content">{children}</div>
      </div>
    </main>
  );
}
