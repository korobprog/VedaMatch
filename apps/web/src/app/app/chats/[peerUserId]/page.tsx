"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import type { P2PMessage } from "@vedamatch/domain-types";

export default function ChatThreadPage() {
  const params = useParams<{ peerUserId: string }>();
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

  return (
    <div className="panel page-card">
      <h1>Direct chat thread</h1>
      <p className="muted">Peer user ID: {peerUserId ?? "..."}</p>
      {error ? <div className="notice">{error}</div> : null}
      <div className="list" style={{ marginBottom: 18 }}>
        {messages.length === 0 ? (
          <div className="empty-state">No messages yet.</div>
        ) : messages.map((message, index) => (
          <div className="list-item" key={String(message.id || message.ID || index)}>
            <strong>{message.senderName || `Sender #${message.senderId}`}</strong>
            <p>{message.content}</p>
            <small>{message.createdAt || message.CreatedAt || message.type}</small>
          </div>
        ))}
      </div>
      <form className="form-grid" onSubmit={handleSend}>
        <label className="field">
          <span>Reply</span>
          <textarea onChange={(event) => setDraft(event.target.value)} value={draft} />
        </label>
        <button className="button" disabled={sending} type="submit">
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}

