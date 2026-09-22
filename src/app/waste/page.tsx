"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import ItemCard from "@/components/ItemCard";
import QuantityModal from "@/components/QuantityModal";
import PageHeader from "@/components/PageHeader";
import ListState from "@/components/ListState";

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

const WASTE_REASONS = [
  { value: "SPOILED",         label: "Spoiled"         },
  { value: "EXPIRED",         label: "Expired"         },
  { value: "OVERCOOKED",      label: "Overcooked"      },
  { value: "DROPPED",         label: "Dropped"         },
  { value: "OVER_PREP",       label: "Over-prepped"    },
  { value: "CUSTOMER_RETURN", label: "Sent back"       },
  { value: "OTHER",           label: "Something else"  },
];

export default function WastePage() {
  const [items,            setItems]            = useState<InventoryItem[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState(false);
  const [search,           setSearch]           = useState("");
  const [selectedItem,     setSelectedItem]     = useState<InventoryItem | null>(null);
  const [selectedReason,   setSelectedReason]   = useState("SPOILED");
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [submitting,       setSubmitting]       = useState(false);

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

  const handleItemClick = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowReasonPicker(true);
  };

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    setShowReasonPicker(false);
  };

  const handleSubmitWaste = async (quantity: number) => {
    if (!selectedItem) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/waste", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          itemId:   selectedItem.id,
          quantity,
          unit:     selectedItem.unit,
          reason:   selectedReason,
        }),
      });

      if (res.ok) {
        toast.success(`Logged ${quantity} ${selectedItem.unit} wasted`);
        // Refetch so `status` reflects the new level; the old optimistic update
        // adjusted currentStock but left the status badge stale.
        refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not log waste");
      }
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setSubmitting(false);
      setSelectedItem(null);
      setSelectedReason("SPOILED");
    }
  };

  return (
    <div>
      <PageHeader
        title="Waste"
        detail="Tap an item, then say what happened"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Find an item"
      />

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
          {filteredItems.map((item) => (
            <ItemCard
              key={item.id}
              name={item.name}
              currentStock={item.currentStock}
              unit={item.unit}
              status={item.status}
              category={item.category ?? undefined}
              parLevel={item.parLevel}
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      </ListState>

      {/* Reason comes before quantity: it is the question the cook can answer
          immediately, while the amount often needs a second look. */}
      {showReasonPicker && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => { setShowReasonPicker(false); setSelectedItem(null); }}
            aria-hidden="true"
          />
          <div
            className="animate-sheet relative w-full max-w-md bg-surface
                       rounded-t-sheet sm:rounded-sheet pb-safe shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reason-title"
          >
            <div className="px-5 pt-5 pb-4 border-b border-rule">
              <h2 id="reason-title" className="text-lg font-bold leading-tight text-ink">
                What happened?
              </h2>
              <p className="mt-0.5 text-[15px] text-ink-2 truncate">{selectedItem.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 p-4">
              {WASTE_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => handleReasonSelect(reason.value)}
                  className={`py-3.5 px-3 rounded-control font-semibold text-[15px]
                              transition-colors touch-manipulation
                              ${
                                selectedReason === reason.value
                                  ? "bg-flame text-white"
                                  : "bg-surface-sunk text-ink active:bg-rule"
                              }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => { setShowReasonPicker(false); setSelectedItem(null); }}
                className="w-full py-3 text-[15px] font-semibold text-ink-2
                           active:text-ink transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedItem && !showReasonPicker && (
        <QuantityModal
          isOpen={true}
          onClose={() => {
            setSelectedItem(null);
            setSelectedReason("SPOILED");
          }}
          onSubmit={handleSubmitWaste}
          itemName={selectedItem.name}
          unit={selectedItem.unit}
          currentQuantity={selectedItem.currentStock}
          mode="subtract"
          isLoading={submitting}
        />
      )}
    </div>
  );
}
