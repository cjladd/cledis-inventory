"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ItemCard from "@/components/ItemCard";
import AlertBanner from "@/components/AlertBanner";

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
  inventoryItem: {
    id:           string;
    name:         string;
    unit:         string;
    currentStock: number;
    safetyStock:  number;
  };
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
  if (h < 12) return "Morning";
  if (h < 17) return "Afternoon";
  return "Evening";
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
  const { data: session } = useSession();
  const router = useRouter();

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

  // These were hardcoded to 0, which made every banner row read "Critical".
  // The alerts endpoint already returns real stock figures.
  const lowStockBanner = alerts.map((a) => ({
    id:           a.inventoryItem.id,
    name:         a.inventoryItem.name,
    currentStock: a.inventoryItem.currentStock,
    safetyStock:  a.inventoryItem.safetyStock,
    unit:         a.inventoryItem.unit,
  }));

  const lowCount =
    (stats?.lowStock ?? 0) + (stats?.criticalStock ?? 0) + (stats?.outOfStock ?? 0);

  return (
    <div>
      <header className="px-4 pt-6 pb-5">
        <p className="text-[13px] font-semibold text-ink-3">{formatToday()}</p>
        <h1 className="mt-1 text-[28px] font-extrabold leading-none tracking-tight text-ink">
          {getGreeting()}, {session?.user?.name?.split(" ")[0] ?? "chef"}
        </h1>
      </header>

      {/* What needs doing comes before anything else on the screen. */}
      {lowStockBanner.length > 0 && (
        <AlertBanner items={lowStockBanner} maxItems={3} />
      )}

      {/* The two things anyone opens this app to do. */}
      <div className="grid grid-cols-2 gap-3 px-4 py-5">
        <Link
          href="/prep"
          className="flex flex-col justify-between h-28 p-4 rounded-control
                     bg-amber text-white touch-feedback"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
          </svg>
          <span className="text-[17px] font-bold leading-none">Log prep</span>
        </Link>

        <Link
          href="/waste"
          className="flex flex-col justify-between h-28 p-4 rounded-control
                     bg-ink text-white touch-feedback"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[17px] font-bold leading-none">Log waste</span>
        </Link>
      </div>

      {/* A quiet read on the shift, not a grid of tiles. */}
      <div className="flex items-stretch border-y border-rule bg-surface">
        {[
          { value: stats?.totalItems ?? 0, label: "items tracked" },
          { value: lowCount,               label: "running low" },
          { value: stats?.todayPreps ?? 0, label: "preps today" },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 px-4 py-4 ${i > 0 ? "border-l border-rule" : ""}`}
          >
            <p className="tnum text-[26px] font-extrabold leading-none text-ink">
              {loading ? "—" : stat.value}
            </p>
            <p className="mt-1.5 text-[12px] text-ink-3 leading-tight">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="pt-6">
        <div className="flex items-baseline justify-between px-4 pb-3">
          <h2 className="text-[15px] font-bold text-ink">Running low</h2>
          <Link href="/alerts" className="text-[13px] font-semibold text-ink-2 hover:text-ink">
            All alerts
          </Link>
        </div>

        {loading ? (
          <div className="rule-list border-y border-rule">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface px-4 py-3.5 min-h-[72px] flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-2/5 rounded bg-surface-sunk animate-pulse" />
                  <div className="h-3 w-1/5 rounded bg-surface-sunk animate-pulse" />
                </div>
                <div className="h-6 w-14 rounded bg-surface-sunk animate-pulse" />
              </div>
            ))}
          </div>
        ) : attentionItems.length > 0 ? (
          <div className="rule-list border-y border-rule">
            {attentionItems.map((item) => (
              <ItemCard
                key={item.id}
                name={item.name}
                currentStock={item.currentStock}
                unit={item.unit}
                status={item.status}
                category={item.category ?? undefined}
                parLevel={item.parLevel}
                onClick={() => router.push("/prep")}
              />
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center border-y border-rule bg-surface">
            <p className="text-[15px] font-semibold text-ink">Everything is at level</p>
            <p className="mt-1 text-[13px] text-ink-2">
              Nothing needs prepping right now.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
