import Link from "next/link";

export type DashboardShortcut = {
  href: string;
  label: string;
  hint: string;
  monogram: string;
  tone: "blue" | "orange" | "green" | "pink" | "violet" | "copper" | "indigo" | "stone";
};

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
  shortcuts: DashboardShortcut[];
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
            <div className="dashboard-shortcuts__icon">[]</div>
            <h2>{shortcutsTitle}</h2>
          </div>
          {shortcutsActionLabel ? <span className="dashboard-shortcuts__action">{shortcutsActionLabel}</span> : null}
        </div>

        <div className="shortcut-grid">
          {shortcuts.map((shortcut) => (
            <Link className="shortcut-tile" href={shortcut.href} key={shortcut.href}>
              <div className={`shortcut-icon shortcut-icon--${shortcut.tone}`}>
                <span>{shortcut.monogram}</span>
              </div>
              <strong>{shortcut.label}</strong>
              <span>{shortcut.hint}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
