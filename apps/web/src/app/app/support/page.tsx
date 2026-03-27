"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { SupportConfig, SupportConversation } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

export default function SupportPage() {
  const { dictionary } = useSession();
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
      setError(loadError instanceof Error ? loadError.message : dictionary.support.loadFailed);
    });
  }, [dictionary.support.loadFailed]);

  if (error) {
    return <div className="panel page-card"><div className="notice">{error}</div></div>;
  }

  return (
    <div className="stack">
      <div className="panel page-card">
        <span className="eyebrow">{dictionary.support.eyebrow}</span>
        <h1>{dictionary.support.title}</h1>
        <p className="muted">
          Telegram: {config?.channels.telegram ? dictionary.support.telegramEnabled : dictionary.support.telegramDisabled} • In-app ticket: {config?.channels.inAppTicket ? dictionary.support.inAppEnabled : dictionary.support.inAppDisabled}
        </p>
        <div className="actions">
          {config?.telegramBotUrl ? <a className="button-secondary" href={config.telegramBotUrl} rel="noreferrer" target="_blank">{dictionary.support.openTelegram}</a> : null}
          {config?.channelUrl ? <a className="button-secondary" href={config.channelUrl} rel="noreferrer" target="_blank">{dictionary.support.openChannel}</a> : null}
        </div>
        <div className="support-summary-grid">
          <div className="mini-card">
            <strong>{dictionary.support.eligibility}</strong>
            <p className="muted">{config?.appEntryEligible ? dictionary.support.eligibleYes : dictionary.support.eligibleNo}</p>
          </div>
          <div className="mini-card">
            <strong>{dictionary.support.rollout}</strong>
            <p className="muted">{typeof config?.appEntryRolloutPercent === "number" ? `${config.appEntryRolloutPercent}%` : dictionary.support.notAvailable}</p>
          </div>
          <div className="mini-card">
            <strong>{dictionary.support.sla}</strong>
            <p className="muted">{config?.slaTextEn || config?.slaTextRu || dictionary.support.slaMissing}</p>
          </div>
        </div>
      </div>
      <div className="panel page-card">
        <h2>{dictionary.support.inboxTitle}</h2>
        <p className="muted">{dictionary.support.inboxSubtitle}</p>
        {tickets.length === 0 ? (
          <div className="empty-state">{dictionary.support.empty}</div>
        ) : (
          <div className="news-stack">
            {tickets.map((ticket) => (
              <article className="content-card" key={ticket.ID}>
                <div className="content-card__meta">
                  <span className="content-pill">{ticket.status}</span>
                  <span className="content-pill">{ticket.channel}</span>
                  {ticket.unreadCount ? <span className="content-pill content-pill--accent">{dictionary.support.unread} {ticket.unreadCount}</span> : null}
                </div>
                <div className="stack" style={{ gap: 10 }}>
                  <h3>{ticket.subject || ticket.ticketNumber || `Ticket #${ticket.ID}`}</h3>
                  <p className="content-card__body">{ticket.lastMessagePreview || dictionary.support.noPreview}</p>
                </div>
                <div className="content-card__footer">
                  <span className="muted">{ticket.lastMessageAt || ticket.UpdatedAt || ticket.CreatedAt}</span>
                  <span className="muted">{ticket.requesterName || ticket.requesterContact || dictionary.support.requesterFallback}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
