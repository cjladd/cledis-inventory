"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type InventoryItem = {
  id:          string;
  name:        string;
  unit:        string;
  parLevel:    number;
  safetyStock: number;
  category:    string;
  isActive:    boolean;
};

const CATEGORIES = ["Protein", "Prep", "Sides", "Dairy", "Produce", "Staples", "Other"];

const EMPTY_FORM = { name: "", unit: "", parLevel: 0, safetyStock: 0, category: "Prep" };

export default function ItemsPage() {
  const [items,   setItems]   = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState<InventoryItem | null>(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/admin/items");
      if (res.ok) setItems((await res.json()).items ?? []);
    } catch {
      toast.error("Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({
      name:        item.name,
      unit:        item.unit,
      parLevel:    item.parLevel,
      safetyStock: item.safetyStock,
      category:    item.category,
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.unit.trim()) {
      toast.error("Name and unit are required");
      return;
    }
    if (form.parLevel <= 0 || form.safetyStock < 0) {
      toast.error("Par level must be > 0");
      return;
    }

    setSaving(true);
    try {
      const url    = "/api/admin/items";
      const method = editItem ? "PATCH" : "POST";
      const body   = editItem ? { id: editItem.id, ...form } : form;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      if (res.ok) {
        toast.success(editItem ? "Item updated" : "Item created");
        setShowModal(false);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Save failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InventoryItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/items?id=${item.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item deleted");
        fetchItems();
      } else {
        toast.error("Delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/settings" className="text-emerald-600 hover:text-emerald-700">
            ← Settings
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Items</h1>
        <p className="text-sm text-gray-500">{items.length} items total</p>
      </header>

      {/* Toolbar */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search items…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
        />
        <button
          onClick={openAdd}
          className="px-4 py-2.5 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors text-sm whitespace-nowrap"
        >
          + Add Item
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-500 py-10">
          {search ? "No items match your search" : "No items yet — click Add Item"}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                <p className="text-xs text-gray-500">
                  {item.category} · Par: {item.parLevel} {item.unit} · Safety: {item.safetyStock}
                </p>
              </div>
              <div className="flex gap-2 ml-3 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editItem ? "Edit Item" : "New Inventory Item"}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Chicken (cooked)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="lb, qt, bag…"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Par Level</label>
                  <input
                    type="number"
                    value={form.parLevel}
                    onChange={(e) => setForm({ ...form, parLevel: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="any"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safety Stock</label>
                  <input
                    type="number"
                    value={form.safetyStock}
                    onChange={(e) => setForm({ ...form, safetyStock: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="any"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving…" : editItem ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
