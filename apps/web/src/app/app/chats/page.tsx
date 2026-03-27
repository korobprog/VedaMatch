"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { ChatConversationPreview } from "@vedamatch/domain-types";
import { DomainPage } from "@/components/domain-page";

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
    <DomainPage
      description="Conversation list from `GET /api/messages/conversations`."
      items={conversations.map((conversation) => ({
        id: String(conversation.peerUserId),
        title: conversation.peerUserPreview || conversation.peerUser?.nicknameDisplay || conversation.peerUser?.spiritualName || `User #${conversation.peerUserId}`,
        body: conversation.lastMessage,
        meta: `${conversation.lastMessageAt} • unread ${conversation.unreadCount}`,
        href: `/app/chats/${conversation.peerUserId}`
      }))}
      title="Direct chat inbox"
    />
  );
}
