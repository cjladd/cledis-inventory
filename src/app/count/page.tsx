"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import QuantityModal from "@/components/QuantityModal";
import PageHeader from "@/components/PageHeader";
import ListState from "@/components/ListState";
import { formatRelativeTime } from "@/lib/utils";

type InventoryItem = {
  id:           string;
  name:         string;
  currentStock: number;
  unit:         string;
  parLevel:     number;
  safetyStock:  number;
  category:     string | null;
  status:       "ok" | "low" | "critical" | "out";
  basis:        "count" | "par";
  countedAt:    string | null;
};

type StorageArea = "COOLER" | "LINE" | "DRY" | "WALKIN";
type CountType = "PREP" | "ORDER";

const AREAS: { value: StorageArea; label: string }[] = [
  { value: "COOLER", label: "Cooler" },
  { value: "WALKIN", label: "Walk-in" },
  { value: "DRY",    label: "Dry" },
  { value: "LINE",   label: "Line" },
];

const TYPES: { value: CountType; label: string; detail: string }[] = [
  { value: "PREP",  label: "Prep count",  detail: "Morning cooler count for the prep list" },
  { value: "ORDER", label: "Order count", detail: "Full walk before placing an order" },
];

export default function CountPage() {
  const [items,        setItems]        = useState<InventoryItem[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);
  const [search,       setSearch]       = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting,   setSubmitting]   = useState(false);

  const [storageArea, setStorageArea] = useState<StorageArea>("COOLER");
  const [countType,   setCountType]   = useState<CountType>("PREP");

  /** Items counted during this pass, so the list shows progress as you walk. */
  const [countedNow, setCountedNow] = useState<Set<string>>(new Set());

  // Bumping refreshKey re-runs the load; keeping the fetch inside the effect is
  // what react-hooks/set-state-in-effect expects, and the cancelled flag stops a
  // late response from setting state after unmount.
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

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const handleSubmitCount = async (quantity: number) => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/count", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          itemId: selectedItem.id,
          quantity,
          unit:   selectedItem.unit,
          storageArea,
          countType,
        }),
      });

      if (res.ok) {
        toast.success(`${selectedItem.name}: ${quantity} ${selectedItem.unit}`);
        setCountedNow((prev) => new Set(prev).add(selectedItem.id));
        refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not save the count");
      }
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setSubmitting(false);
      setSelectedItem(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Count"
        detail={
          countedNow.size > 0
            ? `${countedNow.size} counted this round`
            : "Enter what you can actually see"
        }
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Find an item"
      />

      {/* What this count covers. Recorded with every entry, because a cooler
          count and a full ordering walk are different numbers. */}
      <div className="px-4 py-3 bg-surface border-b border-rule space-y-3">
        <div className="flex gap-2">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setCountType(t.value)}
              aria-pressed={countType === t.value}
              className={`flex-1 px-3 py-2.5 rounded-control text-[13px] font-semibold
                          transition-colors
                          ${
                            countType === t.value
                              ? "bg-ink text-white"
                              : "bg-surface-sunk text-ink-2 active:bg-rule"
                          }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {AREAS.map((a) => (
            <button
              key={a.value}
              onClick={() => setStorageArea(a.value)}
              aria-pressed={storageArea === a.value}
              className={`flex-1 px-2 py-2 rounded-control text-[13px] font-semibold
                          transition-colors
                          ${
                            storageArea === a.value
                              ? "bg-amber text-white"
                              : "bg-surface-sunk text-ink-2 active:bg-rule"
                          }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <ListState
        loading={loading}
        error={error}
        onRetry={refresh}
        isEmpty={filteredItems.length === 0}
        emptyMessage={
          search ? `Nothing matches "${search}"` : "No items set up yet"
        }
      >
        <div className="rule-list border-y border-rule">
          {filteredItems.map((item) => {
            const justCounted = countedNow.has(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className={`w-full text-left px-4 py-3.5 min-h-[72px]
                            flex items-center gap-4 transition-colors
                            ${justCounted ? "bg-surface-sunk" : "bg-surface active:bg-surface-sunk"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[15px] leading-tight text-ink truncate">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[13px] text-ink-3 truncate">
                    {justCounted
                      ? "Counted just now"
                      : item.countedAt
                      ? `Last counted ${formatRelativeTime(item.countedAt)}`
                      : "Never counted"}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="tnum text-quantity text-ink">
                    {item.currentStock}
                    <span className="ml-1 text-[13px] font-medium text-ink-3 tracking-normal">
                      {item.unit}
                    </span>
                  </p>
                  <p className="mt-1 text-[13px] text-ink-3">
                    {item.basis === "count" ? "projected" : "assumed"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </ListState>

      {selectedItem && (
        <QuantityModal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          onSubmit={handleSubmitCount}
          itemName={selectedItem.name}
          unit={selectedItem.unit}
          currentQuantity={selectedItem.currentStock}
          mode="count"
          isLoading={submitting}
        />
      )}
    </div>
  );
}
