'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { label: 'Places', href: '/dhama' },
  { label: 'Collections', href: '/dhama/collections' },
];

export function DhamaAdminTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-50 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
