"use client";

import { useState, useEffect } from "react";
import ItemCard from "@/components/ItemCard";
import QuantityModal from "@/components/QuantityModal";

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

export default function PrepPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchItems() {
      try {
        const res = await fetch("/api/inventory");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
          setFilteredItems(data.items || []);
        }
      } catch (error) {
        console.error("Error fetching items:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchItems();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = items.filter(
        (item) =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          item.category?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [search, items]);

  const handleSubmitPrep = async (quantity: number) => {
    if (!selectedItem) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/inventory/prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selectedItem.id,
          quantity,
          unit: selectedItem.unit,
          note: "",
        }),
      });

      if (res.ok) {
        setSuccessMessage(`Added ${quantity} ${selectedItem.unit} of ${selectedItem.name}`);
        // Update local state
        setItems((prev) =>
          prev.map((item) =>
            item.id === selectedItem.id
              ? { ...item, currentStock: item.currentStock + quantity }
              : item
          )
        );
        setTimeout(() => setSuccessMessage(""), 3000);
      }
    } catch (error) {
      console.error("Error logging prep:", error);
    } finally {
      setSubmitting(false);
      setSelectedItem(null);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Log Prep</h1>
        <p className="text-sm text-gray-500">
          Tap an item to add prepared quantity
        </p>
      </header>

      {/* Success Toast */}
      {successMessage && (
        <div className="fixed top-4 left-4 right-4 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg animate-pulse">
          ✓ {successMessage}
        </div>
      )}

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
        />
      </div>

      {/* Items List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
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
              category={item.category || undefined}
              onClick={() => setSelectedItem(item)}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">
          {search ? "No items match your search" : "No inventory items yet"}
        </p>
      )}

      {/* Quantity Modal */}
      {selectedItem && (
        <QuantityModal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          onSubmit={handleSubmitPrep}
          itemName={selectedItem.name}
          unit={selectedItem.unit}
          mode="add"
          isLoading={submitting}
        />
      )}
    </div>
  );
}
