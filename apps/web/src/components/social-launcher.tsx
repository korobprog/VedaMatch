"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  Clapperboard,
  Coffee,
  Compass,
  Flame,
  GraduationCap,
  Handshake,
  Heart,
  History,
  Landmark,
  LayoutGrid,
  LifeBuoy,
  Map,
  Megaphone,
  MessageCircle,
  Music4,
  Newspaper,
  Phone,
  Radio,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import type { SocialLauncherGroup, SocialLauncherIcon, SocialLauncherItem } from "@/lib/social-launcher";

const ICONS: Record<SocialLauncherIcon, LucideIcon> = {
  "book-open": BookOpen,
  bot: Bot,
  briefcase: Briefcase,
  "calendar-days": CalendarDays,
  clapperboard: Clapperboard,
  coffee: Coffee,
  compass: Compass,
  flame: Flame,
  "graduation-cap": GraduationCap,
  handshake: Handshake,
  heart: Heart,
  history: History,
  landmark: Landmark,
  "layout-grid": LayoutGrid,
  "life-buoy": LifeBuoy,
  map: Map,
  megaphone: Megaphone,
  "message-circle": MessageCircle,
  music: Music4,
  newspaper: Newspaper,
  phone: Phone,
  radio: Radio,
  settings: Settings,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  sun: Sun,
  users: Users,
  wallet: Wallet,
};

type LauncherItemsProps = {
  items: SocialLauncherItem[];
  activeId?: string | null;
  compact?: boolean;
  className?: string;
  currentLabel: string;
  soonLabel: string;
};

function LauncherCard({
  item,
  activeId,
  compact = false,
  currentLabel,
  soonLabel,
}: {
  item: SocialLauncherItem;
  activeId?: string | null;
  compact?: boolean;
  currentLabel: string;
  soonLabel: string;
}) {
  const Icon = ICONS[item.icon];
  const active = item.id === activeId;
  const classes = [
    "launcher-card",
    compact ? "launcher-card--compact" : "",
    active ? "is-active" : "",
    item.status === "soon" ? "is-soon" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className={`launcher-card__icon launcher-card__icon--${item.tone}`}>
        <Icon aria-hidden="true" size={compact ? 22 : 30} strokeWidth={2.2} />
      </div>
      <div className="launcher-card__copy">
        <strong>{item.label}</strong>
        <span>{item.hint}</span>
      </div>
      <div className="launcher-card__meta">
        {active ? <span className="launcher-badge launcher-badge--current">{currentLabel}</span> : null}
        {!active && item.status === "soon" ? <span className="launcher-badge">{soonLabel}</span> : null}
      </div>
    </>
  );

  if (!item.href || item.status === "soon") {
    return (
      <div aria-disabled="true" className={classes}>
        {content}
      </div>
    );
  }

  return (
    <Link aria-current={active ? "page" : undefined} className={classes} href={item.href}>
      {content}
    </Link>
  );
}

export function LauncherItems({
  items,
  activeId,
  className,
  compact = false,
  currentLabel,
  soonLabel,
}: LauncherItemsProps) {
  return (
    <div className={[compact ? "launcher-dock" : "launcher-grid", className].filter(Boolean).join(" ")}>
      {items.map((item) => (
        <LauncherCard
          activeId={activeId}
          compact={compact}
          currentLabel={currentLabel}
          item={item}
          key={item.id}
          soonLabel={soonLabel}
        />
      ))}
    </div>
  );
}

export function LauncherGroups({
  activeId,
  currentLabel,
  groups,
  soonLabel,
}: {
  groups: SocialLauncherGroup[];
  activeId?: string | null;
  currentLabel: string;
  soonLabel: string;
}) {
  return (
    <div className="launcher-groups">
      {groups.map((group) => (
        <section className="launcher-group" key={group.id}>
          <div className="launcher-group__head">
            <h2>{group.label}</h2>
          </div>
          <LauncherItems activeId={activeId} currentLabel={currentLabel} items={group.items} soonLabel={soonLabel} />
        </section>
      ))}
    </div>
  );
}
