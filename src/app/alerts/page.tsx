"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { formatRelativeTime, formatTimeUntil } from "@/lib/utils";
import PageHeader from "@/components/PageHeader";
import ListState from "@/components/ListState";

type Alert = {
  id: string;
  status: "ACTIVE" | "RESOLVED" | "DISMISSED";
  predictedDepletionAt: string | null;
  createdAt: string;
  inventoryItem: {
    id: string;
    name: string;
    unit: string;
    currentStock: number;
    safetyStock: number;
  };
};

const FILTERS = [
  { value: "ACTIVE",   label: "Open" },
  { value: "RESOLVED", label: "Handled" },
  { value: "all",      label: "Everything" },
] as const;

/**
 * formatTimeUntil returns whole phrases for the edge cases ("overdue",
 * "unknown"), so they cannot be dropped into "Runs out in ___" - that read as
 * "Runs out in overdue".
 */
function runOutPhrase(predictedDepletionAt: string | null): string {
  if (!predictedDepletionAt) return "No forecast yet";

  const remaining = formatTimeUntil(predictedDepletionAt);
  if (remaining === "overdue") return "Past its forecast run-out";
  if (remaining === "unknown") return "No forecast yet";

  return `Runs out in ${remaining}`;
}

export default function AlertsPage() {
  const { data: session } = useSession();
  const canRecalculate =
    session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER";

  const [alerts,        setAlerts]        = useState<Alert[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState<"ACTIVE" | "RESOLVED" | "all">("ACTIVE");
  const [recalculating, setRecalculating] = useState(false);

  // Bumping refreshKey re-runs the load; keeping the fetch inside the effect is
  // what react-hooks/set-state-in-effect expects, and the cancelled flag stops a
  // late response from setting state after unmount.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const params = filter !== "all" ? `?status=${filter}` : "";
        const res = await fetch(`/api/inventory/alerts${params}`);
        if (res.ok && !cancelled) {
          const data = await res.json();
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error("Error fetching alerts:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [filter, refreshKey]);

  async function resolveAlert(alertId: string) {
    try {
      const res = await fetch(`/api/inventory/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "RESOLVED" }),
      });
      if (res.ok) {
        setAlerts((prev) =>
          prev.map((a) =>
            a.id === alertId ? { ...a, status: "RESOLVED" } : a
          )
        );
      }
    } catch (error) {
      console.error("Error resolving alert:", error);
    }
  }

  async function dismissAlert(alertId: string) {
    try {
      const res = await fetch(`/api/inventory/alerts/${alertId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DISMISSED" }),
      });
      if (res.ok) {
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      }
    } catch (error) {
      console.error("Error dismissing alert:", error);
    }
  }

  async function recalculateForecasts() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/inventory/forecast", { method: "POST" });
      if (res.ok) {
        toast.success("Forecasts updated");
        // Predicted depletion times just changed, so pull the list again.
        refresh();
      } else {
        toast.error("Could not update forecasts");
      }
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setRecalculating(false);
    }
  }

  const openCount = alerts.filter((a) => a.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader
        title="Alerts"
        detail={
          loading
            ? undefined
            : openCount > 0
            ? `${openCount} still open`
            : "Nothing open"
        }
        action={
          canRecalculate && (
            <button
              onClick={recalculateForecasts}
              disabled={recalculating}
              className="px-3.5 py-2.5 rounded-control bg-surface border border-rule
                         text-[13px] font-semibold text-ink
                         active:bg-surface-sunk disabled:opacity-50 transition-colors"
            >
              {recalculating ? "Updating" : "Recalculate"}
            </button>
          )
        }
      />

      <div className="flex gap-2 px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            aria-pressed={filter === f.value}
            className={`px-3.5 py-2 rounded-control text-[13px] font-semibold
                        transition-colors
                        ${
                          filter === f.value
                            ? "bg-ink text-white"
                            : "bg-surface border border-rule text-ink-2 active:bg-surface-sunk"
                        }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <ListState
        loading={loading}
        isEmpty={alerts.length === 0}
        skeletonRows={3}
        emptyMessage={
          filter === "ACTIVE"
            ? "Nothing needs attention right now."
            : "No alerts to show."
        }
      >
        <div className="rule-list border-y border-rule">
          {alerts.map((alert) => {
            const isOpen = alert.status === "ACTIVE";
            const item = alert.inventoryItem;
            const isCritical = item.currentStock <= item.safetyStock;

            return (
              <div
                key={alert.id}
                className={`spine ${
                  isOpen ? (isCritical ? "text-flame" : "text-amber") : "text-transparent"
                } bg-surface px-4 py-4`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] leading-tight text-ink truncate">
                      {item.name}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-3">
                      {runOutPhrase(alert.predictedDepletionAt)}
                    </p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      Flagged {formatRelativeTime(alert.createdAt)}
                    </p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`tnum text-quantity ${isOpen && isCritical ? "text-flame" : "text-ink"}`}>
                      {item.currentStock}
                      <span className="ml-1 text-[13px] font-medium text-ink-3 tracking-normal">
                        {item.unit}
                      </span>
                    </p>
                    {!isOpen && (
                      <p className="mt-1 text-[13px] font-semibold text-ink-3">Handled</p>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="flex gap-2 mt-3.5">
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="flex-1 py-2.5 rounded-control bg-ink text-white
                                 font-semibold text-[15px] touch-feedback"
                    >
                      Handled
                    </button>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="px-5 py-2.5 rounded-control bg-surface-sunk text-ink
                                 font-semibold text-[15px] touch-feedback"
                    >
                      Ignore
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ListState>
    </div>
  );
}
