"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import ListState from "@/components/ListState";

type InventoryItem = {
  id:          string;
  name:        string;
  unit:        string;
  parLevel:    number;
  safetyStock: number;
  category:    string;
  isActive:    boolean;
};

const CATEGORIES = ["Protein", "Dairy", "Produce", "Bread", "Frozen", "Dry Goods", "Sauces", "Specialty"];

const EMPTY_FORM = { name: "", unit: "", parLevel: 0, safetyStock: 0, category: "Protein" };

const fieldClass =
  "w-full px-4 py-3 rounded-control bg-ground border border-rule text-[15px] text-ink " +
  "placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors";

const labelClass = "block mb-1.5 text-[13px] font-semibold text-ink-2";

export default function ItemsPage() {
  const [items,   setItems]   = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem,  setEditItem]  = useState<InventoryItem | null>(null);
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");

  // Bumping refreshKey re-runs the load; keeping the fetch inside the effect is
  // what react-hooks/set-state-in-effect expects, and the cancelled flag stops a
  // late response from setting state after unmount.
  const [refreshKey, setRefreshKey] = useState(0);
  const [showRetired, setShowRetired] = useState(false);
  const fetchItems = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/items${showRetired ? "?includeInactive=true" : ""}`
        );
        if (res.ok && !cancelled) setItems((await res.json()).items ?? []);
      } catch {
        if (!cancelled) toast.error("Could not load items");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshKey, showRetired]);

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
      toast.error("Par level must be more than zero");
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
        toast.success(editItem ? "Item updated" : "Item added");
        setShowModal(false);
        fetchItems();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Could not save");
      }
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRetire = async (item: InventoryItem) => {
    if (!confirm(`Retire "${item.name}"? It stops showing in prep and waste, but its history is kept.`)) return;
    try {
      const res = await fetch(`/api/admin/items?id=${item.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Item retired");
        fetchItems();
      } else {
        toast.error("Could not retire item");
      }
    } catch {
      toast.error("No connection. Try again.");
    }
  };

  const handleRestore = async (item: InventoryItem) => {
    try {
      const res = await fetch("/api/admin/items", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: item.id, isActive: true }),
      });
      if (res.ok) {
        toast.success("Item restored");
        fetchItems();
      } else {
        toast.error("Could not restore item");
      }
    } catch {
      toast.error("No connection. Try again.");
    }
  };

  const filtered = useMemo(
    () =>
      items.filter(
        (i) =>
          i.name.toLowerCase().includes(search.toLowerCase()) ||
          i.category.toLowerCase().includes(search.toLowerCase())
      ),
    [items, search]
  );

  return (
    <div>
      <PageHeader
        title="Inventory items"
        detail={loading ? undefined : `${items.length} items`}
        backHref="/settings"
        backLabel="Setup"
        action={
          <button
            onClick={openAdd}
            className="px-4 py-2.5 rounded-control bg-ink text-white
                       font-semibold text-[13px] active:bg-ink/90 transition-colors"
          >
            Add item
          </button>
        }
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Find an item"
      />

      <label className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-ink-2 select-none">
        <input
          type="checkbox"
          checked={showRetired}
          onChange={(e) => setShowRetired(e.target.checked)}
          className="w-4 h-4 rounded border-rule-strong text-ink focus:ring-ink"
        />
        Show retired items
      </label>

      <ListState
        loading={loading}
        isEmpty={filtered.length === 0}
        emptyMessage={
          search ? `Nothing matches "${search}"` : "No items yet. Add the first one."
        }
      >
        <div className="rule-list border-y border-rule">
          {filtered.map((item) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3.5 bg-surface">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[15px] text-ink truncate">{item.name}</p>
                  {!item.isActive && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-surface-sunk
                                     text-[11px] font-semibold text-ink-2">
                      Retired
                    </span>
                  )}
                </div>
                <p className="tnum mt-0.5 text-[13px] text-ink-3">
                  {item.category} &mdash; par {item.parLevel} {item.unit}, safety {item.safetyStock}
                </p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(item)}
                  className="px-3 py-2 rounded-control bg-surface-sunk text-ink
                             text-[13px] font-semibold active:bg-rule transition-colors"
                >
                  Edit
                </button>
                {item.isActive ? (
                  <button
                    onClick={() => handleRetire(item)}
                    className="px-3 py-2 rounded-control bg-flame-soft text-flame
                               text-[13px] font-semibold active:bg-flame/20 transition-colors"
                  >
                    Retire
                  </button>
                ) : (
                  <button
                    onClick={() => handleRestore(item)}
                    className="px-3 py-2 rounded-control bg-surface-sunk text-ink
                               text-[13px] font-semibold active:bg-rule transition-colors"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </ListState>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setShowModal(false)}
            aria-hidden="true"
          />
          <div
            className="animate-sheet relative w-full max-w-md bg-surface
                       rounded-t-sheet sm:rounded-sheet pb-safe shadow-2xl
                       max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-form-title"
          >
            <div className="px-5 pt-5 pb-4 border-b border-rule">
              <h2 id="item-form-title" className="text-lg font-bold text-ink">
                {editItem ? "Edit item" : "New item"}
              </h2>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label htmlFor="item-name" className={labelClass}>Name</label>
                <input
                  id="item-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Chicken breast, sliced"
                  className={fieldClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="item-unit" className={labelClass}>Unit</label>
                  <input
                    id="item-unit"
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    placeholder="lb, case, batch"
                    className={fieldClass}
                  />
                </div>
                <div>
                  <label htmlFor="item-category" className={labelClass}>Category</label>
                  <select
                    id="item-category"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className={fieldClass}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="item-par" className={labelClass}>Par level</label>
                  <input
                    id="item-par"
                    type="number"
                    value={form.parLevel}
                    onChange={(e) => setForm({ ...form, parLevel: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="any"
                    className={`${fieldClass} tnum`}
                  />
                  <p className="mt-1 text-[12px] text-ink-3">What the cooler holds when full</p>
                </div>
                <div>
                  <label htmlFor="item-safety" className={labelClass}>Safety stock</label>
                  <input
                    id="item-safety"
                    type="number"
                    value={form.safetyStock}
                    onChange={(e) => setForm({ ...form, safetyStock: parseFloat(e.target.value) || 0 })}
                    min={0}
                    step="any"
                    className={`${fieldClass} tnum`}
                  />
                  <p className="mt-1 text-[12px] text-ink-3">Below this, it is critical</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3.5 rounded-control bg-surface-sunk text-ink
                           font-semibold text-[15px] active:bg-rule transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3.5 rounded-control bg-ink text-white
                           font-bold text-[15px] disabled:opacity-40
                           active:bg-ink/90 transition-colors"
              >
                {saving ? "Saving" : editItem ? "Save changes" : "Add item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
