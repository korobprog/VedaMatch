"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { ChatConversationPreview } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

export default function ChatsPage() {
  const { dictionary } = useSession();
  const [conversations, setConversations] = useState<ChatConversationPreview[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    createBrowserClient().getConversations().then(setConversations).catch((loadError) => {
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
            const title =
              conversation.peerUserPreview ||
              conversation.peerUser?.nicknameDisplay ||
              conversation.peerUser?.spiritualName ||
              `${dictionary.chats.sender} #${conversation.peerUserId}`;
            const preview = conversation.lastMessage || dictionary.chats.noPreview;
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
                    <span className="muted">{conversation.lastMessageAt || dictionary.chats.recentThread}</span>
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
