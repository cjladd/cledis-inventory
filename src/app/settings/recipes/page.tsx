"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type InventoryItem = { id: string; name: string; unit: string };

type Recipe = {
  id:           string;
  quantityUsed: number;
  unit:         string;
  inventoryItem: InventoryItem;
};

type MenuItem = {
  id:              string;
  name:            string;
  toastMenuItemId: string;
  recipes:         Recipe[];
};

export default function RecipesPage() {
  const [menuItems,  setMenuItems]  = useState<MenuItem[]>([]);
  const [invItems,   setInvItems]   = useState<InventoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [addingFor,  setAddingFor]  = useState<string | null>(null);
  const [form,       setForm]       = useState({ inventoryItemId: "", quantityUsed: 0, unit: "" });
  const [saving,     setSaving]     = useState(false);

  const fetchData = async () => {
    try {
      const [recipesRes, itemsRes] = await Promise.all([
        fetch("/api/admin/recipes"),
        fetch("/api/admin/items"),
      ]);
      if (recipesRes.ok) setMenuItems((await recipesRes.json()).menuItems ?? []);
      if (itemsRes.ok)   setInvItems((await itemsRes.json()).items ?? []);
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddIngredient = async (menuItemId: string) => {
    if (!form.inventoryItemId || form.quantityUsed <= 0) {
      toast.error("Select an ingredient and enter a quantity");
      return;
    }

    const selectedItem = invItems.find((i) => i.id === form.inventoryItemId);
    const unit = form.unit || selectedItem?.unit || "";

    setSaving(true);
    try {
      const res = await fetch("/api/admin/recipes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ menuItemId, inventoryItemId: form.inventoryItemId, quantityUsed: form.quantityUsed, unit }),
      });

      if (res.ok) {
        toast.success("Ingredient added");
        setAddingFor(null);
        setForm({ inventoryItemId: "", quantityUsed: 0, unit: "" });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Failed to add ingredient");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (recipeId: string) => {
    try {
      const res = await fetch(`/api/admin/recipes?id=${recipeId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Ingredient removed");
        fetchData();
      } else {
        toast.error("Remove failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/settings" className="text-emerald-600 hover:text-emerald-700">
            ← Settings
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Recipes</h1>
        <p className="text-sm text-gray-500">Map menu items to inventory ingredients</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {menuItems.map((mi) => (
            <div key={mi.id} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Menu item header */}
              <button
                onClick={() => setExpanded(expanded === mi.id ? null : mi.id)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{mi.name}</p>
                  <p className="text-xs text-gray-500">
                    {mi.recipes.length} ingredient{mi.recipes.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${expanded === mi.id ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded === mi.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-2">
                  {/* Existing ingredients */}
                  {mi.recipes.length === 0 ? (
                    <p className="text-sm text-gray-400 italic">No ingredients mapped yet</p>
                  ) : (
                    mi.recipes.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-100">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{r.inventoryItem.name}</p>
                          <p className="text-xs text-gray-500">{r.quantityUsed} {r.unit} per order</p>
                        </div>
                        <button
                          onClick={() => handleRemove(r.id)}
                          className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1"
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}

                  {/* Add ingredient form */}
                  {addingFor === mi.id ? (
                    <div className="bg-white p-3 rounded-lg border-2 border-emerald-200 space-y-3">
                      <p className="text-sm font-medium text-gray-700">Add ingredient</p>
                      <select
                        value={form.inventoryItemId}
                        onChange={(e) => {
                          const item = invItems.find((i) => i.id === e.target.value);
                          setForm({ ...form, inventoryItemId: e.target.value, unit: item?.unit ?? "" });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                      >
                        <option value="">Select ingredient…</option>
                        {invItems.map((i) => (
                          <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Qty per order"
                          value={form.quantityUsed || ""}
                          onChange={(e) => setForm({ ...form, quantityUsed: parseFloat(e.target.value) || 0 })}
                          min={0}
                          step="any"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <input
                          type="text"
                          placeholder="Unit"
                          value={form.unit}
                          onChange={(e) => setForm({ ...form, unit: e.target.value })}
                          className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setAddingFor(null); setForm({ inventoryItemId: "", quantityUsed: 0, unit: "" }); }}
                          className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleAddIngredient(mi.id)}
                          disabled={saving}
                          className="flex-1 py-2 text-sm text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50"
                        >
                          {saving ? "Adding…" : "Add"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setAddingFor(mi.id); setForm({ inventoryItemId: "", quantityUsed: 0, unit: "" }); }}
                      className="w-full py-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
                    >
                      + Add Ingredient
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
