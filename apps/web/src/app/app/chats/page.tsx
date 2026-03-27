"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { ChatConversationPreview } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

type ChatDictionary = ReturnType<typeof useSession>["dictionary"]["chats"];

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readUserLabel(value: unknown): string {
  if (!value || typeof value !== "object") {
    return "";
  }

  const record = value as Record<string, unknown>;
  return readString(record.nicknameDisplay)
    || readString(record.displayName)
    || readString(record.spiritualName)
    || readString(record.karmicName)
    || readString(record.email);
}

function readConversationTitle(conversation: ChatConversationPreview, dictionary: ChatDictionary): string {
  return readString(conversation.peerUserPreview)
    || readUserLabel(conversation.peerUserPreview)
    || readUserLabel(conversation.peerUser)
    || `${dictionary.sender} #${conversation.peerUserId}`;
}

function readConversationPreview(conversation: ChatConversationPreview, dictionary: ChatDictionary): string {
  const lastMessageValue = conversation.lastMessage as unknown;
  if (typeof lastMessageValue === "string" && lastMessageValue.trim()) {
    return lastMessageValue;
  }

  if (lastMessageValue && typeof lastMessageValue === "object") {
    const record = lastMessageValue as Record<string, unknown>;
    return readString(record.content) || readString(record.text) || dictionary.noPreview;
  }

  return dictionary.noPreview;
}

function readConversationMeta(conversation: ChatConversationPreview, dictionary: ChatDictionary): string {
  return readString(conversation.lastMessageAt) || dictionary.recentThread;
}

export default function ChatsPage() {
  const { dictionary } = useSession();
  const [conversations, setConversations] = useState<ChatConversationPreview[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    createBrowserClient().getConversations().then((items) => {
      setConversations(Array.isArray(items) ? items : []);
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : dictionary.chats.inboxLoadFailed);
    });
  }, [dictionary.chats.inboxLoadFailed]);

  if (error) {
    return <div className="panel page-card"><div className="notice">{error}</div></div>;
  }

  return (
    <div className="stack">
      <div className="panel page-card">
        <h1>{dictionary.chats.inboxTitle}</h1>
        <p className="muted">{dictionary.chats.inboxSubtitle}</p>
      </div>
      {conversations.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">{dictionary.chats.inboxEmpty}</div>
        </div>
      ) : (
        <div className="stack">
          {conversations.map((conversation) => {
            const title = readConversationTitle(conversation, dictionary.chats);
            const preview = readConversationPreview(conversation, dictionary.chats);
            const badges = [
              conversation.pinned ? dictionary.chats.pinned : "",
              conversation.muted ? dictionary.chats.muted : "",
              conversation.unreadCount > 0 ? `${dictionary.chats.unread} ${conversation.unreadCount}` : dictionary.chats.read,
            ].filter(Boolean);

            return (
              <Link className="conversation-card" href={`/app/chats/${conversation.peerUserId}`} key={conversation.peerUserId}>
                <div className="conversation-card__main">
                  <div className="conversation-card__title-row">
                    <strong>{title}</strong>
                    <span className="muted">{readConversationMeta(conversation, dictionary.chats)}</span>
                  </div>
                  <p className="conversation-card__preview">{preview}</p>
                </div>
                <div className="conversation-badges">
                  {badges.map((badge) => (
                    <span className="conversation-badge" key={badge}>
                      {badge}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
