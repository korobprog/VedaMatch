"use client";

import { useEffect } from "react";
import { buildVedamatchUrl, resolveVedamatchRootDomain } from "@vedamatch/api-client";
import { useSession } from "@/components/session-context";

export default function WalletPage() {
  const { language } = useSession();
  useEffect(() => {
    const host = window.location.hostname;
    const rootDomain = resolveVedamatchRootDomain(host);
    if (!rootDomain) {
      return;
    }
    window.location.href = buildVedamatchUrl(host, "lkm", "/");
  }, []);

  const copy = language === "ru"
    ? {
      title: "Кошелек / LKM",
      body: "Кошелек пока остается на отдельной LKM-поверхности V1. Этот route сохраняет browser-native переход из нового social launcher-а.",
    }
    : {
      title: "Wallet / LKM",
      body: "Wallet remains on the dedicated LKM surface in V1. This route preserves a browser-native path from the new social launcher.",
    };

  return (
    <div className="panel page-card">
      <h1>{copy.title}</h1>
      <p className="muted">{copy.body}</p>
    </div>
  );
}
