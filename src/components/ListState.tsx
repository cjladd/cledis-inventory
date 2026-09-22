"use client";

export interface ListStateProps {
  loading: boolean;
  error?: boolean;
  onRetry?: () => void;
  isEmpty: boolean;
  /** An empty list says what to do next, not just that it is empty. */
  emptyMessage: string;
  skeletonRows?: number;
  children: React.ReactNode;
}

/**
 * The loading, failed and empty states for a list, in one place so every
 * screen fails and recovers the same way.
 */
export default function ListState({
  loading,
  error = false,
  onRetry,
  isEmpty,
  emptyMessage,
  skeletonRows = 6,
  children,
}: ListStateProps) {
  if (loading) {
    return (
      <div className="rule-list border-y border-rule" aria-busy="true" aria-live="polite">
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="bg-surface px-4 py-3.5 min-h-[72px] flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/5 rounded bg-surface-sunk animate-pulse" />
              <div className="h-3 w-1/5 rounded bg-surface-sunk animate-pulse" />
            </div>
            <div className="h-6 w-14 rounded bg-surface-sunk animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-[15px] font-semibold text-ink">Could not load the list</p>
        <p className="mt-1 text-[13px] text-ink-2">
          Check the kitchen tablet is on the wifi.
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-5 px-6 py-3 rounded-control bg-ink text-white font-bold text-[15px]
                       active:bg-ink/90 transition-colors"
          >
            Try again
          </button>
        )}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="px-6 py-14 text-center">
        <p className="text-[15px] text-ink-2">{emptyMessage}</p>
      </div>
    );
  }

  return <>{children}</>;
}
