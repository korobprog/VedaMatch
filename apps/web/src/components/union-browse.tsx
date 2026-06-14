"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingCandidate, DatingMode } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";
import { UnionDatingNav } from "@/components/union-dating-nav";

const MODES: DatingMode[] = ["family", "friendship", "seva", "business"];

function candidateId(candidate: DatingCandidate): number {
  return Number(candidate.ID || candidate.id || 0);
}

function candidateName(candidate: DatingCandidate): string {
  return candidate.spiritualName || candidate.karmicName || candidate.nickname || `#${candidateId(candidate)}`;
}

export function UnionBrowse() {
  const { dictionary, session } = useSession();
  const copy = dictionary.datingWeb;
  const browse = copy.browse;
  const client = useMemo(() => createBrowserClient(), []);
  const userId = Number(session?.user?.ID || session?.user?.id || 0);

  const [candidates, setCandidates] = useState<DatingCandidate[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [likedIds, setLikedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(0);
  const [error, setError] = useState("");

  const [mode, setMode] = useState<DatingMode>("family");
  const [city, setCity] = useState("");
  const [minAge, setMinAge] = useState("");
  const [maxAge, setMaxAge] = useState("");
  const [newOnly, setNewOnly] = useState(false);

  const modeLabel: Record<DatingMode, string> = {
    family: copy.family,
    friendship: copy.friendship,
    seva: copy.seva,
    business: copy.business,
  };

  const load = useCallback(async () => {
    if (!userId) {
      setError(copy.missingUser);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await client.getDatingCandidates({
        userId,
        mode,
        city: city || undefined,
        minAge: minAge || undefined,
        maxAge: maxAge || undefined,
        isNew: newOnly || undefined,
      });
      setCandidates(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : browse.loadFailed);
      setCandidates([]);
    } finally {
      setLoading(false);
    }
  }, [browse.loadFailed, city, client, copy.missingUser, maxAge, minAge, mode, newOnly, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    client
      .getDatingCities()
      .then((result) => setCities(Array.isArray(result) ? result : []))
      .catch(() => setCities([]));
  }, [client]);

  async function handleLike(candidate: DatingCandidate) {
    const id = candidateId(candidate);
    if (!id || likedIds.includes(id)) {
      return;
    }
    setBusyId(id);
    try {
      await client.addDatingFavorite({ candidateId: id });
      setLikedIds((current) => [...current, id]);
    } catch {
      // keep silent in the list; the candidate page surfaces detailed errors
    } finally {
      setBusyId(0);
    }
  }

  return (
    <div className="stack dating-browse-page">
      <UnionDatingNav />

      <section className="panel page-card">
        <div className="section-head">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{browse.title}</h1>
          <p>{browse.subtitle}</p>
        </div>

        <div className="dating-filters">
          <div className="dating-mode-control" role="group" aria-label={browse.mode}>
            {MODES.map((value) => (
              <button
                className={mode === value ? "dating-mode-control__item is-active" : "dating-mode-control__item"}
                key={value}
                onClick={() => setMode(value)}
                type="button"
              >
                {modeLabel[value]}
              </button>
            ))}
          </div>

          <div className="dating-filter-row">
            <label className="field">
              <span>{browse.city}</span>
              <select onChange={(event) => setCity(event.target.value)} value={city}>
                <option value="">{browse.allCities}</option>
                {cities.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{browse.ageFrom}</span>
              <input inputMode="numeric" onChange={(event) => setMinAge(event.target.value)} value={minAge} />
            </label>
            <label className="field">
              <span>{browse.ageTo}</span>
              <input inputMode="numeric" onChange={(event) => setMaxAge(event.target.value)} value={maxAge} />
            </label>
            <label className="dating-toggle">
              <input checked={newOnly} onChange={(event) => setNewOnly(event.target.checked)} type="checkbox" />
              <span>{browse.newOnly}</span>
            </label>
          </div>

          <div className="actions">
            <button className="button" disabled={loading} onClick={() => void load()} type="button">
              {browse.apply}
            </button>
            <button
              className="button-secondary"
              onClick={() => {
                setCity("");
                setMinAge("");
                setMaxAge("");
                setNewOnly(false);
              }}
              type="button"
            >
              {browse.reset}
            </button>
          </div>
        </div>
      </section>

      <section className="panel page-card">
        {error ? <div className="notice error-copy">{error}</div> : null}
        {loading ? <div className="notice">{copy.loading}</div> : null}

        {!loading && !error && candidates.length === 0 ? (
          <div className="empty-state">{browse.empty}</div>
        ) : null}

        {!loading && candidates.length > 0 ? (
          <div className="dating-candidate-grid">
            {candidates.map((candidate) => {
              const id = candidateId(candidate);
              const avatar = candidate.avatarUrl ? client.getMediaUrl(candidate.avatarUrl) : "";
              const liked = likedIds.includes(id);
              const meta = [candidate.city, candidate.intentions].filter(Boolean).join(" • ");
              return (
                <article className="dating-candidate-card" key={id}>
                  <Link className="dating-candidate-card__media" href={`/app/dating/${id}`}>
                    {avatar ? <img alt={candidateName(candidate)} src={avatar} /> : <span>{copy.noPhoto}</span>}
                  </Link>
                  <div className="dating-candidate-card__body">
                    <strong>{candidateName(candidate)}</strong>
                    {meta ? <span className="muted">{meta}</span> : null}
                    {candidate.bio ? <p className="dating-candidate-card__bio">{candidate.bio}</p> : null}
                  </div>
                  <div className="dating-candidate-card__actions">
                    <button
                      className="button-secondary"
                      disabled={liked || busyId === id}
                      onClick={() => void handleLike(candidate)}
                      type="button"
                    >
                      {liked ? browse.liked : browse.like}
                    </button>
                    <Link className="button" href={`/app/dating/${id}`}>
                      {browse.view}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>
    </div>
  );
}
