'use client';

export type StockStatus = 'ok' | 'low' | 'critical' | 'out';

export interface ItemCardProps {
  name: string;
  currentStock: number;
  unit: string;
  status: StockStatus;
  category?: string;
  parLevel?: number;
  onClick?: () => void;
}

/**
 * Status is carried by the left spine rather than a badge on every row.
 * An item that is fine gets no colour at all - scanning a list of sixty, the
 * eye should catch only the rows that need something doing.
 */
const spineFor: Record<StockStatus, string> = {
  ok:       'text-transparent',
  low:      'text-amber',
  critical: 'text-flame',
  out:      'text-flame',
};

const quantityFor: Record<StockStatus, string> = {
  ok:       'text-ink',
  low:      'text-ink',
  critical: 'text-flame',
  out:      'text-flame',
};

export default function ItemCard({
  name,
  currentStock,
  unit,
  status,
  category,
  parLevel,
  onClick,
}: ItemCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`spine ${spineFor[status]} w-full bg-surface text-left
                  px-4 py-3.5 min-h-[72px]
                  flex items-center gap-4
                  active:bg-surface-sunk transition-colors duration-100`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[15px] leading-tight text-ink truncate">
          {name}
        </p>
        <p className="mt-1 text-[13px] text-ink-3 truncate">
          {status === 'out' ? 'Out of stock' : category}
        </p>
      </div>

      <div className="text-right flex-shrink-0">
        <p className={`tnum text-quantity ${quantityFor[status]}`}>
          {currentStock.toLocaleString()}
          <span className="ml-1 text-[13px] font-medium text-ink-3 tracking-normal">
            {unit}
          </span>
        </p>
        {parLevel !== undefined && (
          <p className="tnum mt-1 text-[13px] text-ink-3">par {parLevel}</p>
        )}
      </div>
    </button>
  );
}
