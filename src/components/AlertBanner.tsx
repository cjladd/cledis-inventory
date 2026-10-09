'use client';

import Link from 'next/link';

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  /** Matches InventoryItem.safetyStock; was named minStock, which exists nowhere else. */
  safetyStock: number;
  unit?: string;
}

export interface AlertBannerProps {
  items: LowStockItem[];
  onDismiss?: () => void;
  maxItems?: number;
}

export default function AlertBanner({
  items,
  onDismiss,
  maxItems = 3,
}: AlertBannerProps) {
  if (items.length === 0) return null;

  const displayedItems = items.slice(0, maxItems);
  const remainingCount = items.length - maxItems;

  return (
    <section
      className="bg-surface border-y border-rule"
      aria-label="Items needing attention"
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        {/* Directive, not descriptive: this is the morning walk-through list. */}
        <h2 className="text-[15px] font-bold text-ink">Check these first</h2>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="-mr-2 p-2 text-ink-3 hover:text-ink rounded-control
                       active:bg-surface-sunk transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <ul className="rule-list border-t border-rule">
        {displayedItems.map((item) => {
          // Same thresholds as getStockStatus, so the banner and the item
          // rows cannot disagree about what "critical" means.
          const isOut = item.currentStock <= 0;
          const isCritical = item.currentStock <= item.safetyStock;

          return (
            <li
              key={item.id}
              className={`spine ${isCritical ? 'text-flame' : 'text-amber'}
                          flex items-center gap-4 px-4 py-3`}
            >
              <p className="flex-1 min-w-0 text-[15px] font-medium text-ink truncate">
                {item.name}
              </p>
              <p
                className={`tnum text-lg font-bold flex-shrink-0
                            ${isCritical ? 'text-flame' : 'text-ink'}`}
              >
                {isOut ? 'Out' : item.currentStock}
                {!isOut && item.unit && (
                  <span className="ml-1 text-[13px] font-medium text-ink-3 tracking-normal">
                    {item.unit}
                  </span>
                )}
              </p>
            </li>
          );
        })}
      </ul>

      {remainingCount > 0 && (
        <Link
          href="/alerts"
          className="block px-4 py-3 border-t border-rule text-[15px] font-semibold
                     text-ink active:bg-surface-sunk transition-colors"
        >
          {remainingCount} more
        </Link>
      )}
    </section>
  );
}
