import Link from "next/link";

const rolloutCards = [
  {
    title: "Shared contracts first",
    body: "The web app consumes new platform-neutral packages instead of importing React Native runtime code."
  },
  {
    title: "Core product V1",
    body: "Portal shell, auth, profile, contacts, chats, library, news, services, travel, wallet routing, and support entry."
  },
  {
    title: "Realtime later",
    body: "Calls, browser notifications, and media-heavy surfaces stay out of the critical path until the core web loop is stable."
  }
];

export default function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <div className="container hero-grid">
          <div className="panel">
            <div className="panel-inner">
              <span className="eyebrow">New web runtime</span>
              <h1 className="title-xl">VedaMatch Web starts as a real product, not a React Native port.</h1>
              <p className="lead">
                This foundation adds a dedicated Next.js App Router client, shared platform-neutral packages,
                and deep-linkable routes for the first wave of user-facing web flows.
              </p>
              <div className="actions">
                <Link className="button" href="/login">Open web app</Link>
                <Link className="button-secondary" href="/register">Create account</Link>
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
          {rolloutCards.map((card) => (
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
