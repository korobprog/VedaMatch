"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, HeartHandshake, Lock, MessageCircle, Search, SlidersHorizontal, Wallet, X } from "lucide-react";
import { buildVedamatchUrl, createBrowserClient } from "@vedamatch/api-client";
import type { DatingCandidate, DatingCandidatesQuery, DatingChatRequestStatus, DatingMode, WalletResponse } from "@vedamatch/domain-types";
import type { Dictionary } from "@vedamatch/i18n";
import { useSession } from "@/components/session-context";
import { formatValue, getCandidatePhoto, getProfileId } from "@/lib/media";
import { UnionNotice } from "@/components/union-notice";
import { UnionSkeleton } from "@/components/union-skeleton";

type UnionCopy = Dictionary["union"];

type UnionFilters = {
  mode: "" | DatingMode;
  city: string;
  minAge: string;
  maxAge: string;
  madh: string;
  identity: string;
  skills: string;
  industry: string;
};

const EMPTY_FILTERS: UnionFilters = {
  mode: "",
  city: "",
  minAge: "",
  maxAge: "",
  madh: "",
  identity: "",
  skills: "",
  industry: "",
};
const MADH_OPTIONS = [
  "ISKCON",
  "Brahma-Madhva-Gaudiya",
  "Sri Sampradaya (Ramanuja)",
  "Brahma Sampradaya (Madhvacharya)",
  "Rudra Sampradaya (Vishnuswami)",
  "Kumara Sampradaya (Nimbarka)",
  "Шри Чайтанья Сарасват Матх",
  "Международное Общество Чистой Бхакти-йоги",
  "Шри Гопинатх Гаудия",
  "Шри Чайтанья Матх",
  "Other",
] as const;
const IDENTITY_OPTIONS = ["Yogi", "In Goodness"] as const;

/**
 * Совместимость может прийти числом (баллы) или текстовым AI-отчётом.
 * Возвращает процент 0..100 только когда значение целиком числовое,
 * иначе null — тогда показываем текст как есть.
 */
function compatibilityPercent(value: unknown): number | null {
  const trimmed = typeof value === "number" ? value : String(value ?? "").trim();
  const num = typeof trimmed === "number" ? trimmed : /^\d+(\.\d+)?%?$/.test(trimmed) ? parseFloat(trimmed) : NaN;
  if (!Number.isFinite(num) || num <= 0) {
    return null;
  }
  const percent = num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, Math.round(percent)));
}

function toQuery(filters: UnionFilters): DatingCandidatesQuery {
  return {
    mode: filters.mode || undefined,
    city: filters.city,
    minAge: filters.minAge,
    maxAge: filters.maxAge,
    madh: filters.madh,
    identity: filters.identity,
    skills: filters.skills,
    industry: filters.industry,
  };
}

function openLkmWallet() {
  const host = window.location.hostname;
  const returnTo = encodeURIComponent(`${window.location.origin}/app/union`);
  window.location.href = buildVedamatchUrl(host, "lkm", "/", `?returnTo=${returnTo}`);
}

function requestStatusLabel(status: DatingCandidate["chatRequestStatus"], copy: UnionCopy): string {
  switch (status) {
    case "pending":
      return copy.requestPending;
    case "accepted":
      return copy.requestAccepted;
    case "rejected":
      return copy.requestRejected;
    default:
      return copy.chatGateHint;
  }
}

function modeLabel(mode: DatingMode, copy: UnionCopy): string {
  return copy[mode];
}

function uniqueOptions(options: string[]): string[] {
  return Array.from(new Set(options.map((option) => option.trim()).filter(Boolean)));
}

function mergeCurrentOption(options: readonly string[], currentValue: string): string[] {
  const normalizedCurrent = currentValue.trim();
  if (!normalizedCurrent || options.some((option) => option.toLowerCase() === normalizedCurrent.toLowerCase())) {
    return [...options];
  }
  return [normalizedCurrent, ...options];
}

function optionLabel(value: string, labels: Record<string, string>): string {
  return labels[value] || value;
}

async function fetchCityOptions(options: { accessToken?: string; country?: string; q?: string; signal?: AbortSignal }): Promise<string[]> {
  const params = new URLSearchParams({ limit: "8" });
  const query = options.q?.trim();
  const country = options.country?.trim();
  if (query) {
    params.set("q", query);
  }
  if (country) {
    params.set("country", country);
  }

  const response = await fetch(`/api/locations/cities?${params.toString()}`, {
    cache: "no-store",
    headers: options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : undefined,
    signal: options.signal,
  });
  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return uniqueOptions(Array.isArray(payload?.options) ? payload.options.map(String) : []);
}

