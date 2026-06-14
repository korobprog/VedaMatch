"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingProfile, UserMedia } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";
import { UnionDatingNav } from "@/components/union-dating-nav";

const PLACE_TYPES = ["personal", "cafe", "event", "online", "public_place"] as const;

function profileName(profile: DatingProfile): string {
  return profile.spiritualName || profile.karmicName || profile.nickname || `#${profile.ID || profile.id || ""}`;
}

export function UnionCandidate() {
  const params = useParams<{ candidateId: string }>();
  const candidateId = Number(params?.candidateId || 0);
  const { dictionary, session } = useSession();
  const copy = dictionary.datingWeb;
  const cand = copy.candidate;
  const meetings = copy.meetings;
  const client = useMemo(() => createBrowserClient(), []);
  const userId = Number(session?.user?.ID || session?.user?.id || 0);

  const [profile, setProfile] = useState<DatingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const [compatibility, setCompatibility] = useState("");
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState("");

  const [placeType, setPlaceType] = useState<string>("personal");
  const [inviteMessage, setInviteMessage] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteNotice, setInviteNotice] = useState("");
  const [inviteError, setInviteError] = useState("");

  const placeLabel: Record<(typeof PLACE_TYPES)[number], string> = {
    personal: meetings.placePersonal,
    cafe: meetings.placeCafe,
    event: meetings.placeEvent,
    online: meetings.placeOnline,
    public_place: meetings.placePublic,
  };

  const load = useCallback(async () => {
    if (!candidateId) {
      setError(cand.notFound);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await client.getDatingProfile(candidateId);
      setProfile(result);
      if (userId) {
        const fav = await client.checkDatingIsFavorited(userId, candidateId).catch(() => ({ isFavorited: false }));
        setLiked(Boolean(fav.isFavorited));
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : cand.notFound);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [cand.notFound, candidateId, client, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleLike() {
    if (!candidateId || liked) {
      return;
    }
    setLikeBusy(true);
    try {
      await client.addDatingFavorite({ candidateId });
      setLiked(true);
    } catch {
      // ignore; non-critical
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleCheckCompatibility() {
    if (!userId || !candidateId) {
      return;
    }
    setCompatLoading(true);
    setCompatError("");
    try {
      const result = await client.checkDatingCompatibility(userId, candidateId);
      setCompatibility(result.compatibility || "");
    } catch (compatErr) {
      setCompatError(compatErr instanceof Error ? compatErr.message : cand.compatibilityFailed);
    } finally {
      setCompatLoading(false);
    }
  }

  async function handleInvite() {
    if (!candidateId) {
      return;
    }
    setInviteBusy(true);
    setInviteError("");
    setInviteNotice("");
    try {
      await client.createMeetingInvite({ inviteeId: candidateId, placeType, message: inviteMessage.trim() });
      setInviteMessage("");
      setInviteNotice(meetings.sent);
    } catch (inviteErr) {
      setInviteError(inviteErr instanceof Error ? inviteErr.message : meetings.sendFailed);
    } finally {
      setInviteBusy(false);
    }
  }

  const photos: UserMedia[] = profile?.photos || [];
  const avatar = profile?.avatarUrl ? client.getMediaUrl(profile.avatarUrl) : "";

  return (
    <div className="stack dating-candidate-page">
      <UnionDatingNav />

      <section className="panel page-card">
        <Link className="button-secondary" href="/app/dating/browse">
          {cand.back}
        </Link>

        {error ? <div className="notice error-copy">{error}</div> : null}
        {loading ? <div className="notice">{copy.loading}</div> : null}

        {profile ? (
          <div className="dating-candidate-detail">
            <div className="dating-candidate-detail__media">
              {avatar ? <img alt={profileName(profile)} src={avatar} /> : <span>{copy.noPhoto}</span>}
              {photos.length > 0 ? (
                <div className="dating-photo-grid">
                  {photos.map((photo) => (
                    <img
                      alt={profileName(profile)}
                      key={String(photo.ID || photo.id || photo.url)}
                      src={client.getMediaUrl(photo.url)}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="dating-candidate-detail__body">
              <h1>{profileName(profile)}</h1>
              {profile.city ? <p className="muted">{profile.city}</p> : null}

              {profile.bio ? (
                <div className="field">
                  <span>{cand.about}</span>
                  <p>{profile.bio}</p>
                </div>
              ) : null}
              {profile.interests ? (
                <div className="field">
                  <span>{cand.interests}</span>
                  <p>{profile.interests}</p>
                </div>
              ) : null}
              {profile.lookingFor ? (
                <div className="field">
                  <span>{cand.lookingFor}</span>
                  <p>{profile.lookingFor}</p>
                </div>
              ) : null}

              <div className="actions">
                <button className="button-secondary" disabled={liked || likeBusy} onClick={() => void handleLike()} type="button">
                  {liked ? copy.browse.liked : copy.browse.like}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {profile ? (
        <section className="panel page-card">
          <div className="section-head">
            <h2>{cand.compatibilityTitle}</h2>
          </div>
          {compatError ? <div className="notice error-copy">{compatError}</div> : null}
          {compatibility ? (
            <div className="dating-compatibility-text">{compatibility}</div>
          ) : (
            <button className="button" disabled={compatLoading || !userId} onClick={() => void handleCheckCompatibility()} type="button">
              {compatLoading ? cand.compatibilityLoading : cand.checkCompatibility}
            </button>
          )}
        </section>
      ) : null}

      {profile ? (
        <section className="panel page-card">
          <div className="section-head">
            <h2>{cand.invite}</h2>
          </div>
          {inviteError ? <div className="notice error-copy">{inviteError}</div> : null}
          {inviteNotice ? <div className="notice success">{inviteNotice}</div> : null}
          <label className="field">
            <span>{meetings.placeType}</span>
            <select onChange={(event) => setPlaceType(event.target.value)} value={placeType}>
              {PLACE_TYPES.map((value) => (
                <option key={value} value={value}>
                  {placeLabel[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>{meetings.message}</span>
            <textarea onChange={(event) => setInviteMessage(event.target.value)} value={inviteMessage} />
          </label>
          <div className="actions">
            <button className="button" disabled={inviteBusy} onClick={() => void handleInvite()} type="button">
              {inviteBusy ? meetings.sending : meetings.send}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
