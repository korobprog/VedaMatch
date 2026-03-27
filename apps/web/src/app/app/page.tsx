"use client";

import { SocialDashboardHome } from "@/components/social-dashboard-home";
import { useSession } from "@/components/session-context";
import { getSocialLauncherModel } from "@/lib/social-launcher";

export default function AppHomePage() {
  const { language } = useSession();
  const launcher = getSocialLauncherModel(language);
  const now = new Date();
  const locale = launcher.language === "ru" ? "ru-RU" : "en-US";
  const timeValue = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  const dayLabel = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    weekday: "long",
  }).format(now);
  const dateLabel = new Intl.DateTimeFormat(locale, {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);

  return (
    <SocialDashboardHome
      badge={launcher.copy.badge}
      body={launcher.copy.appBody}
      brandSubtitle={launcher.copy.brandSubtitle}
      brandTitle="VedaMatch"
      currentLabel={launcher.copy.current}
      dateLabel={dateLabel}
      dayLabel={dayLabel}
      primaryAction={{ href: "/app/chats", label: launcher.copy.openChats }}
      secondaryAction={{ href: "/app/services", label: launcher.copy.browseAllServices, variant: "ghost" }}
      shortcuts={launcher.allItems}
      shortcutsActionLabel={launcher.copy.shortcutsActionLabel}
      shortcutsTitle={launcher.copy.shortcutsTitle}
      soonLabel={launcher.copy.comingSoon}
      timeLabel={launcher.copy.timeLabel}
      timeValue={timeValue}
      title={launcher.copy.appTitle}
    />
  );
}
