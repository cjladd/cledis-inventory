"use client";

import Link from "next/link";

export interface PageHeaderProps {
  title: string;
  /** One line of live context - counts, status, date. Not a tagline. */
  detail?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

/**
 * Sticks to the top so the search field stays reachable while scrolling a list
 * of sixty items - the whole list is one thumb-scroll long on a phone.
 */
export default function PageHeader({
  title,
  detail,
  backHref,
  backLabel = "Back",
  action,
  search,
  onSearchChange,
  searchPlaceholder = "Search",
}: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-ground/95 backdrop-blur-sm border-b border-rule">
      <div className="px-4 pt-5 pb-3">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 mb-2 text-[13px] font-semibold text-ink-2
                       hover:text-ink transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {backLabel}
          </Link>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-[26px] font-extrabold leading-none tracking-tight text-ink">
              {title}
            </h1>
            {detail && (
              <p className="mt-1.5 text-[13px] text-ink-2">{detail}</p>
            )}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>

        {onSearchChange && (
          <input
            type="search"
            value={search ?? ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="w-full mt-3 px-4 py-3 rounded-control bg-surface
                       border border-rule text-[15px] text-ink placeholder:text-ink-3
                       focus:outline-none focus:border-ink transition-colors"
          />
        )}
      </div>
    </header>
  );
}
