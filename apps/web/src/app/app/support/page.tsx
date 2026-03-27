"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { SupportConfig, SupportConversation } from "@vedamatch/domain-types";
import { DomainPage } from "@/components/domain-page";

export default function SupportPage() {
  const [config, setConfig] = useState<SupportConfig | null>(null);
  const [tickets, setTickets] = useState<SupportConversation[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const client = createBrowserClient();
    Promise.all([
      client.getSupportConfig(),
      client.getSupportTickets().catch(() => [])
    ]).then(([nextConfig, nextTickets]) => {
      setConfig(nextConfig);
      setTickets(nextTickets);
    }).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load support.");
    });
  }, []);

  if (error) {
    return <div className="panel page-card"><div className="notice">{error}</div></div>;
  }

  return (
    <>
      <div className="panel page-card">
        <h1>Support entry</h1>
        <p className="muted">
          Telegram: {config?.channels.telegram ? "enabled" : "disabled"} • In-app ticket: {config?.channels.inAppTicket ? "enabled" : "disabled"}
        </p>
        {config?.telegramBotUrl ? <a className="button-secondary" href={config.telegramBotUrl} rel="noreferrer" target="_blank">Open Telegram support</a> : null}
      </div>
      <DomainPage
        description="Protected ticket inbox for the first web wave."
        items={tickets.map((ticket) => ({
          id: String(ticket.ID),
          title: ticket.subject || ticket.ticketNumber || `Ticket #${ticket.ID}`,
          body: ticket.lastMessagePreview || "",
          meta: `${ticket.status} • unread ${ticket.unreadCount || 0}`
        }))}
        title="Support inbox"
      />
    </>
  );
}
