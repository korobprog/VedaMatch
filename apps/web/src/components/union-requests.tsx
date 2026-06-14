"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Send, X } from "lucide-react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { DatingCandidate, DatingChatRequest, DatingChatRequestDirection, DatingChatRequestStatus } from "@vedamatch/domain-types";
import type { Dictionary } from "@vedamatch/i18n";
import { useSession } from "@/components/session-context";

type UnionCopy = Dictionary["union"];

function getProfileId(profile: DatingCandidate | null | undefined): number {
  return profile?.ID || profile?.id || 0;
}

function getProfileName(profile: DatingCandidate | null | undefined, fallbackId: number): string {
  return profile?.displayName || `#${fallbackId}`;
}

function statusLabel(status: DatingChatRequestStatus, copy: UnionCopy): string {
  switch (status) {
    case "accepted":
      return copy.requestAccepted;
    case "rejected":
      return copy.requestRejected;
    case "canceled":
      return copy.cancel;
    default:
      return copy.requestPending;
  }
}

export function UnionRequests() {
  const { dictionary } = useSession();
  const copy = dictionary.union;
  const client = useMemo(() => createBrowserClient(), []);
  const [direction, setDirection] = useState<DatingChatRequestDirection>("incoming");
  const [incoming, setIncoming] = useState<DatingChatRequest[]>([]);
  const [outgoing, setOutgoing] = useState<DatingChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [incomingResponse, outgoingResponse] = await Promise.all([
        client.listDatingChatRequests({ direction: "incoming" }),
        client.listDatingChatRequests({ direction: "outgoing" }),
      ]);
      setIncoming(incomingResponse.items || []);
      setOutgoing(outgoingResponse.items || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : copy.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [client, copy.loadFailed]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  async function respond(requestId: number, action: "accept" | "reject" | "cancel") {
    setActionLoadingId(requestId);
    setError("");
    try {
      await client.respondDatingChatRequest(requestId, action);
      await loadRequests();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : copy.actionFailed);
    } finally {
      setActionLoadingId(null);
    }
  }

  const items = direction === "incoming" ? incoming : outgoing;

  return (
    <div className="union-page">
      <section className="union-hero union-hero--compact">
        <div className="union-hero__copy">
          <span className="eyebrow">{copy.eyebrow}</span>
          <h1>{copy.requests}</h1>
          <p>{copy.requestsSubtitle}</p>
        </div>
        <div className="union-hero__actions">
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union">
            {copy.title}
          </Link>
          <Link className="dashboard-action dashboard-action--ghost" href="/app/union/profile">
            {copy.editProfile}
          </Link>
        </div>
      </section>

      <div className="union-tabs" aria-label={copy.requests}>
        <button data-active={direction === "incoming"} onClick={() => setDirection("incoming")} type="button">
          {copy.incomingRequests}
        </button>
        <button data-active={direction === "outgoing"} onClick={() => setDirection("outgoing")} type="button">
          {copy.outgoingRequests}
        </button>
      </div>

      {loading ? <div className="empty-state">{dictionary.common.loading}</div> : null}
      {error ? <div className="notice">{error}</div> : null}
      {!loading && items.length === 0 ? <div className="empty-state">{copy.noRequests}</div> : null}

      <section className="union-request-list">
        {items.map((request) => {
          const peer = direction === "incoming" ? request.requester : request.recipient;
          const peerId = getProfileId(peer) || (direction === "incoming" ? request.requesterId : request.recipientId);
          const canOpenChat = request.status === "accepted" && peerId;
          return (
            <article className="union-request-card" key={request.id || request.ID}>
              <div className="union-request-card__head">
                <div>
                  <h2>{getProfileName(peer, peerId)}</h2>
                  <span>{statusLabel(request.status, copy)}</span>
                </div>
                <Send aria-hidden="true" size={22} />
              </div>
              <p>{request.message}</p>
              <div className="union-request-card__actions">
                {direction === "incoming" && request.status === "pending" ? (
                  <>
                    <button className="button" disabled={actionLoadingId === request.id} onClick={() => void respond(request.id, "accept")} type="button">
                      <Check aria-hidden="true" size={18} />
                      {copy.accept}
                    </button>
                    <button className="button-secondary" disabled={actionLoadingId === request.id} onClick={() => void respond(request.id, "reject")} type="button">
                      <X aria-hidden="true" size={18} />
                      {copy.reject}
                    </button>
                  </>
                ) : null}
                {direction === "outgoing" && request.status === "pending" ? (
                  <button className="button-secondary" disabled={actionLoadingId === request.id} onClick={() => void respond(request.id, "cancel")} type="button">
                    <X aria-hidden="true" size={18} />
                    {copy.cancel}
                  </button>
                ) : null}
                {canOpenChat ? (
                  <Link className="button" href={`/app/chats/${peerId}?union=1`}>
                    <MessageCircle aria-hidden="true" size={18} />
                    {copy.openChat}
                  </Link>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
