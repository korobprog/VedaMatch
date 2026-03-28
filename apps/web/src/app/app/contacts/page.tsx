"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@vedamatch/api-client";
import type { PaginatedContactsResponse, UserContact } from "@vedamatch/domain-types";
import { useSession } from "@/components/session-context";

type ContactsTab = "all" | "friends" | "blocked";

const PAGE_SIZE = 24;

function mergeContacts(previous: UserContact[], next: UserContact[]): UserContact[] {
  const seen = new Set<number>();
  return [...previous, ...next].filter((contact) => {
    if (seen.has(contact.ID)) {
      return false;
    }
    seen.add(contact.ID);
    return true;
  });
}

function getContactTitle(contact: UserContact): string {
  return contact.nicknameDisplay || contact.spiritualName || contact.karmicName || contact.email || `User #${contact.ID}`;
}

function getContactEmail(contact: UserContact, fallback: string): string {
  return contact.email || fallback;
}

function getContactMeta(contact: UserContact): string {
  return [contact.city, contact.country, contact.identity].filter(Boolean).join(" • ");
}

export default function ContactsPage() {
  const { dictionary } = useSession();
  const client = useMemo(() => createBrowserClient(), []);
  const requestIdRef = useRef(0);

  const [tab, setTab] = useState<ContactsTab>("all");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | undefined>(undefined);
  const [total, setTotal] = useState(0);
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);

  const loadContacts = useCallback(async (mode: "reset" | "more") => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (mode === "reset") {
      setLoading(true);
      setError("");
    } else {
      setLoadingMore(true);
    }

    try {
      const response: PaginatedContactsResponse = await client.getContacts({
        tab,
        q: debouncedQuery || undefined,
        limit: PAGE_SIZE,
        cursor: mode === "more" ? nextCursor : undefined,
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const nextItems = Array.isArray(response.items) ? response.items : [];
      setContacts((previous) => (mode === "more" ? mergeContacts(previous, nextItems) : nextItems));
      setHasMore(Boolean(response.hasMore));
      setNextCursor(response.nextCursor);
      setTotal(response.total ?? nextItems.length);
      setError("");
    } catch (loadError) {
      if (requestIdRef.current !== requestId) {
        return;
      }
      setError(loadError instanceof Error ? loadError.message : dictionary.contacts.loadFailed);
      if (mode === "reset") {
        setContacts([]);
        setHasMore(false);
        setNextCursor(undefined);
        setTotal(0);
      }
    } finally {
      if (requestIdRef.current !== requestId) {
        return;
      }

      if (mode === "reset") {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [client, debouncedQuery, dictionary.contacts.loadFailed, nextCursor, tab]);

  useEffect(() => {
    void loadContacts("reset");
  }, [loadContacts, reloadNonce]);

  const tabOptions = [
    { id: "all", label: dictionary.contacts.allTab },
    { id: "friends", label: dictionary.contacts.friendsTab },
    { id: "blocked", label: dictionary.contacts.blockedTab },
  ] as const satisfies ReadonlyArray<{ id: ContactsTab; label: string }>;

  const emptyCopy = debouncedQuery
    ? dictionary.contacts.emptySearch
    : tab === "blocked"
      ? dictionary.contacts.emptyBlocked
      : dictionary.contacts.empty;

  const isInitialEmpty = !loading && !error && contacts.length === 0;

  return (
    <div className="stack contacts-page">
      <section className="panel page-card contacts-hero">
        <div className="section-head">
          <span className="eyebrow">{dictionary.nav.contacts}</span>
          <h1>{dictionary.contacts.title}</h1>
          <p>{dictionary.contacts.subtitle}</p>
        </div>
      </section>

      <section className="panel page-card contacts-browser">
        <div className="contacts-toolbar">
          <div className="contacts-tabs" aria-label={dictionary.contacts.title}>
            {tabOptions.map((option) => (
              <button
                className="contacts-tab"
                data-active={tab === option.id}
                key={option.id}
                onClick={() => {
                  setTab(option.id);
                  setContacts([]);
                  setHasMore(false);
                  setNextCursor(undefined);
                }}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="contacts-search-wrap">
            <input
              aria-label={dictionary.contacts.searchPlaceholder}
              className="contacts-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={dictionary.contacts.searchPlaceholder}
              type="search"
              value={query}
            />
          </div>

          <div className="contacts-total">
            <strong>{total}</strong>
            <span>{dictionary.contacts.resultsLabel}</span>
          </div>
        </div>

        {error ? (
          <div className="contacts-feedback">
            <div className="notice">{error}</div>
            <button className="button-secondary" onClick={() => setReloadNonce((value) => value + 1)} type="button">
              {dictionary.common.retry}
            </button>
          </div>
        ) : null}

        {loading ? <div className="contacts-feedback"><div className="notice">{dictionary.common.loading}</div></div> : null}

        {isInitialEmpty ? (
          <div className="contacts-empty">
            <div className="empty-state">{emptyCopy}</div>
          </div>
        ) : null}

        {!loading && !error && contacts.length > 0 ? (
          <>
            <div className="contacts-grid">
              {contacts.map((contact) => {
                const title = getContactTitle(contact);
                const email = getContactEmail(contact, dictionary.contacts.protectedContact);
                const meta = getContactMeta(contact);
                const initial = (contact.nicknameDisplay || contact.spiritualName || contact.karmicName || contact.email || "?")
                  .slice(0, 1)
                  .toUpperCase();

                return (
                  <article className="contact-card" key={contact.ID}>
                    <div className="contact-card__body">
                      <div className="contact-avatar">{initial}</div>
                      <div className="contact-card__copy">
                        <strong className="contact-card__title" title={title}>{title}</strong>
                        <span className="contact-card__email" title={email}>{email}</span>
                        {meta ? <span className="contact-card__meta" title={meta}>{meta}</span> : <span className="contact-card__meta contact-card__meta--empty"> </span>}
                      </div>
                    </div>
                    <div className="contact-card__actions">
                      <Link className="button" href={`/app/chats/${contact.ID}`}>
                        {dictionary.contacts.openChat}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>

            {hasMore ? (
              <div className="contacts-load-more">
                <button
                  className="button-secondary"
                  disabled={loadingMore}
                  onClick={() => {
                    if (!loadingMore && hasMore && nextCursor) {
                      void loadContacts("more");
                    }
                  }}
                  type="button"
                >
                  {loadingMore ? dictionary.contacts.loadingMore : dictionary.contacts.loadMore}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </section>
    </div>
  );
}
