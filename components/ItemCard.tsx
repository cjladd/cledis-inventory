'use client';

export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export interface ItemCardProps {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  status: StockStatus;
  category?: string;
  onPress?: (id: string) => void;
}

const statusConfig: Record<StockStatus, { bg: string; text: string; dot: string; label: string }> = {
  ok: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'In Stock',
  },
  low: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Low Stock',
  },
  critical: {
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    dot: 'bg-orange-500',
    label: 'Critical',
  },
  out: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    dot: 'bg-red-500',
    label: 'Out of Stock',
  },
};

export default function ItemCard({
  id,
  name,
  currentStock,
  unit,
  status,
  category,
  onPress,
}: ItemCardProps) {
  const config = statusConfig[status];

  return (
    <button
      type="button"
      onClick={() => onPress?.(id)}
      className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 
                 active:scale-[0.98] active:bg-gray-50 transition-all duration-150
                 touch-manipulation text-left"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 truncate">
            {name}
          </h3>
          {category && (
            <p className="text-sm text-gray-500 mt-0.5">{category}</p>
          )}
        </div>

        {/* Status Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${config.bg}`}
        >
          <span className={`w-2 h-2 rounded-full ${config.dot}`} />
          <span className={`text-xs font-medium ${config.text}`}>
            {config.label}
          </span>
        </div>
      </div>

      {/* Stock Display */}
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-bold text-gray-900">
          {currentStock.toLocaleString()}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>

      {/* Touch indicator */}
      <div className="mt-3 flex items-center text-gray-400">
        <span className="text-xs">Tap to update</span>
        <svg
          className="w-4 h-4 ml-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </div>
    </button>
  );
}
