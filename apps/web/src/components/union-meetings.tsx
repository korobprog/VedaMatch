"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingMeetingInvite } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";
import { UnionDatingNav } from "@/components/union-dating-nav";

type MeetingsTab = "received" | "sent";

function inviteId(invite: DatingMeetingInvite): number {
  return Number(invite.ID || invite.id || 0);
}

export function UnionMeetings() {
  const { dictionary, session } = useSession();
  const copy = dictionary.datingWeb;
  const meetings = copy.meetings;
  const client = useMemo(() => createBrowserClient(), []);
  const userId = Number(session?.user?.ID || session?.user?.id || 0);

  const [tab, setTab] = useState<MeetingsTab>("received");
  const [invites, setInvites] = useState<DatingMeetingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(0);
  const [error, setError] = useState("");

  const placeLabel: Record<string, string> = {
    personal: meetings.placePersonal,
    cafe: meetings.placeCafe,
    event: meetings.placeEvent,
    online: meetings.placeOnline,
    public_place: meetings.placePublic,
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await client.getMeetingInvites();
      setInvites(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [client, copy.loadFailed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRespond(invite: DatingMeetingInvite, status: "accepted" | "rejected") {
    const id = inviteId(invite);
    if (!id) {
      return;
    }
    setBusyId(id);
    setError("");
    try {
      await client.respondMeetingInvite(id, status);
      await load();
    } catch (respondError) {
      setError(respondError instanceof Error ? respondError.message : meetings.respondFailed);
    } finally {
      setBusyId(0);
    }
  }

  const received = invites.filter((invite) => invite.inviteeId === userId);
  const sent = invites.filter((invite) => invite.inviterId === userId);
  const visible = tab === "received" ? received : sent;

  return (
    <div className="stack dating-meetings-page">
      <UnionDatingNav />

      <section className="panel page-card">
        <div className="section-head">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{meetings.title}</h1>
        </div>

        <div className="contacts-tabs" aria-label={meetings.title}>
          <button className="contacts-tab" data-active={tab === "received"} onClick={() => setTab("received")} type="button">
            {meetings.tabReceived}
          </button>
          <button className="contacts-tab" data-active={tab === "sent"} onClick={() => setTab("sent")} type="button">
            {meetings.tabSent}
          </button>
        </div>

        {error ? <div className="notice error-copy">{error}</div> : null}
        {loading ? <div className="notice">{copy.loading}</div> : null}

        {!loading && visible.length === 0 ? <div className="empty-state">{meetings.empty}</div> : null}

        {!loading && visible.length > 0 ? (
          <ul className="dating-meeting-list">
            {visible.map((invite) => {
              const id = inviteId(invite);
              const isPending = invite.status === "pending";
              const canRespond = tab === "received" && isPending;
              return (
                <li className="dating-meeting-item" key={id}>
                  <div className="dating-meeting-item__body">
                    <strong>{placeLabel[invite.placeType] || invite.placeType}</strong>
                    {invite.message ? <p>{invite.message}</p> : null}
                    <span className="muted">{invite.status}</span>
                  </div>
                  {canRespond ? (
                    <div className="dating-meeting-item__actions">
                      <button
                        className="button-secondary"
                        disabled={busyId === id}
                        onClick={() => void handleRespond(invite, "accepted")}
                        type="button"
                      >
                        {meetings.accept}
                      </button>
                      <button
                        className="button-secondary danger"
                        disabled={busyId === id}
                        onClick={() => void handleRespond(invite, "rejected")}
                        type="button"
                      >
                        {meetings.decline}
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
