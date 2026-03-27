"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { UserContact } from "@vedamatch/domain-types";
import { DomainPage } from "@/components/domain-page";

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
    <DomainPage
      description="Protected contacts list using the new browser session."
      items={contacts.map((contact) => ({
        id: String(contact.ID),
        title: contact.nicknameDisplay || contact.spiritualName || contact.karmicName || contact.email || `User #${contact.ID}`,
        body: [contact.city, contact.country, contact.identity].filter(Boolean).join(" • "),
        meta: contact.email || "Protected contact"
      }))}
      title="Contacts core"
    />
  );
}

