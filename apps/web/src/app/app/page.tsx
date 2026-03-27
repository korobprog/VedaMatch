export default function AppHomePage() {
  return (
    <>
      <div className="panel page-card">
        <h1>Core web shell</h1>
        <p className="muted">
          This authenticated shell is the new browser-native entrypoint for VedaMatch.
          It intentionally starts with core domains and keeps calls, live media, and native-only flows out of phase 1.
        </p>
      </div>
      <div className="grid-3">
        <div className="panel page-card">
          <h2>Profile and settings</h2>
          <p className="muted">Editable through the shared auth session and `/update-profile`.</p>
        </div>
        <div className="panel page-card">
          <h2>Social core</h2>
          <p className="muted">Contacts, conversation list, and direct thread pages are browser-first.</p>
        </div>
        <div className="panel page-card">
          <h2>Content and utility</h2>
          <p className="muted">Library, news, services, travel, wallet routing, and support entry are mapped to deep links.</p>
        </div>
      </div>
    </>
  );
}

