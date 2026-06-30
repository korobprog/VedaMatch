"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { useSession } from "@/components/session-context";

type UnionEntryGateProps = {
  primaryLabel: string;
  secondaryLabel: string;
};

export function UnionEntryGate({ primaryLabel, secondaryLabel }: UnionEntryGateProps) {
  const router = useRouter();
  const { ready, session } = useSession();
  const isLoggedIn = Boolean(session?.accessToken);

  useEffect(() => {
    if (ready && isLoggedIn) {
      router.replace("/app/union");
    }
  }, [isLoggedIn, ready, router]);

  return (
    <div className="union-public-actions">
      <Link className="union-public-button" href={isLoggedIn ? "/app/union" : "/login"}>
        {primaryLabel}
        <ArrowRight aria-hidden="true" size={18} />
      </Link>
      <Link className="union-public-button union-public-button--ghost" href={isLoggedIn ? "/app/union/profile" : "/register"}>
        {secondaryLabel}
      </Link>
    </div>
  );
}
