"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ItemCard from "@/components/ItemCard";
import QuantityModal from "@/components/QuantityModal";
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

const WASTE_REASONS = [
  { value: "EXPIRED",         label: "Expired"        },
  { value: "SPOILED",         label: "Spoiled"        },
  { value: "OVERCOOKED",      label: "Overcooked"     },
  { value: "DROPPED",         label: "Dropped"        },
  { value: "OVER_PREP",       label: "Over-prepped"   },
  { value: "CUSTOMER_RETURN", label: "Customer Return"},
  { value: "OTHER",           label: "Other"          },
];

export default function WastePage() {
  const [items,          setItems]          = useState<InventoryItem[]>([]);
  const [filteredItems,  setFilteredItems]  = useState<InventoryItem[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(false);
  const [search,         setSearch]         = useState("");
  const [selectedItem,   setSelectedItem]   = useState<InventoryItem | null>(null);
  const [selectedReason, setSelectedReason] = useState("SPOILED");
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [submitting,     setSubmitting]     = useState(false);
  const user = getUser();

  const fetchItems = async () => {
    setError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setItems(data.items ?? []);
      setFilteredItems(data.items ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredItems(
      q
        ? items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.category?.toLowerCase().includes(q)
          )
        : items
    );
  }, [search, items]);

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
          userId:   user?.id,
        }),
      });

      if (res.ok) {
        toast.success(`Logged ${quantity} ${selectedItem.unit} waste: ${selectedItem.name}`);
        setItems((prev) =>
          prev.map((item) =>
            item.id === selectedItem.id
              ? { ...item, currentStock: Math.max(0, item.currentStock - quantity) }
              : item
          )
        );
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to log waste");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
      setSelectedItem(null);
      setSelectedReason("SPOILED");
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Log Waste</h1>
        <p className="text-sm text-gray-500">Record wasted items with reason</p>
      </header>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
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
            onClick={fetchItems}
            className="px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600"
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
              onClick={() => handleItemClick(item)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          {search ? "No items match your search" : "No inventory items yet"}
        </p>
      )}

      {/* Reason Picker */}
      {showReasonPicker && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white rounded-t-2xl p-4">
            <div className="flex justify-center mb-3">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Why is {selectedItem.name} being wasted?
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {WASTE_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => handleReasonSelect(reason.value)}
                  className={`p-3 rounded-xl border-2 font-medium transition-colors ${
                    selectedReason === reason.value
                      ? "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => { setShowReasonPicker(false); setSelectedItem(null); }}
              className="w-full mt-4 py-3 text-gray-500 font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Quantity Modal */}
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
          mode="subtract"
          isLoading={submitting}
        />
      )}
    </div>
  );
}
