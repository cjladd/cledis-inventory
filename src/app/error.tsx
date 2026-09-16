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
      <div className="w-16 h-16 mb-5 bg-red-100 rounded-full flex items-center justify-center">
        <svg
          className="w-8 h-8 text-red-500"
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

      <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
      <p className="mt-2 text-sm text-gray-500 max-w-sm">
        The page could not be loaded. Your logged prep and waste are safe.
      </p>

      {error.digest && (
        <p className="mt-2 text-xs text-gray-400">Reference: {error.digest}</p>
      )}

      <button
        onClick={reset}
        className="mt-6 px-6 py-3 bg-emerald-500 text-white font-semibold rounded-xl
                   hover:bg-emerald-600 active:scale-95 transition-all"
      >
        Try again
      </button>
    </div>
  );
}
