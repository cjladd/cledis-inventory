import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Elapsed time, e.g. "just now", "5m ago", "3h ago", "2d ago".
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMins = Math.floor((Date.now() - d.getTime()) / 60_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return `${Math.floor(diffHours / 24)}d ago`;
}

/**
 * Time remaining, e.g. "45m", "2h 30m", or "overdue" once the moment has passed.
 * Returns "unknown" when there is no date to count down to.
 */
export function formatTimeUntil(date: Date | string | null | undefined): string {
  if (!date) return "unknown";

  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();

  if (diffMs < 0) return "overdue";

  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 60) return `${diffMins}m`;

  return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
}
