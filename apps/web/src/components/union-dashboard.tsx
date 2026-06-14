"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartHandshake, Search, SlidersHorizontal, Wallet } from "lucide-react";
import { buildVedamatchUrl, createBrowserClient, getWallet } from "@vedamatch/api-client";
import type { DatingCandidate, DatingMode, WalletResponse } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

type UnionFilters = {
  mode: DatingMode;
  city: string;
  minAge: string;
  maxAge: string;
  madh: string;
  identity: string;
  skills: string;
  industry: string;
};

const EMPTY_FILTERS: UnionFilters = {
  mode: "family",
  city: "",
  minAge: "",
  maxAge: "",
  madh: "",
  identity: "",
  skills: "",
  industry: "",
};

function candidateId(candidate: DatingCandidate): number {
  return Number(candidate.ID || candidate.id || 0);
}

function candidateName(candidate: DatingCandidate): string {
  return candidate.spiritualName || candidate.karmicName || candidate.nickname || `#${candidateId(candidate)}`;
}

function candidatePhoto(candidate: DatingCandidate): string {
  const firstPhoto = candidate.photos?.[0];
  if (firstPhoto?.url) {
    return firstPhoto.url;
  }
  return candidate.avatarUrl || "";
}

function openLkmWallet() {
  const host = window.location.hostname;
  const returnTo = encodeURIComponent(`${window.location.origin}/app/union`);
  window.location.href = buildVedamatchUrl(host, "lkm", "/", `?returnTo=${returnTo}`);
}

