"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingFavorite, DatingProfile } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";
import { UnionDatingNav } from "@/components/union-dating-nav";

type LikesTab = "favorites" | "likedMe";

function favoriteId(favorite: DatingFavorite): number {
  return Number(favorite.ID || favorite.id || 0);
}

function profileName(profile?: DatingProfile): string {
  if (!profile) {
    return "—";
  }
  return profile.spiritualName || profile.karmicName || profile.nickname || `#${profile.ID || profile.id || ""}`;
}

export function UnionLikes() {
  const { dictionary, session } = useSession();
  const copy = dictionary.datingWeb;
  const likes = copy.likes;
  const client = useMemo(() => createBrowserClient(), []);
  const userId = Number(session?.user?.ID || session?.user?.id || 0);

  const [tab, setTab] = useState<LikesTab>("favorites");
  const [favorites, setFavorites] = useState<DatingFavorite[]>([]);
  const [likedMe, setLikedMe] = useState<DatingProfile[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!userId) {
      setError(copy.missingUser);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const [favoritesResult, likedMeResult, countResult] = await Promise.all([
        client.getDatingFavorites(userId),
        client.getWhoLikedMe(userId).catch(() => [] as DatingProfile[]),
        client.getDatingLikesCount(userId).catch(() => ({ count: 0 })),
      ]);
      setFavorites(Array.isArray(favoritesResult) ? favoritesResult : []);
      setLikedMe(Array.isArray(likedMeResult) ? likedMeResult : []);
      setCount(countResult.count || 0);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [client, copy.loadFailed, copy.missingUser, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRemove(favorite: DatingFavorite) {
    const id = favoriteId(favorite);
    if (!id) {
      return;
    }
    setBusyId(id);
    setNotice("");
    try {
      await client.removeDatingFavorite(id);
      setFavorites((current) => current.filter((item) => favoriteId(item) !== id));
      setNotice(likes.removed);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : copy.loadFailed);
    } finally {
      setBusyId(0);
    }
  }

  return (
    <div className="stack dating-likes-page">
      <UnionDatingNav />

      <section className="panel page-card">
        <div className="section-head">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{likes.title}</h1>
          <p>{likes.count.replace("{count}", String(count))}</p>
        </div>

        <div className="contacts-tabs" aria-label={likes.title}>
          <button className="contacts-tab" data-active={tab === "favorites"} onClick={() => setTab("favorites")} type="button">
            {likes.tabFavorites}
          </button>
          <button className="contacts-tab" data-active={tab === "likedMe"} onClick={() => setTab("likedMe")} type="button">
            {likes.tabWhoLikedMe}
          </button>
        </div>

        {error ? <div className="notice error-copy">{error}</div> : null}
        {notice ? <div className="notice success">{notice}</div> : null}
        {loading ? <div className="notice">{copy.loading}</div> : null}

        {!loading && tab === "favorites" ? (
          favorites.length ? (
            <div className="dating-candidate-grid">
              {favorites.map((favorite) => {
                const id = favoriteId(favorite);
                const candidate = favorite.candidate;
                const targetId = favorite.candidateId || candidate?.ID || candidate?.id || 0;
                const avatar = candidate?.avatarUrl ? client.getMediaUrl(candidate.avatarUrl) : "";
                return (
                  <article className="dating-candidate-card" key={id}>
                    <Link className="dating-candidate-card__media" href={`/app/dating/${targetId}`}>
                      {avatar ? <img alt={profileName(candidate)} src={avatar} /> : <span>{copy.noPhoto}</span>}
                    </Link>
                    <div className="dating-candidate-card__body">
                      <strong>{profileName(candidate)}</strong>
                      {candidate?.city ? <span className="muted">{candidate.city}</span> : null}
                    </div>
                    <div className="dating-candidate-card__actions">
                      <button
                        className="button-secondary danger"
                        disabled={busyId === id}
                        onClick={() => void handleRemove(favorite)}
                        type="button"
                      >
                        {likes.remove}
                      </button>
                      <Link className="button" href={`/app/dating/${targetId}`}>
                        {copy.browse.view}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">{likes.noFavorites}</div>
          )
        ) : null}

        {!loading && tab === "likedMe" ? (
          likedMe.length ? (
            <div className="dating-candidate-grid">
              {likedMe.map((person) => {
                const id = Number(person.ID || person.id || 0);
                const avatar = person.avatarUrl ? client.getMediaUrl(person.avatarUrl) : "";
                return (
                  <article className="dating-candidate-card" key={id}>
                    <Link className="dating-candidate-card__media" href={`/app/dating/${id}`}>
                      {avatar ? <img alt={profileName(person)} src={avatar} /> : <span>{copy.noPhoto}</span>}
                    </Link>
                    <div className="dating-candidate-card__body">
                      <strong>{profileName(person)}</strong>
                      {person.city ? <span className="muted">{person.city}</span> : null}
                    </div>
                    <div className="dating-candidate-card__actions">
                      <Link className="button" href={`/app/dating/${id}`}>
                        {copy.browse.view}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">{likes.noLikes}</div>
          )
        ) : null}
      </section>
    </div>
  );
}
