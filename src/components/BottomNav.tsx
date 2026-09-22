'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  {
    name: 'Today',
    href: '/',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    name: 'Prep',
    href: '/prep',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
      </svg>
    ),
  },
  {
    name: 'Waste',
    href: '/waste',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
  {
    name: 'Setup',
    href: '/settings',
    icon: (
      <svg className="w-[22px] h-[22px]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

/**
 * A solid dark rail anchors the screen and keeps the warm status colours
 * unique to the content above it.
 */
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] bg-ink pb-safe">
      <div className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1
                          flex-1 min-w-0 pt-3 pb-2.5
                          transition-colors duration-150
                          ${isActive ? 'text-amber' : 'text-white/55 active:text-white'}`}
            >
              {/* The active tab is marked at the top edge, like a lit burner. */}
              <span
                className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] rounded-b
                            transition-all duration-150
                            ${isActive ? 'w-8 bg-amber' : 'w-0 bg-transparent'}`}
              />
              {item.icon}
              <span className="text-[11px] font-semibold tracking-wide">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
