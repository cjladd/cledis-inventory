"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";

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

export default function AlertsPage() {
  const { data: session } = useSession();
  const sessionRole = (session?.user as { role?: string })?.role;
  const canRecalculate = sessionRole === "ADMIN" || sessionRole === "MANAGER";

  const [alerts,       setAlerts]       = useState<Alert[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<"ACTIVE" | "RESOLVED" | "all">("ACTIVE");
  const [recalculating, setRecalculating] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?status=${filter}` : "";
      const res = await fetch(`/api/inventory/alerts${params}`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (error) {
      console.error("Error fetching alerts:", error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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

  function formatTimeAgo(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }

  async function recalculateForecasts() {
    setRecalculating(true);
    try {
      const res = await fetch("/api/inventory/forecast", { method: "POST" });
      if (res.ok) {
        toast.success("Forecasts updated");
      } else {
        toast.error("Failed to update forecasts");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRecalculating(false);
    }
  }

  function formatETA(dateStr: string | null) {
    if (!dateStr) return "Unknown";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    if (diffMs < 0) return "Overdue";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}h ${diffMins % 60}m`;
  }

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alerts</h1>
            <p className="text-sm text-gray-500">Items needing attention</p>
          </div>
          {canRecalculate && (
            <button
              onClick={recalculateForecasts}
              disabled={recalculating}
              className="px-3 py-2 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl
                         hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              {recalculating ? "Updating…" : "Recalculate"}
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {(["ACTIVE", "RESOLVED", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f
                ? "bg-emerald-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : alerts.length > 0 ? (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border-2 ${
                alert.status === "ACTIVE"
                  ? "border-red-200 bg-red-50"
                  : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">
                    {alert.inventoryItem.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Current: {alert.inventoryItem.currentStock}{" "}
                    {alert.inventoryItem.unit}
                  </p>
                  <div className="flex gap-4 mt-1 text-xs text-gray-500">
                    <span>ETA to out: {formatETA(alert.predictedDepletionAt)}</span>
                    <span>Created: {formatTimeAgo(alert.createdAt)}</span>
                  </div>
                </div>
                {alert.status === "ACTIVE" && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                    Active
                  </span>
                )}
                {alert.status === "RESOLVED" && (
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                    Resolved
                  </span>
                )}
              </div>

              {alert.status === "ACTIVE" && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="flex-1 py-2 bg-emerald-500 text-white font-medium rounded-lg touch-feedback"
                  >
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-lg touch-feedback"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-emerald-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-gray-500">No alerts at this time 🎉</p>
        </div>
      )}
    </div>
  );
}
