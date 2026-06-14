"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/components/session-context";

export function UnionDatingNav() {
  const { dictionary } = useSession();
  const nav = dictionary.datingWeb.nav;
  const pathname = usePathname();

  const tabs = [
    { href: "/app/dating", label: nav.profile, exact: true },
    { href: "/app/dating/browse", label: nav.browse, exact: false },
    { href: "/app/dating/likes", label: nav.likes, exact: false },
    { href: "/app/dating/meetings", label: nav.meetings, exact: false },
  ];

  function isActive(href: string, exact: boolean): boolean {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="dating-subnav" aria-label="Union">
      {tabs.map((tab) => (
        <Link
          className="dating-subnav__item"
          data-active={isActive(tab.href, tab.exact)}
          href={tab.href}
          key={tab.href}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
