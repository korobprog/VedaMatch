"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { SupportConfig, SupportConversation } from "@vedamatch/domain-types";

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
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">Utility domain</span>
        <h1>Support entry</h1>
        <p className="muted">
          Telegram: {config?.channels.telegram ? "enabled" : "disabled"} • In-app ticket: {config?.channels.inAppTicket ? "enabled" : "disabled"}
        </p>
        <div className="actions">
          {config?.telegramBotUrl ? <a className="button-secondary" href={config.telegramBotUrl} rel="noreferrer" target="_blank">Open Telegram support</a> : null}
          {config?.channelUrl ? <a className="button-secondary" href={config.channelUrl} rel="noreferrer" target="_blank">Open support channel</a> : null}
        </div>
        <div className="support-summary-grid">
          <div className="mini-card">
            <strong>Eligibility</strong>
            <p className="muted">{config?.appEntryEligible ? "Current user is eligible for in-app support." : "In-app support is not currently available for this user."}</p>
          </div>
          <div className="mini-card">
            <strong>Rollout</strong>
            <p className="muted">{typeof config?.appEntryRolloutPercent === "number" ? `${config.appEntryRolloutPercent}%` : "N/A"}</p>
          </div>
          <div className="mini-card">
            <strong>SLA</strong>
            <p className="muted">{config?.slaTextEn || config?.slaTextRu || "Support SLA text is not available."}</p>
          </div>
        </div>
      </div>
      <div className="panel page-card">
        <h2>Support inbox</h2>
        <p className="muted">Protected ticket list for the first web wave.</p>
        {tickets.length === 0 ? (
          <div className="empty-state">No support tickets returned yet.</div>
        ) : (
          <div className="news-stack">
            {tickets.map((ticket) => (
              <article className="content-card" key={ticket.ID}>
                <div className="content-card__meta">
                  <span className="content-pill">{ticket.status}</span>
                  <span className="content-pill">{ticket.channel}</span>
                  {ticket.unreadCount ? <span className="content-pill content-pill--accent">Unread {ticket.unreadCount}</span> : null}
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <h3>{ticket.subject || ticket.ticketNumber || `Ticket #${ticket.ID}`}</h3>
                  <p className="content-card__body">{ticket.lastMessagePreview || "No message preview available."}</p>
                </div>
                <div className="content-card__footer">
                  <span className="muted">{ticket.lastMessageAt || ticket.UpdatedAt || ticket.CreatedAt}</span>
                  <span className="muted">{ticket.requesterName || ticket.requesterContact || "Support requester"}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
