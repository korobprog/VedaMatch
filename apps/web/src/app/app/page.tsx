"use client";

import { useSession } from "@/components/session-context";

export default function AppHomePage() {
  const { dictionary } = useSession();

  return (
    <>
      <div className="panel page-card">
        <h1>{dictionary.portal.overviewTitle}</h1>
        <p className="muted">{dictionary.portal.overviewBody}</p>
      </div>
      <div className="grid-3">
        <div className="panel page-card">
          <h2>{dictionary.portal.profileCardTitle}</h2>
          <p className="muted">{dictionary.portal.profileCardBody}</p>
        </div>
        <div className="panel page-card">
          <h2>{dictionary.portal.socialCardTitle}</h2>
          <p className="muted">{dictionary.portal.socialCardBody}</p>
        </div>
        <div className="panel page-card">
          <h2>{dictionary.portal.utilityCardTitle}</h2>
          <p className="muted">{dictionary.portal.utilityCardBody}</p>
        </div>
      </div>
    </>
  );
}
