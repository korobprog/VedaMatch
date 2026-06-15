"use client";

import Link from "next/link";
import { BriefcaseBusiness, HandHeart, HeartHandshake, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useSession } from "@/components/session-context";
import { ThemeSwitcher } from "@/components/theme-switcher";
import type { DatingPresentationResponse, DatingPresentationMode } from "@vedamatch/api-client";
import type { Language } from "@vedamatch/domain-types";

type UnionPublicHomeProps = {
  language: Language;
  presentation: DatingPresentationResponse | null;
};

type UnionModeCopy = {
  label: string;
  body: string;
};

type UnionCopy = {
  badge: string;
  title: string;
  body: string;
  signIn: string;
  register: string;
  statsLabel: string;
  male: string;
  female: string;
  kicker: string;
  modesTitle: string;
  modes: Record<DatingPresentationMode, UnionModeCopy>;
};

const MODE_ORDER: DatingPresentationMode[] = ["family", "friendship", "business", "seva"];

const COPY: Record<Language, UnionCopy> = {
  ru: {
    badge: "Союз",
    title: "Осознанные знакомства в благости",
    body: "Пространство для людей, которые ищут близость, дружбу, проекты и севу через общие ценности.",
    signIn: "Войти",
    register: "Создать анкету",
    statsLabel: "Анкет в Союзе",
    male: "муж.",
    female: "жен.",
    kicker: "Анкеты проходят публикацию, а детали открываются по согласию.",
    modesTitle: "Выберите формат связи",
    modes: {
      family: { label: "Семья", body: "Спутник жизни и зрелый семейный выбор." },
      friendship: { label: "Дружба", body: "Люди рядом по практике, интересам и пути." },
      business: { label: "Дело", body: "Партнеры, команды и проекты с общими принципами." },
      seva: { label: "Сева", body: "Совместное служение и полезные инициативы." },
    },
  },
  en: {
    badge: "Union",
    title: "Conscious dating without the noise",
    body: "A space for people seeking closeness, friendship, projects, and seva through shared values.",
    signIn: "Sign in",
    register: "Create profile",
    statsLabel: "Profiles in Union",
    male: "men",
    female: "women",
    kicker: "Profiles pass publication review, and details open by consent.",
    modesTitle: "Choose a connection format",
    modes: {
      family: { label: "Family", body: "A life partner and a mature family choice." },
      friendship: { label: "Friendship", body: "People nearby in practice, interests, and path." },
      business: { label: "Work", body: "Partners, teams, and projects with shared principles." },
      seva: { label: "Seva", body: "Joint service and useful initiatives." },
    },
  },
  hi: {
    badge: "Union",
    title: "शोर के बिना सजग परिचय",
    body: "साझा मूल्यों से निकटता, मित्रता, परियोजनाएं और सेवा खोजने वालों के लिए स्थान।",
    signIn: "साइन इन",
    register: "प्रोफाइल बनाएं",
    statsLabel: "Union में प्रोफाइल",
    male: "पुरुष",
    female: "महिला",
    kicker: "प्रोफाइल publication review से गुजरती हैं, और विवरण सहमति से खुलते हैं।",
    modesTitle: "संबंध का प्रकार चुनें",
    modes: {
      family: { label: "परिवार", body: "जीवन साथी और परिपक्व पारिवारिक चुनाव।" },
      friendship: { label: "मित्रता", body: "अभ्यास, रुचियों और मार्ग में साथ चलने वाले लोग।" },
      business: { label: "कार्य", body: "साझा सिद्धांतों वाले साथी, टीमें और परियोजनाएं।" },
      seva: { label: "सेवा", body: "संयुक्त सेवा और उपयोगी पहल।" },
    },
  },
};

const MODE_ICONS = {
  family: HeartHandshake,
  friendship: UsersRound,
  business: BriefcaseBusiness,
  seva: HandHeart,
} as const;

function countFor(presentation: DatingPresentationResponse | null, mode: DatingPresentationMode): number {
  const count = presentation?.[mode]?.totalCount;
  return typeof count === "number" && Number.isFinite(count) ? count : 0;
}

function totalProfiles(presentation: DatingPresentationResponse | null): number {
  return MODE_ORDER.reduce((sum, mode) => sum + countFor(presentation, mode), 0);
}

export function UnionPublicHome({ language, presentation }: UnionPublicHomeProps) {
  const session = useSession();
  const activeLanguage = session.language || language;
  const copy = COPY[activeLanguage] ?? COPY.en;
  const total = totalProfiles(presentation);
  const familyStats = presentation?.family;
  const totalMale = familyStats?.totalMale ?? 0;
  const totalFemale = familyStats?.totalFemale ?? 0;

  return (
    <main className="shell shell--union shell--union-public">
      <section className="union-public-hero">
        <div aria-hidden="true" className="union-public-hero__media" />
        <div className="union-public-hero__shade" />
        <div className="union-public-controls">
          <ThemeSwitcher className="theme-switcher--compact" />
          <LanguageSwitcher className="union-public-language" />
        </div>
        <div className="union-public-hero__content">
          <span className="union-public-badge">
            <Sparkles aria-hidden="true" size={18} />
            {copy.badge}
          </span>
          <h1>{copy.title}</h1>
          <p>{copy.body}</p>
          <div className="union-public-actions">
            <Link className="union-public-button" href="/login">
              {copy.signIn}
            </Link>
            <Link className="union-public-button union-public-button--ghost" href="/register">
              {copy.register}
            </Link>
          </div>
        </div>
        <div aria-label={copy.statsLabel} className="union-public-hero__stats">
          <strong>{total}</strong>
          <span>{copy.statsLabel}</span>
          <small>
            {totalMale} {copy.male} / {totalFemale} {copy.female}
          </small>
        </div>
      </section>
      <section className="union-public-section">
        <div className="union-public-section__head">
          <div>
            <span className="union-public-kicker">
              <ShieldCheck aria-hidden="true" size={18} />
              {copy.kicker}
            </span>
            <h2>{copy.modesTitle}</h2>
          </div>
        </div>
        <div className="union-public-modes">
          {MODE_ORDER.map((mode) => {
            const Icon = MODE_ICONS[mode];
            const modeCopy = copy.modes[mode];
            return (
              <article className="union-public-mode" key={mode}>
                <Icon aria-hidden="true" size={24} />
                <strong>{modeCopy.label}</strong>
                <p>{modeCopy.body}</p>
                <span>{countFor(presentation, mode)}</span>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