export function UnionDashboard() {
  const { dictionary, session } = useSession();
  const copy = dictionary.union;
  const client = useMemo(() => createBrowserClient(), []);
  const accessToken = session?.accessToken || "";
  const [filters, setFilters] = useState<UnionFilters>(EMPTY_FILTERS);
  const [cityOptions, setCityOptions] = useState<string[]>([]);
  const [cityOpen, setCityOpen] = useState(false);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [candidates, setCandidates] = useState<DatingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<DatingCandidate | null>(null);
  const [modalError, setModalError] = useState("");
  const [error, setError] = useState("");
  const [requestDrafts, setRequestDrafts] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");
  const cityBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mergedCityOptions = useMemo(
    () => mergeCurrentOption(cityOptions, filters.city),
    [cityOptions, filters.city],
  );
  const madhOptions = useMemo(
    () => mergeCurrentOption(MADH_OPTIONS, filters.madh),
    [filters.madh],
  );
  const identityOptions = useMemo(
    () => mergeCurrentOption(IDENTITY_OPTIONS, filters.identity),
    [filters.identity],
  );
  const visibleCityOptions = useMemo(() => {
    const query = filters.city.trim().toLowerCase();
    const options = cityOptions.length > 0 ? cityOptions : mergedCityOptions;
    return (query ? options.filter((city) => city.toLowerCase() !== query) : options).slice(0, 8);
  }, [cityOptions, filters.city, mergedCityOptions]);
  const cityInputValue = cityOpen ? filters.city : optionLabel(filters.city, copy.optionLabels.cities);

  const loadUnion = useCallback(async (nextFilters: UnionFilters) => {
    setLoading(true);
    setError("");
    try {
      const [nextWallet, nextCandidates] = await Promise.all([
        client.getWallet().catch(() => null),
        client.getDatingCandidates(toQuery(nextFilters)),
      ]);
      setWallet(nextWallet);
      setCandidates(Array.isArray(nextCandidates) ? nextCandidates : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [client, copy.loadFailed]);

  useEffect(() => {
    void loadUnion(EMPTY_FILTERS);
  }, [loadUnion]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchCityOptions({ accessToken, q: filters.city, signal: controller.signal })
        .then((options) => setCityOptions(options))
        .catch(() => {
          if (!controller.signal.aborted) {
            setCityOptions([]);
          }
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
      if (cityBlurTimer.current) {
        clearTimeout(cityBlurTimer.current);
      }
    };
  }, [accessToken, filters.city]);

  const modalRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!selectedCandidate) {
      return;
    }
    const previousActive = document.activeElement as HTMLElement | null;
    const focusable = () =>
      Array.from(
        modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) || [],
      );
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedCandidate(null);
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const items = focusable();
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousActive?.focus?.();
    };
  }, [selectedCandidate]);

  async function handleFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await loadUnion(filters);
  }

  async function handleReset() {
    setFilters(EMPTY_FILTERS);
    await loadUnion(EMPTY_FILTERS);
  }

  async function handleUnlock() {
    if (!selectedCandidate) {
      return;
    }

    const profileId = getProfileId(selectedCandidate);
    if (!profileId) {
      return;
    }

    if (!selectedCandidate.viewerCanBypassPayment && wallet && wallet.balance < selectedCandidate.unlockPriceLkm) {
      setModalError(copy.insufficientBalance);
      return;
    }

    setActionLoadingId(profileId);
    setModalError("");
    try {
      const response = await client.unlockDatingProfile(profileId);
      if (response.balance) {
        setWallet(response.balance);
      }
      setSelectedCandidate(null);
      await loadUnion(filters);
    } catch (unlockError) {
      const message = unlockError instanceof Error ? unlockError.message : copy.actionFailed;
      setModalError(message.includes("INSUFFICIENT_LKM") ? copy.insufficientBalance : message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleCreateRequest(candidate: DatingCandidate) {
    const profileId = getProfileId(candidate);
    const message = requestDrafts[profileId]?.trim();
    if (!profileId || !message) {
      return;
    }

    setActionLoadingId(profileId);
    setNotice("");
    setError("");
    try {
      await client.createDatingChatRequest({ recipientId: profileId, message });
      setNotice(copy.requestSent);
      setRequestDrafts((current) => ({ ...current, [profileId]: "" }));
      await loadUnion(filters);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : copy.actionFailed);
    } finally {
      setActionLoadingId(null);
    }
  }

  const balanceLabel = wallet ? `${wallet.balance} ${wallet.currency || "LKM"}` : copy.balanceUnavailable;

  return (
    <div className="union-page">
      <section className="union-hero">
        <div className="union-hero__copy">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.title}</h1>
          <p>{copy.subtitle}</p>
        </div>
        <div className="union-hero__actions">
          <div className="union-balance" aria-label={copy.balanceLabel}>
            <Wallet aria-hidden="true" size={20} />
            <span>{copy.balanceLabel}</span>
            <strong>{balanceLabel}</strong>
          </div>
          <button className="dashboard-action" onClick={openLkmWallet} type="button">
            <Wallet aria-hidden="true" size={18} />
            {copy.topUp}
          </button>
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union/profile">
            {copy.editProfile}
          </Link>
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union/requests">
            {copy.requests}
          </Link>
        </div>
      </section>

      <form className="union-filters" onSubmit={handleFilterSubmit}>
        <div className="union-section-head">
          <SlidersHorizontal aria-hidden="true" size={20} />
          <h2>{copy.filters}</h2>
        </div>
        <label className="field">
          <span>{copy.mode}</span>
          <select value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value as UnionFilters["mode"] }))}>
            <option value="">{copy.allModes}</option>
            {(["family", "friendship", "business", "seva"] as DatingMode[]).map((mode) => (
              <option key={mode} value={mode}>{modeLabel(mode, copy)}</option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>{copy.city}</span>
          <div className="union-combobox">
            <input
              autoComplete="off"
              value={cityInputValue}
              onFocus={() => setCityOpen(filters.city.trim().length > 0)}
              onBlur={() => {
                cityBlurTimer.current = setTimeout(() => setCityOpen(false), 120);
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape" && cityOpen) {
                  event.stopPropagation();
                  setCityOpen(false);
                }
              }}
              onChange={(event) => {
                setFilters((current) => ({ ...current, city: event.target.value }));
                setCityOpen(true);
              }}
            />
            <button
              aria-expanded={cityOpen}
              aria-label={copy.showCityOptions}
              className="union-combobox__toggle"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCityOpen((current) => !current)}
              type="button"
            >
              <ChevronDown aria-hidden="true" size={16} />
            </button>
            {cityOpen && visibleCityOptions.length > 0 ? (
              <div className="union-combobox__list" role="listbox">
                {visibleCityOptions.map((city) => (
                  <button
                    className="union-combobox__option"
                    key={city}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setFilters((current) => ({ ...current, city }));
                      setCityOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    {optionLabel(city, copy.optionLabels.cities)}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        <label className="field">
          <span>{copy.minAge}</span>
          <input inputMode="numeric" value={filters.minAge} onChange={(event) => setFilters((current) => ({ ...current, minAge: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.maxAge}</span>
          <input inputMode="numeric" value={filters.maxAge} onChange={(event) => setFilters((current) => ({ ...current, maxAge: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.madh}</span>
          <select value={filters.madh} onChange={(event) => setFilters((current) => ({ ...current, madh: event.target.value }))}>
            <option value="">-</option>
            {madhOptions.map((option) => (
              <option key={option} value={option}>{optionLabel(option, copy.optionLabels.madh)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{copy.identity}</span>
          <select value={filters.identity} onChange={(event) => setFilters((current) => ({ ...current, identity: event.target.value }))}>
            <option value="">-</option>
            {identityOptions.map((option) => (
              <option key={option} value={option}>{optionLabel(option, copy.optionLabels.identity)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{copy.skills}</span>
          <input value={filters.skills} onChange={(event) => setFilters((current) => ({ ...current, skills: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.industry}</span>
          <input value={filters.industry} onChange={(event) => setFilters((current) => ({ ...current, industry: event.target.value }))} />
        </label>
        <div className="union-filter-actions">
          <button className="button" disabled={loading} type="submit">
            <Search aria-hidden="true" size={18} />
            {copy.search}
          </button>
          <button className="button-secondary" onClick={() => void handleReset()} type="button">
            {copy.reset}
          </button>
        </div>
      </form>

      <UnionNotice tone="success">{notice}</UnionNotice>
      <UnionNotice tone="error">{error}</UnionNotice>

      <span className="union-visually-hidden" role="status" aria-live="polite">
        {loading ? dictionary.common.loading : ""}
      </span>
      {loading ? <UnionSkeleton variant="cards" /> : null}
      {!loading && candidates.length === 0 ? <div className="empty-state">{copy.empty}</div> : null}

      <section className="union-grid" aria-label={copy.title}>
        {candidates.map((candidate) => {
          const profileId = getProfileId(candidate);
          const photoUrl = getCandidatePhoto(candidate);
          const isUnlocked = candidate.isUnlocked || candidate.viewerCanBypassPayment;
          const status = candidate.chatRequestStatus || "none";
          const requestDraft = requestDrafts[profileId] || "";
          const detailRows = [
            [copy.city, candidate.city],
            [copy.country, candidate.country],
            [copy.age, candidate.age],
            [copy.madh, candidate.madh],
            [copy.identity, candidate.identity],
            [copy.skills, candidate.skills],
            [copy.industry, candidate.industry],
            [copy.intentions, candidate.intentions],
            [copy.interests, candidate.interests],
          ].map(([label, value]) => ({ label: String(label), value: formatValue(value) })).filter((row) => row.value);

          return (
            <article className="union-card" key={profileId || candidate.displayName}>
              <div className="union-card__photo">
                {photoUrl ? <img alt={candidate.displayName} src={photoUrl} /> : <HeartHandshake aria-hidden="true" size={44} />}
                {!isUnlocked ? (
                  <span className="union-card__lock-badge">
                    <Lock aria-hidden="true" size={14} />
                    {copy.locked}
                  </span>
                ) : null}
              </div>
              <div className="union-card__body">
                <div className="union-card__title">
                  <h2>{candidate.displayName}</h2>
                  <span>{isUnlocked ? copy.unlocked : copy.paidAccess}</span>
                </div>

                {isUnlocked ? (
                  <>
                    <div className="union-facts">
                      {detailRows.map((row) => (
                        <div className="union-fact" key={`${profileId}-${row.label}`}>
                          <span>{row.label}</span>
                          <strong>{row.value}</strong>
                        </div>
                      ))}
                    </div>
                    {candidate.bio ? <p className="union-card__bio">{candidate.bio}</p> : null}
                    {candidate.compatibilityScore ? (
                      (() => {
                        const percent = compatibilityPercent(candidate.compatibilityScore);
                        if (percent === null) {
                          return (
                            <div className="union-meter union-meter--text">
                              <span>{copy.compatibility}</span>
                              <strong>{formatValue(candidate.compatibilityScore)}</strong>
                            </div>
                          );
                        }
                        return (
                          <div className="union-meter">
                            <span>{copy.compatibility}</span>
                            <div
                              className="union-meter__track"
                              role="meter"
                              aria-label={copy.compatibility}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={percent}
                            >
                              <div className="union-meter__fill" style={{ width: `${percent}%` }} />
                            </div>
                            <strong>{percent}%</strong>
                          </div>
                        );
                      })()
                    ) : null}
                    <div className="union-socials">
                      {candidate.datingSocialLinks?.length ? candidate.datingSocialLinks.filter((link) => link.visible !== false).map((link) => (
                        <a href={link.url} key={`${profileId}-${link.platform}-${link.url}`} rel="noreferrer" target="_blank">
                          {link.platform}
                        </a>
                      )) : <span>{copy.noSocialLinks}</span>}
                    </div>
                    {status === "accepted" ? (
                      <Link className="button union-card__wide-action" href={`/app/chats/${profileId}?union=1`}>
                        <MessageCircle aria-hidden="true" size={18} />
                        {copy.openChat}
                      </Link>
                    ) : (
                      <div className="union-request-box">
                        <span>{requestStatusLabel(status, copy)}</span>
                        {status === "pending" ? null : (
                          <>
                            <textarea
                              onChange={(event) => setRequestDrafts((current) => ({ ...current, [profileId]: event.target.value }))}
                              placeholder={copy.requestMessagePlaceholder}
                              value={requestDraft}
                            />
                            <button className="button-secondary" disabled={actionLoadingId === profileId || !requestDraft.trim()} onClick={() => void handleCreateRequest(candidate)} type="button">
                              {copy.sendRequest}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="union-locked-section">
                      <Lock aria-hidden="true" size={18} />
                      <span>{copy.lockedHint}</span>
                    </div>
                    <div className="union-locked-section">
                      <Lock aria-hidden="true" size={18} />
                      <span>{copy.socialLinksLocked}</span>
                    </div>
                    <button className="button union-card__wide-action" onClick={() => {
                      setSelectedCandidate(candidate);
                      setModalError("");
                    }} type="button">
                      <Lock aria-hidden="true" size={18} />
                      {copy.unlock}
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {selectedCandidate ? (
        <div
          className="union-modal-backdrop"
          role="presentation"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCandidate(null);
            }
          }}
        >
          <section
            aria-modal="true"
            aria-labelledby="union-unlock-title"
            className="union-modal"
            ref={modalRef}
            role="dialog"
          >
            <button aria-label={dictionary.common.close} className="union-icon-button" onClick={() => setSelectedCandidate(null)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
            <span className="eyebrow">{copy.unlockProfile}</span>
            <h2 id="union-unlock-title">{selectedCandidate.displayName}</h2>
            <p>{copy.unlockCost.replace("{price}", String(selectedCandidate.unlockPriceLkm))}</p>
            <UnionNotice tone="error">{modalError}</UnionNotice>
            <div className="union-modal__actions">
              <button className="button" disabled={actionLoadingId === getProfileId(selectedCandidate)} onClick={() => void handleUnlock()} type="button">
                {copy.unlockProfile}
              </button>
              <button className="button-secondary" onClick={openLkmWallet} type="button">
                {copy.openWallet}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
