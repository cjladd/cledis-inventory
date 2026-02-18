"use client";

import { useState, useEffect } from "react";
import ItemCard from "@/components/ItemCard";
import AlertBanner from "@/components/AlertBanner";
import Link from "next/link";

type InventoryItem = {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  parLevel: number;
  safetyStock: number;
  category: string | null;
  status: "ok" | "low" | "critical" | "out";
};

type Alert = {
  id: string;
  inventoryItem: {
    id: string;
    name: string;
  };
  predictedDepletionAt: string | null;
};

export default function HomePage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [itemsRes, alertsRes] = await Promise.all([
          fetch("/api/inventory?limit=5&sortBy=status"),
          fetch("/api/inventory/alerts?status=ACTIVE&limit=5"),
        ]);
        
        if (itemsRes.ok) {
          const data = await itemsRes.json();
          setItems(data.items || []);
        }
        if (alertsRes.ok) {
          const data = await alertsRes.json();
          setAlerts(data.alerts || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const lowStockItems = alerts.map((a) => ({
    id: a.inventoryItem.id,
    name: a.inventoryItem.name,
    currentStock: 0, // Will be populated from items
    minStock: 0,
  }));

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Kitchen-Up</h1>
        <p className="text-sm text-gray-500">Real-time inventory tracking</p>
      </header>

      {/* Alert Banner */}
      {lowStockItems.length > 0 && (
        <div className="mb-6">
          <AlertBanner items={lowStockItems} maxItems={3} />
        </div>
      )}

      {/* Quick Actions */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/prep"
            className="flex flex-col items-center justify-center p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl touch-feedback"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-emerald-500 rounded-full mb-2">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <span className="font-medium text-emerald-700">Log Prep</span>
          </Link>

          <Link
            href="/waste"
            className="flex flex-col items-center justify-center p-4 bg-red-50 border-2 border-red-200 rounded-xl touch-feedback"
          >
            <div className="w-12 h-12 flex items-center justify-center bg-red-500 rounded-full mb-2">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </div>
            <span className="font-medium text-red-700">Log Waste</span>
          </Link>
        </div>
      </section>

      {/* Low Stock Items */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Attention Needed
          </h2>
          <Link
            href="/alerts"
            className="text-sm text-emerald-600 font-medium"
          >
            View All
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 bg-gray-100 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : items.length > 0 ? (
          <div className="space-y-3">
            {items
              .filter((item) => item.status !== "ok")
              .slice(0, 5)
              .map((item) => (
                <ItemCard
                  key={item.id}
                  name={item.name}
                  currentStock={item.currentStock}
                  unit={item.unit}
                  status={item.status}
                  category={item.category || undefined}
                  onClick={() => {}}
                />
              ))}
            {items.filter((item) => item.status !== "ok").length === 0 && (
              <p className="text-center text-gray-500 py-8">
                All items are well stocked! 🎉
              </p>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">
            No inventory items yet. Add items in Settings.
          </p>
        )}
      </section>
    </div>
  );
}