export function UnionDashboard() {
  const { dictionary, session } = useSession();
  const copy = dictionary.datingWeb;
  const browse = copy.browse;
  const client = useMemo(() => createBrowserClient(), []);
  const userId = Number(session?.user?.ID || session?.user?.id || 0);
  const accessToken = session?.accessToken || "";

  const [filters, setFilters] = useState<UnionFilters>(EMPTY_FILTERS);
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [candidates, setCandidates] = useState<DatingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const modeLabel: Record<DatingMode, string> = {
    family: copy.family,
    friendship: copy.friendship,
    seva: copy.seva,
    business: copy.business,
  };

  const loadUnion = useCallback(async (nextFilters: UnionFilters) => {
    if (!userId) {
      setError(copy.missingUser);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const [nextWallet, nextCandidates] = await Promise.all([
        accessToken ? getWallet(client.baseUrl, accessToken).catch(() => null) : Promise.resolve(null),
        client.getDatingCandidates({
          userId,
          mode: nextFilters.mode,
          city: nextFilters.city || undefined,
          minAge: nextFilters.minAge || undefined,
          maxAge: nextFilters.maxAge || undefined,
          madh: nextFilters.madh || undefined,
          identity: nextFilters.identity || undefined,
          skills: nextFilters.skills || undefined,
          industry: nextFilters.industry || undefined,
        }),
      ]);
      setWallet(nextWallet);
      setCandidates(Array.isArray(nextCandidates) ? nextCandidates : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : browse.loadFailed);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, browse.loadFailed, client, copy.missingUser, userId]);

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

  const balanceLabel = wallet ? `${wallet.balance} ${wallet.currency || "LKM"}` : "LKM";

  return (
    <div className="union-page">
      <section className="union-hero">
        <div className="union-hero__copy">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{browse.title}</h1>
          <p>{browse.subtitle}</p>
        </div>
        <div className="union-hero__actions">
          <div className="union-balance" aria-label={dictionary.nav.wallet}>
            <Wallet aria-hidden="true" size={20} />
            <span>{dictionary.nav.wallet}</span>
            <strong>{balanceLabel}</strong>
          </div>
          <button className="dashboard-action" onClick={openLkmWallet} type="button">
            <Wallet aria-hidden="true" size={18} />
            {dictionary.nav.wallet}
          </button>
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union/profile">
            {copy.nav.profile}
          </Link>
          <Link className="dashboard-action dashboard-action--ghost" href="/app/dating/likes">
            {copy.nav.likes}
          </Link>
        </div>
      </section>

      <form className="union-filters" onSubmit={handleFilterSubmit}>
        <div className="union-section-head">
          <SlidersHorizontal aria-hidden="true" size={20} />
          <h2>{browse.filters}</h2>
        </div>
        <label className="field">
          <span>{browse.mode}</span>
          <select value={filters.mode} onChange={(event) => setFilters((current) => ({ ...current, mode: event.target.value as DatingMode }))}>
            {(["family", "friendship", "business", "seva"] as DatingMode[]).map((mode) => (
              <option key={mode} value={mode}>{modeLabel[mode]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>{browse.city}</span>
          <input value={filters.city} onChange={(event) => setFilters((current) => ({ ...current, city: event.target.value }))} />
        </label>
        <label className="field">
          <span>{browse.ageFrom}</span>
          <input inputMode="numeric" value={filters.minAge} onChange={(event) => setFilters((current) => ({ ...current, minAge: event.target.value }))} />
        </label>
        <label className="field">
          <span>{browse.ageTo}</span>
          <input inputMode="numeric" value={filters.maxAge} onChange={(event) => setFilters((current) => ({ ...current, maxAge: event.target.value }))} />
        </label>
        <label className="field">
          <span>{dictionary.profile.identity}</span>
          <input value={filters.identity} onChange={(event) => setFilters((current) => ({ ...current, identity: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.fields.elementalPrimary}</span>
          <input value={filters.madh} onChange={(event) => setFilters((current) => ({ ...current, madh: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.interests}</span>
          <input value={filters.skills} onChange={(event) => setFilters((current) => ({ ...current, skills: event.target.value }))} />
        </label>
        <label className="field">
          <span>{copy.business}</span>
          <input value={filters.industry} onChange={(event) => setFilters((current) => ({ ...current, industry: event.target.value }))} />
        </label>
        <div className="union-filter-actions">
          <button className="button" disabled={loading} type="submit">
            <Search aria-hidden="true" size={18} />
            {browse.apply}
          </button>
          <button className="button-secondary" onClick={() => void handleReset()} type="button">
            {browse.reset}
          </button>
        </div>
      </form>

      {error ? <div className="notice error-copy">{error}</div> : null}
      {loading ? <div className="empty-state">{copy.loading}</div> : null}
      {!loading && !error && candidates.length === 0 ? <div className="empty-state">{browse.empty}</div> : null}

      {!loading && candidates.length > 0 ? (
        <section className="union-grid" aria-label={browse.title}>
          {candidates.map((candidate) => {
            const id = candidateId(candidate);
            const photo = candidatePhoto(candidate);
            const photoUrl = photo ? client.getMediaUrl(photo) : "";
            const facts = [
              [copy.city, candidate.city],
              [copy.intentions, candidate.intentions],
              [copy.interests, candidate.interests],
              [copy.lookingFor, candidate.lookingFor],
            ].filter(([, value]) => Boolean(value));

            return (
              <article className="union-card" key={id || candidateName(candidate)}>
                <Link className="union-card__photo" href={`/app/dating/${id}`}>
                  {photoUrl ? <img alt={candidateName(candidate)} src={photoUrl} /> : <HeartHandshake aria-hidden="true" size={44} />}
                </Link>
                <div className="union-card__body">
                  <div className="union-card__title">
                    <h2>{candidateName(candidate)}</h2>
                    <span>{modeLabel[filters.mode]}</span>
                  </div>
                  <div className="union-facts">
                    {facts.map(([label, value]) => (
                      <div className="union-fact" key={`${id}-${label}`}>
                        <span>{label}</span>
                        <strong>{String(value)}</strong>
                      </div>
                    ))}
                  </div>
                  {candidate.bio ? <p className="union-card__bio">{candidate.bio}</p> : null}
                  <Link className="button union-card__wide-action" href={`/app/dating/${id}`}>
                    {browse.view}
                  </Link>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
