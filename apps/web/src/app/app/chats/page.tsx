"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { ChatConversationPreview } from "@vedamatch/domain-types";

export default function ChatsPage() {
  const [conversations, setConversations] = useState<ChatConversationPreview[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    createBrowserClient().getConversations().then(setConversations).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load conversations.");
    });
  }, []);

  if (error) {
    return <div className="panel page-card"><div className="notice">{error}</div></div>;
  }

  return (
    <div className="stack">
      <div className="panel page-card">
        <h1>Direct chat inbox</h1>
        <p className="muted">
          Browser-first inbox powered by `GET /api/messages/conversations`, focused on unread context and fast thread entry.
        </p>
      </div>
      {conversations.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">No conversations yet.</div>
        </div>
      ) : (
        <div className="stack">
          {conversations.map((conversation) => {
            const title =
              conversation.peerUserPreview ||
              conversation.peerUser?.nicknameDisplay ||
              conversation.peerUser?.spiritualName ||
              `User #${conversation.peerUserId}`;
            const preview = conversation.lastMessage || "No preview";
            const badges = [
              conversation.pinned ? "Pinned" : "",
              conversation.muted ? "Muted" : "",
              conversation.unreadCount > 0 ? `Unread ${conversation.unreadCount}` : "Read",
            ].filter(Boolean);

            return (
              <Link className="conversation-card" href={`/app/chats/${conversation.peerUserId}`} key={conversation.peerUserId}>
                <div className="conversation-card__main">
                  <div className="conversation-card__title-row">
                    <strong>{title}</strong>
                    <span className="muted">{conversation.lastMessageAt || "Recent thread"}</span>
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
