"use client";

import { useEffect } from "react";
import { buildVedamatchUrl, resolveVedamatchRootDomain } from "@vedamatch/api-client";

export default function WalletPage() {
  useEffect(() => {
    const host = window.location.hostname;
    const rootDomain = resolveVedamatchRootDomain(host);
    if (!rootDomain) {
      return;
    }
    window.location.href = buildVedamatchUrl(host, "lkm", "/");
  }, []);

  return (
    <div className="panel page-card">
      <h1>Wallet / LKM</h1>
      <p className="muted">
        Wallet remains on the dedicated LKM surface in V1. This route preserves a browser-native path from the new app shell.
      </p>
    </div>
  );
}

