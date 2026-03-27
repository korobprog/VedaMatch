import Link from "next/link";
import { getRequestSurface } from "@/lib/request-surface";

const defaultCards = [
  {
    title: "Shared contracts first",
    body: "The web app consumes new platform-neutral packages instead of importing React Native runtime code.",
  },
  {
    title: "Core product V1",
    body: "Portal shell, auth, profile, contacts, chats, library, news, services, travel, wallet routing, and support entry.",
  },
  {
    title: "Realtime later",
    body: "Calls, browser notifications, and media-heavy surfaces stay out of the critical path until the core web loop is stable.",
  },
];

const socialCards = [
  {
    title: "Social-first entry",
    body: "This host is the web entrypoint for authentication, contacts, direct chats, and the first social user flows.",
  },
  {
    title: "One runtime",
    body: "social.vedamatch.ru uses the same `apps/web` codebase instead of a separate web project.",
  },
  {
    title: "Deep-linkable shell",
    body: "After login, users continue into the same `/app/*` browser-native shell for profile, chats, content, support, and wallet routing.",
  },
];

export default async function HomePage() {
  const { host, isSocial } = await getRequestSurface();
  const cards = isSocial ? socialCards : defaultCards;

  return (
    <main className="shell">
      <section className="hero">
        <div className="container hero-grid">
          <div className="panel">
            <div className="panel-inner">
              <span className="eyebrow">{isSocial ? "Social web entrypoint" : "New web runtime"}</span>
              <h1 className="title-xl">
                {isSocial
                  ? "social.vedamatch.ru is the social web entry for the same VedaMatch app."
                  : "VedaMatch Web starts as a real product, not a React Native port."}
              </h1>
              <p className="lead">
                {isSocial
                  ? "This host focuses on browser-native auth and social entry flows, then continues into the shared `/app/*` shell without splitting the product into another web codebase."
                  : "This foundation adds a dedicated Next.js App Router client, shared platform-neutral packages, and deep-linkable routes for the first wave of user-facing web flows."}
              </p>
              <p className="muted">Current host: {host}</p>
              <div className="actions">
                <Link className="button" href={isSocial ? "/login" : "/app"}>
                  {isSocial ? "Sign in to social web" : "Open web app"}
                </Link>
                <Link className="button-secondary" href="/register">
                  {isSocial ? "Create social account" : "Create account"}
                </Link>
              </div>
            </div>
          </div>
          <div className="panel">
            <div className="panel-inner stack">
              <div className="metric">
                <strong>apps/web</strong>
                <span>Dedicated user web client on Next.js App Router.</span>
              </div>
              <div className="metric">
                <strong>packages/*</strong>
                <span>Shared host config, auth session, DTOs, and lightweight i18n.</span>
              </div>
              <div className="metric">
                <strong>V1 routes</strong>
                <span>Core product pages are deep-linkable and browser-native.</span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section style={{ paddingBottom: 48 }}>
        <div className="container grid-3">
          {cards.map((card) => (
            <div className="panel page-card" key={card.title}>
              <h2>{card.title}</h2>
              <p className="muted">{card.body}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
