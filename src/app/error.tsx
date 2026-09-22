"use client";

import { useEffect } from "react";

/**
 * Route-level error boundary. Without this, an unhandled render error drops the
 * user on Next's default error screen with no way back into the app.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="w-14 h-14 mb-5 bg-flame-soft rounded-full flex items-center justify-center">
        <svg
          className="w-7 h-7 text-flame"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3L13.74 4a2 2 0 00-3.48 0L3.33 16a2 2 0 001.74 3z"
          />
        </svg>
      </div>

      <h1 className="text-xl font-bold text-ink">This screen did not load</h1>
      <p className="mt-2 text-[15px] text-ink-2 max-w-xs">
        Everything you have already logged is saved.
      </p>

      {error.digest && (
        <p className="tnum mt-3 text-[13px] text-ink-3">Reference {error.digest}</p>
      )}

      <button
        onClick={reset}
        className="mt-6 px-6 py-3.5 rounded-control bg-ink text-white font-bold text-[15px]
                   active:bg-ink/90 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
