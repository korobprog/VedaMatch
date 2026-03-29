import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LauncherItems } from "@/components/social-launcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { SocialLauncherItem } from "@/lib/social-launcher";

type DashboardAction = {
  href: string;
  label: string;
  variant?: "primary" | "ghost";
};

type SocialDashboardHomeProps = {
  brandTitle: string;
  brandSubtitle: string;
  timeLabel: string;
  timeValue: string;
  dayLabel: string;
  dateLabel: string;
  badge: string;
  title: string;
  body: string;
  primaryAction: DashboardAction;
  secondaryAction?: DashboardAction;
  shortcutsTitle: string;
  shortcutsActionLabel?: string;
  shortcuts: SocialLauncherItem[];
  currentLabel: string;
  soonLabel: string;
};

export function SocialDashboardHome({
  badge,
  body,
  brandSubtitle,
  brandTitle,
  dateLabel,
  dayLabel,
  primaryAction,
  secondaryAction,
  shortcuts,
  currentLabel,
  soonLabel,
  shortcutsActionLabel,
  shortcutsTitle,
  timeLabel,
  timeValue,
  title,
}: SocialDashboardHomeProps) {
  return (
    <section className="social-dashboard">
      <div className="social-dashboard__head">
        <div className="dashboard-brand">
          <div className="dashboard-brand__mark">VM</div>
          <div className="dashboard-brand__copy">
            <strong>{brandTitle}</strong>
            <span>{brandSubtitle}</span>
          </div>
        </div>
        <div className="dashboard-actions">
          <ThemeSwitcher />
          <LanguageSwitcher />
          {secondaryAction ? (
            <Link className="dashboard-action dashboard-action--ghost" href={secondaryAction.href}>
              {secondaryAction.label}
            </Link>
          ) : null}
          <Link
            className={primaryAction.variant === "ghost" ? "dashboard-action dashboard-action--ghost" : "dashboard-action"}
            href={primaryAction.href}
          >
            {primaryAction.label}
          </Link>
        </div>
      </div>

      <div className="dashboard-grid">
        <article className="dashboard-card dashboard-card--time">
          <span className="dashboard-card__eyebrow">{timeLabel}</span>
          <div className="dashboard-time">{timeValue}</div>
          <div className="dashboard-time__meta">
            <strong>{dayLabel}</strong>
            <span>{dateLabel}</span>
          </div>
        </article>

        <article className="dashboard-card dashboard-card--hero">
          <span className="dashboard-badge">{badge}</span>
          <div className="dashboard-hero__body">
            <h1>{title}</h1>
            <p>{body}</p>
          </div>
          <div className="dashboard-hero__actions">
            <Link className="dashboard-cta" href={primaryAction.href}>
              {primaryAction.label}
            </Link>
            {secondaryAction ? (
              <Link className="dashboard-inline-link" href={secondaryAction.href}>
                {secondaryAction.label}
              </Link>
            ) : null}
          </div>
        </article>
      </div>

      <div className="dashboard-shortcuts">
        <div className="dashboard-shortcuts__head">
          <div className="dashboard-shortcuts__title">
            <div className="dashboard-shortcuts__icon">VM</div>
            <h2>{shortcutsTitle}</h2>
          </div>
          {shortcutsActionLabel ? <span className="dashboard-shortcuts__action">{shortcutsActionLabel}</span> : null}
        </div>

        <LauncherItems currentLabel={currentLabel} items={shortcuts} soonLabel={soonLabel} />
      </div>
    </section>
  );
}
