"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import ItemCard from "@/components/ItemCard";
import QuantityModal from "@/components/QuantityModal";

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

export default function PrepPage() {
  const [items,        setItems]        = useState<InventoryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [search,       setSearch]       = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  // Bumping refreshKey re-runs the load. Keeping the fetch inside the effect
  // (rather than calling an outer function) is what react-hooks expects, and
  // the cancelled flag stops a late response from setting state after unmount.
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/inventory");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (cancelled) return;
        setItems(data.items ?? []);
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshKey]);

  // Derived from items + search, so it is computed during render rather than
  // mirrored into state by an effect.
  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSubmitPrep = async (quantity: number) => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/prep", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          itemId:   selectedItem.id,
          quantity,
          unit:     selectedItem.unit,
        }),
      });

      if (res.ok) {
        toast.success(`Added ${quantity} ${selectedItem.unit} of ${selectedItem.name}`);
        // Refetch rather than patching currentStock locally: the old optimistic
        // update left `status` stale, so an item could still read "Critical"
        // right after being topped up.
        refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to log prep");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Log Prep</h1>
        <p className="text-sm text-gray-500">Tap an item to add prepared quantity</p>
      </header>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">Failed to load inventory</p>
          <button
            onClick={refresh}
            className="px-6 py-2 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
          >
            Retry
          </button>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              name={item.name}
              currentStock={item.currentStock}
              unit={item.unit}
              status={item.status}
              category={item.category ?? undefined}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          {search ? "No items match your search" : "No inventory items yet"}
        </p>
      )}

      {selectedItem && (
        <QuantityModal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          onSubmit={handleSubmitPrep}
          itemName={selectedItem.name}
          unit={selectedItem.unit}
          currentQuantity={selectedItem.currentStock}
          mode="add"
          isLoading={submitting}
        />
      )}
    </div>
  );
}
