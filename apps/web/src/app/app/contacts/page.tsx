"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { UserContact } from "@vedamatch/domain-types";

export default function ContactsPage() {
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    createBrowserClient().getContacts().then(setContacts).catch((loadError) => {
      setError(loadError instanceof Error ? loadError.message : "Failed to load contacts.");
    });
  }, []);

  if (error) {
    return <div className="panel page-card"><div className="notice">{error}</div></div>;
  }

  return (
    <div className="stack">
      <div className="panel page-card">
        <h1>Contacts core</h1>
        <p className="muted">
          Protected people directory for the social web entrypoint. Each contact can be opened directly into a browser-first direct chat thread.
        </p>
      </div>
      {contacts.length === 0 ? (
        <div className="panel page-card">
          <div className="empty-state">No contacts returned yet.</div>
        </div>
      ) : (
        <div className="social-grid">
          {contacts.map((contact) => {
            const title = contact.nicknameDisplay || contact.spiritualName || contact.karmicName || contact.email || `User #${contact.ID}`;
            const subtitle = [contact.city, contact.country, contact.identity].filter(Boolean).join(" • ");

            return (
              <article className="contact-card" key={contact.ID}>
                <div className="contact-card__body">
                  <div className="contact-avatar">
                    {(contact.nicknameDisplay || contact.spiritualName || contact.karmicName || contact.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div className="stack" style={{ gap: 6 }}>
                    <strong>{title}</strong>
                    <span className="muted">{contact.email || "Protected contact"}</span>
                    {subtitle ? <span className="muted">{subtitle}</span> : null}
                  </div>
                </div>
                <div className="actions">
                  <Link className="button-secondary" href={`/app/chats/${contact.ID}`}>
                    Open chat
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
