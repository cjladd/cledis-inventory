"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ItemCard from "@/components/ItemCard";
import AlertBanner from "@/components/AlertBanner";
import { getUser } from "@/lib/auth";

type InventoryItem = {
  id:           string;
  name:         string;
  currentStock: number;
  unit:         string;
  parLevel:     number;
  safetyStock:  number;
  category:     string | null;
  status:       "ok" | "low" | "critical" | "out";
};

type AlertItem = {
  id:            string;
  inventoryItem: { id: string; name: string };
  predictedDepletionAt: string | null;
};

type Stats = {
  totalItems:    number;
  lowStock:      number;
  criticalStock: number;
  outOfStock:    number;
  activeAlerts:  number;
  todayPreps:    number;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatToday() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month:   "long",
    day:     "numeric",
  });
}

export default function HomePage() {
  const [items,   setItems]   = useState<InventoryItem[]>([]);
  const [alerts,  setAlerts]  = useState<AlertItem[]>([]);
  const [stats,   setStats]   = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const user = getUser();

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemsRes, alertsRes, statsRes] = await Promise.all([
          fetch("/api/inventory?limit=20"),
          fetch("/api/inventory/alerts?status=ACTIVE&limit=5"),
          fetch("/api/inventory/stats"),
        ]);

        if (itemsRes.ok)  setItems((await itemsRes.json()).items  ?? []);
        if (alertsRes.ok) setAlerts((await alertsRes.json()).alerts ?? []);
        if (statsRes.ok)  setStats(await statsRes.json());
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Sort attention-needed items by severity
  const severityOrder = { out: 0, critical: 1, low: 2, ok: 3 };
  const attentionItems = [...items]
    .filter((i) => i.status !== "ok")
    .sort((a, b) => severityOrder[a.status] - severityOrder[b.status])
    .slice(0, 5);

  const lowStockBanner = alerts.map((a) => ({
    id:           a.inventoryItem.id,
    name:         a.inventoryItem.name,
    currentStock: 0,
    minStock:     0,
  }));

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6">
        <p className="text-sm text-emerald-600 font-medium">{formatToday()}</p>
        <h1 className="text-2xl font-bold text-gray-900 mt-0.5">
          {getGreeting()}, {user?.name?.split(" ")[0] ?? "Chef"} 👋
        </h1>
      </header>

      {/* Alert Banner */}
      {lowStockBanner.length > 0 && (
        <div className="mb-5">
          <AlertBanner items={lowStockBanner} maxItems={3} />
        </div>
      )}

      {/* KPI Cards */}
      <section className="mb-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label="Total Items"
              value={stats?.totalItems ?? 0}
              icon="📦"
              color="bg-blue-50 border-blue-100"
              textColor="text-blue-700"
            />
            <KpiCard
              label="Low Stock"
              value={(stats?.lowStock ?? 0) + (stats?.criticalStock ?? 0) + (stats?.outOfStock ?? 0)}
              icon="⚠️"
              color="bg-amber-50 border-amber-100"
              textColor="text-amber-700"
            />
            <KpiCard
              label="Active Alerts"
              value={stats?.activeAlerts ?? 0}
              icon="🔔"
              color={stats?.activeAlerts ? "bg-red-50 border-red-100" : "bg-emerald-50 border-emerald-100"}
              textColor={stats?.activeAlerts ? "text-red-700" : "text-emerald-700"}
            />
            <KpiCard
              label="Today's Preps"
              value={stats?.todayPreps ?? 0}
              icon="✅"
              color="bg-emerald-50 border-emerald-100"
              textColor="text-emerald-700"
            />
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/prep"
            className="flex flex-col items-center justify-center p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-500 rounded-full mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <span className="font-medium text-emerald-700">Log Prep</span>
          </Link>

          <Link
            href="/waste"
            className="flex flex-col items-center justify-center p-4 bg-red-50 border-2 border-red-200 rounded-xl active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-red-500 rounded-full mb-2">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <span className="font-medium text-red-700">Log Waste</span>
          </Link>
        </div>
      </section>

      {/* Attention Needed */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">Attention Needed</h2>
          <Link href="/alerts" className="text-sm text-emerald-600 font-medium">
            View All
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : attentionItems.length > 0 ? (
          <div className="space-y-3">
            {attentionItems.map((item) => (
              <ItemCard
                key={item.id}
                name={item.name}
                currentStock={item.currentStock}
                unit={item.unit}
                status={item.status}
                category={item.category ?? undefined}
                onClick={() => {}}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-emerald-50 rounded-xl border border-emerald-100">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-emerald-700 font-medium">All items are well stocked!</p>
          </div>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  color,
  textColor,
}: {
  label:     string;
  value:     number;
  icon:      string;
  color:     string;
  textColor: string;
}) {
  return (
    <div className={`p-4 rounded-xl border-2 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
    </div>
  );
}
