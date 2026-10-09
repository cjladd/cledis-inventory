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

  const needsAttention = useMemo(
    () => items.filter((i) => i.status !== "ok").length,
    [items]
  );

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
        toast.success(`Logged ${quantity} ${selectedItem.unit} of ${selectedItem.name}`);
        // Refetch rather than patching currentStock locally: the old optimistic
        // update left `status` stale, so an item could still read "Critical"
        // right after being topped up.
        refresh();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not log prep");
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
        title="Prep"
        detail={
          loading
            ? undefined
            : needsAttention > 0
            ? `${needsAttention} of ${items.length} items need topping up`
            : `${items.length} items, all at level`
        }
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
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      </ListState>

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
