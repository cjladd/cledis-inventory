'use client';

import Link from 'next/link';

export interface LowStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

export interface AlertBannerProps {
  items: LowStockItem[];
  onDismiss?: () => void;
  onViewAll?: () => void;
  maxItemsToShow?: number;
}

export default function AlertBanner({
  items,
  onDismiss,
  onViewAll,
  maxItemsToShow = 3,
}: AlertBannerProps) {
  if (items.length === 0) return null;

  const displayedItems = items.slice(0, maxItemsToShow);
  const remainingCount = items.length - maxItemsToShow;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-lg shadow-sm mx-4 my-3">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-amber-800">
              Low Stock Alert
            </h3>
            <p className="text-xs text-amber-700 mt-0.5">
              {items.length} item{items.length !== 1 ? 's' : ''} need
              {items.length === 1 ? 's' : ''} attention
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1.5 -mr-1 text-amber-600 hover:text-amber-800 
                       active:bg-amber-100 rounded-full transition-colors"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="px-4 pb-3">
        <ul className="space-y-2">
          {displayedItems.map((item) => {
            const percentRemaining = Math.round(
              (item.currentStock / item.minStock) * 100
            );
            const isCritical = percentRemaining <= 25;

            return (
              <li
                key={item.id}
                className="flex items-center justify-between py-2 px-3 
                           bg-white/60 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Min: {item.minStock} {item.unit}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <div
                    className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      isCritical
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {item.currentStock} {item.unit}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {remainingCount > 0 && (
          <p className="text-xs text-amber-700 mt-2 text-center">
            +{remainingCount} more item{remainingCount !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Action */}
      {onViewAll && (
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={onViewAll}
            className="w-full py-2.5 text-sm font-medium text-amber-800 
                       bg-amber-100 rounded-lg active:bg-amber-200 
                       transition-colors touch-manipulation"
          >
            View All Low Stock Items
          </button>
        </div>
      )}
    </div>
  );
}
