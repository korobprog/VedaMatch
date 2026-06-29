import { SocialDashboardHome } from "@/components/social-dashboard-home";
import { PortalPublicHome } from "@/components/portal-public-home";
import { UnionPublicHome } from "@/components/union-public-home";
import { getRequestSurface } from "@/lib/request-surface";
import { getSocialLauncherModel } from "@/lib/social-launcher";

export default async function HomePage() {
  const { host, isSocial, isUnion, language } = await getRequestSurface();
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

  if (isUnion) {
    return <UnionPublicHome host={host} language={language} />;
  }

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

  return <PortalPublicHome host={host} language={language} />;
}
