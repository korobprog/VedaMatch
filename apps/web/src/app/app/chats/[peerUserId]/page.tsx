"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import type { P2PMessage } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

export default function ChatThreadPage() {
  const params = useParams<{ peerUserId: string }>();
  const { session } = useSession();
  const [peerUserId, setPeerUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const parsed = Number.parseInt(params.peerUserId, 10);
    setPeerUserId(Number.isFinite(parsed) ? parsed : null);
  }, [params]);

  useEffect(() => {
    if (!peerUserId) {
      return;
    }
    createBrowserClient().getMessagesHistory(peerUserId).then((response) => {
      setMessages(response.items || []);
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load messages.");
    });
  }, [peerUserId]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!peerUserId || !draft.trim()) {
      return;
    }

    setSending(true);
    setError("");
    try {
      const nextMessage = await createBrowserClient().sendMessage(peerUserId, draft.trim());
      setMessages((current) => [...current, nextMessage]);
      setDraft("");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  const currentUserId = session?.user?.ID || session?.user?.id;

  return (
    <div className="stack">
      <div className="panel page-card">
        <div className="thread-head">
          <div className="stack" style={{ gap: 8 }}>
            <Link className="button-secondary" href="/app/chats">
              Back to inbox
            </Link>
            <h1>Direct chat thread</h1>
            <p className="muted">Peer user ID: {peerUserId ?? "..."}</p>
          </div>
        </div>
      </div>
      {error ? <div className="panel page-card"><div className="notice">{error}</div></div> : null}
      <div className="thread-panel">
        <div className="thread-messages">
          {messages.length === 0 ? (
            <div className="empty-state">No messages yet.</div>
          ) : messages.map((message, index) => {
            const isOwn = Boolean(currentUserId && message.senderId === currentUserId);
            return (
              <div className={isOwn ? "thread-message thread-message--own" : "thread-message"} key={String(message.id || message.ID || index)}>
                <div className="thread-message__bubble">
                  <strong>{isOwn ? "You" : message.senderName || `Sender #${message.senderId}`}</strong>
                  <p>{message.content}</p>
                  <small>{message.createdAt || message.CreatedAt || message.type}</small>
                </div>
              </div>
            );
          })}
        </div>
        <form className="composer" onSubmit={handleSend}>
          <label className="field">
            <span>Reply</span>
            <textarea onChange={(event) => setDraft(event.target.value)} placeholder="Write a direct message..." value={draft} />
          </label>
          <div className="composer-actions">
            <span className="muted">Messages are sent through the shared `/api/messages` contract.</span>
            <button className="button" disabled={sending} type="submit">
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
