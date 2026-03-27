"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createBrowserClient } from "@vedamatch/api-client";
import type { P2PMessage } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

type ChatDictionary = ReturnType<typeof useSession>["dictionary"]["chats"];

function normalizePeerUserId(rawValue: string | string[] | undefined): number | null {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function readMessageText(message: P2PMessage, dictionary: ChatDictionary): string {
  const rawContent = (message as P2PMessage & { text?: unknown; content?: unknown }).content
    ?? (message as P2PMessage & { text?: unknown }).text;

  if (typeof rawContent === "string" && rawContent.trim()) {
    return rawContent;
  }

  if (rawContent && typeof rawContent === "object") {
    const contentRecord = rawContent as Record<string, unknown>;
    const objectText = typeof contentRecord.text === "string" ? contentRecord.text : null;
    if (objectText?.trim()) {
      return objectText;
    }
    try {
      return JSON.stringify(rawContent);
    } catch {
      return dictionary.unsupportedPayload;
    }
  }

  if (message.fileName) {
    return message.fileName;
  }

  switch (message.type) {
    case "image":
      return dictionary.image;
    case "audio":
      return dictionary.audio;
    case "video":
      return dictionary.video;
    case "file":
    case "document":
      return dictionary.file;
    case "contact_card":
      return dictionary.contactCard;
    default:
      return dictionary.emptyMessage;
  }
}

function readMessageMeta(message: P2PMessage, dictionary: ChatDictionary): string {
  return String(message.createdAt || message.CreatedAt || message.type || dictionary.messageMetaFallback);
}

export default function ChatThreadPage() {
  const params = useParams<{ peerUserId: string }>();
  const { dictionary, session } = useSession();
  const [peerUserId, setPeerUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<P2PMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setPeerUserId(normalizePeerUserId(params.peerUserId));
  }, [params]);

  useEffect(() => {
    if (!peerUserId) {
      return;
    }
    createBrowserClient().getMessagesHistory(peerUserId).then((response) => {
      setMessages(Array.isArray(response.items) ? response.items : []);
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : dictionary.chats.threadLoadFailed);
    });
  }, [dictionary.chats.threadLoadFailed, peerUserId]);

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
      setError(sendError instanceof Error ? sendError.message : dictionary.chats.threadSendFailed);
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
              {dictionary.chats.backToInbox}
            </Link>
            <h1>{dictionary.chats.threadTitle}</h1>
            <p className="muted">{dictionary.chats.peerUserId}: {peerUserId ?? "..."}</p>
          </div>
        </div>
      </div>
      {error ? <div className="panel page-card"><div className="notice">{error}</div></div> : null}
      <div className="thread-panel">
        <div className="thread-messages">
          {messages.length === 0 ? (
            <div className="empty-state">{dictionary.chats.threadEmpty}</div>
          ) : messages.map((message, index) => {
            const isOwn = Boolean(currentUserId && message.senderId === currentUserId);
            const senderLabel = isOwn ? dictionary.chats.you : String(message.senderName || `${dictionary.chats.sender} #${message.senderId}`);
            return (
              <div className={isOwn ? "thread-message thread-message--own" : "thread-message"} key={String(message.id || message.ID || index)}>
                <div className="thread-message__bubble">
                  <strong>{senderLabel}</strong>
                  <p>{readMessageText(message, dictionary.chats)}</p>
                  <small>{readMessageMeta(message, dictionary.chats)}</small>
                </div>
              </div>
            );
          })}
        </div>
        <form className="composer" onSubmit={handleSend}>
          <label className="field">
            <span>{dictionary.chats.reply}</span>
            <textarea onChange={(event) => setDraft(event.target.value)} placeholder={dictionary.chats.replyPlaceholder} value={draft} />
          </label>
          <div className="composer-actions">
            <span className="muted">{dictionary.chats.contractHint}</span>
            <button className="button" disabled={sending} type="submit">
              {sending ? dictionary.chats.sending : dictionary.chats.send}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
