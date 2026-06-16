import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, BriefcaseBusiness, HandHeart, HeartHandshake, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { getDatingPresentation, resolveApiBaseUrlForHostname } from "@vedamatch/api-client";
import type { DatingMode, DatingPresentationResponse, Language } from "@vedamatch/domain-types";
import { getDictionary } from "@vedamatch/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { resolveMediaUrl } from "@/lib/media";

const modeIcons = {
  family: HeartHandshake,
  friendship: UsersRound,
  business: BriefcaseBusiness,
  seva: HandHeart,
} satisfies Record<DatingMode, ComponentType<{ size?: number; "aria-hidden"?: boolean }>>;

const modes = ["family", "friendship", "business", "seva"] as const;

function emptyPresentation(): DatingPresentationResponse {
  return {
    family: { profiles: [], totalCount: 0, totalFemale: 0, totalMale: 0 },
    friendship: { profiles: [], totalCount: 0 },
    business: { profiles: [], totalCount: 0 },
    seva: { profiles: [], totalCount: 0 },
  };
}

export async function UnionPublicHome({ host, language }: { host: string; language: Language }) {
  const copy = getDictionary(language).union;
  const baseUrl = resolveApiBaseUrlForHostname(host);
  let presentation = emptyPresentation();

  try {
    presentation = await getDatingPresentation(baseUrl);
  } catch {
    presentation = emptyPresentation();
  }

  const avatars = modes
    .flatMap((mode) => presentation[mode]?.profiles || [])
    .map((profile) => resolveMediaUrl(baseUrl, profile.avatarUrl))
    .filter(Boolean)
    .slice(0, 14);
  const total = modes.reduce((sum, mode) => sum + (presentation[mode]?.totalCount || 0), 0);
  const family = presentation.family;

  return (
    <main className="shell shell--union shell--union-public">
      <section className="union-public-hero">
        <div className="union-public-hero__media" aria-hidden="true">
          {avatars.map((avatarUrl, index) => (
            <img alt="" className={`union-public-hero__photo union-public-hero__photo--${(index % 7) + 1}`} key={`${avatarUrl}-${index}`} src={avatarUrl} />
          ))}
        </div>
        <div className="union-public-hero__shade" />
        <div className="union-public-controls">
          <ThemeSwitcher compact />
          <LanguageSwitcher className="union-public-language" refreshOnChange />
        </div>

        <div className="union-public-hero__content">
          <span className="union-public-badge">
            <Sparkles aria-hidden="true" size={18} />
            {copy.eyebrow}
          </span>
          <h1>{copy.publicTitle}</h1>
          <p>{copy.publicBody}</p>
          <div className="union-public-actions">
            <Link className="union-public-button" href="/login">
              {copy.publicPrimary}
              <ArrowRight aria-hidden="true" size={18} />
            </Link>
            <Link className="union-public-button union-public-button--ghost" href="/register">
              {copy.publicSecondary}
            </Link>
          </div>
        </div>

        <div className="union-public-hero__stats" aria-label={copy.publicStatsLabel}>
          <strong>{total}</strong>
          <span>{copy.publicStatsLabel}</span>
          <small>{family?.totalMale || 0} {copy.publicMale} / {family?.totalFemale || 0} {copy.publicFemale}</small>
        </div>
      </section>

      <section className="union-public-section">
        <div className="union-public-section__head">
          <div>
            <span className="union-public-kicker">
              <ShieldCheck aria-hidden="true" size={18} />
              {copy.publicTrust}
            </span>
            <h2>{copy.publicModesTitle}</h2>
          </div>
        </div>
        <div className="union-public-modes">
          {modes.map((mode) => {
            const Icon = modeIcons[mode];
            return (
              <article className="union-public-mode" key={mode}>
                <Icon aria-hidden="true" size={24} />
                <strong>{copy[mode]}</strong>
                <p>{copy.publicModeBodies[mode]}</p>
                <span>{presentation[mode]?.totalCount || 0}</span>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
