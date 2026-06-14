"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartHandshake, Lock, MessageCircle, Search, SlidersHorizontal, Wallet, X } from "lucide-react";
import { buildVedamatchUrl, createBrowserClient } from "@vedamatch/api-client";
import type { DatingCandidate, DatingCandidatesQuery, DatingChatRequestStatus, DatingMode, WalletResponse } from "@vedamatch/domain-types";
import type { Dictionary } from "@vedamatch/i18n";
import { useSession } from "@/components/session-context";

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

function getProfileId(candidate: DatingCandidate): number {
  return candidate.ID || candidate.id || 0;
}

function getCandidatePhoto(candidate: DatingCandidate): string {
  const firstPhoto = candidate.photos?.[0];
  if (typeof firstPhoto === "string") {
    return firstPhoto;
  }
  return candidate.avatarUrl || candidate.avatar_url || firstPhoto?.url || "";
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.filter(Boolean).join(", ");
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
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

export function UnionDashboard() {
  const { dictionary } = useSession();
  const copy = dictionary.union;
  const client = useMemo(() => createBrowserClient(), []);
  const [filters, setFilters] = useState<UnionFilters>(EMPTY_FILTERS);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [candidates, setCandidates] = useState<DatingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<DatingCandidate | null>(null);
  const [modalError, setModalError] = useState("");
  const [error, setError] = useState("");
  const [requestDrafts, setRequestDrafts] = useState<Record<number, string>>({});
  const [notice, setNotice] = useState("");

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
        <label className="field">
          <span>{copy.city}</span>
          <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} />
        </label>
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
          <input value={filters.madh} onChange={(event) => setFilters((current) => ({ ...current, madh: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.identity}</span>
          <input value={filters.identity} onChange={(event) => setFilters((current) => ({ ...current, identity: event.target.value }))} />
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

      {notice ? <div className="notice">{notice}</div> : null}
      {error ? <div className="notice">{error}</div> : null}

      {loading ? <div className="empty-state">{dictionary.common.loading}</div> : null}
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
                      <div className="union-meter">
                        <span>{copy.compatibility}</span>
                        <strong>{candidate.compatibilityScore}</strong>
                      </div>
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
        <div className="union-modal-backdrop" role="presentation">
          <section aria-modal="true" className="union-modal" role="dialog">
            <button aria-label={dictionary.common.error} className="union-icon-button" onClick={() => setSelectedCandidate(null)} type="button">
              <X aria-hidden="true" size={18} />
            </button>
            <span className="eyebrow">{copy.unlockProfile}</span>
            <h2>{selectedCandidate.displayName}</h2>
            <p>{copy.unlockCost.replace("{price}", String(selectedCandidate.unlockPriceLkm))}</p>
            {modalError ? <div className="notice">{modalError}</div> : null}
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
