import { SocialDashboardHome } from "@/components/social-dashboard-home";
import { getRequestSurface } from "@/lib/request-surface";
import { getSocialLauncherModel } from "@/lib/social-launcher";

const defaultCards = [
  {
    title: "Shared contracts first",
    body: "The web app consumes platform-neutral packages instead of importing React Native runtime code.",
  },
  {
    title: "Core product V1",
    body: "Auth, profile, contacts, chats, library, news, services, travel, support, and wallet routing are already mapped as browser-native flows.",
  },
  {
    title: "Realtime later",
    body: "Calls, browser notifications, and media-heavy surfaces stay outside the critical path until the social web loop is stable.",
  },
];

export default async function HomePage() {
  const { host, isSocial, language } = await getRequestSurface();
  const launcher = getSocialLauncherModel(language);
  const mayapurNow = new Date();
  const locale = launcher.language === "ru" ? "ru-RU" : "en-US";
  const timeValue = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(mayapurNow);
  const dayLabel = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(mayapurNow);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(mayapurNow);

  if (isSocial) {
    return (
      <main className="shell shell--dashboard">
        <div className="container">
          <SocialDashboardHome
            badge={launcher.copy.badge}
            body={launcher.copy.publicBody}
            brandSubtitle={launcher.copy.brandSubtitle}
            brandTitle="VedaMatch"
            currentLabel={launcher.copy.current}
            dateLabel={dateLabel}
            dayLabel={dayLabel}
            primaryAction={{ href: "/app", label: launcher.copy.openSocial, variant: "primary" }}
            secondaryAction={{ href: "/login", label: launcher.copy.signIn, variant: "ghost" }}
            shortcuts={launcher.allItems}
            shortcutsActionLabel={launcher.copy.shortcutsActionLabel}
            shortcutsTitle={launcher.copy.shortcutsTitle}
            soonLabel={launcher.copy.comingSoon}
            timeLabel={launcher.copy.timeLabel}
            timeValue={timeValue}
            title={launcher.copy.publicTitle}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <section className="hero">
        <div className="container grid-3">
          {defaultCards.map((card) => (
            <div className="panel page-card" key={card.title}>
              <h2>{card.title}</h2>
              <p className="muted">{card.body}</p>
            </div>
          ))}
          <div className="panel page-card">
            <h2>Current host</h2>
            <p className="muted">{host}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
