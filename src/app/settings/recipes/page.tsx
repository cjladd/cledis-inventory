"use client";

import { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import PageHeader from "@/components/PageHeader";
import ListState from "@/components/ListState";

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

const fieldClass =
  "w-full px-4 py-3 rounded-control bg-surface border border-rule text-[15px] text-ink " +
  "placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors";

export default function RecipesPage() {
  const [menuItems,  setMenuItems]  = useState<MenuItem[]>([]);
  const [invItems,   setInvItems]   = useState<InventoryItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [expanded,   setExpanded]   = useState<string | null>(null);
  const [addingFor,  setAddingFor]  = useState<string | null>(null);
  const [form,       setForm]       = useState({ inventoryItemId: "", quantityUsed: 0, unit: "" });
  const [saving,     setSaving]     = useState(false);
  const [search,     setSearch]     = useState("");

  // Bumping refreshKey re-runs the load; keeping the fetch inside the effect is
  // what react-hooks/set-state-in-effect expects, and the cancelled flag stops a
  // late response from setting state after unmount.
  const [refreshKey, setRefreshKey] = useState(0);
  const fetchData = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [recipesRes, itemsRes] = await Promise.all([
          fetch("/api/admin/recipes"),
          fetch("/api/admin/items"),
        ]);
        if (cancelled) return;

        if (recipesRes.ok) setMenuItems((await recipesRes.json()).menuItems ?? []);
        // /api/admin/items returns only active items unless asked otherwise,
        // so retired items cannot be offered as recipe ingredients.
        if (itemsRes.ok) setInvItems((await itemsRes.json()).items ?? []);
      } catch {
        if (!cancelled) toast.error("Could not load recipes");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleAddIngredient = async (menuItemId: string) => {
    if (!form.inventoryItemId || form.quantityUsed <= 0) {
      toast.error("Pick an ingredient and enter how much it uses");
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
        toast.error(err.error ?? "Could not add ingredient");
      }
    } catch {
      toast.error("No connection. Try again.");
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
        toast.error("Could not remove ingredient");
      }
    } catch {
      toast.error("No connection. Try again.");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return menuItems;
    return menuItems.filter((mi) => mi.name.toLowerCase().includes(q));
  }, [menuItems, search]);

  const unmapped = useMemo(
    () => menuItems.filter((mi) => mi.recipes.length === 0).length,
    [menuItems]
  );

  return (
    <div>
      <PageHeader
        title="Recipes"
        detail={
          loading
            ? undefined
            : unmapped > 0
            ? `${unmapped} of ${menuItems.length} menu items have no ingredients yet`
            : `${menuItems.length} menu items mapped`
        }
        backHref="/settings"
        backLabel="Setup"
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Find a menu item"
      />

      <ListState
        loading={loading}
        isEmpty={filtered.length === 0}
        emptyMessage={
          search ? `Nothing matches "${search}"` : "No menu items yet."
        }
      >
        <div className="rule-list border-y border-rule">
          {filtered.map((mi) => {
            const isOpen = expanded === mi.id;

            return (
              <div key={mi.id} className="bg-surface">
                <button
                  onClick={() => setExpanded(isOpen ? null : mi.id)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-left
                             active:bg-surface-sunk transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-ink truncate">{mi.name}</p>
                    <p className="mt-0.5 text-[13px] text-ink-3">
                      {mi.recipes.length === 0
                        ? "No ingredients yet"
                        : `${mi.recipes.length} ingredient${mi.recipes.length !== 1 ? "s" : ""}`}
                    </p>
                  </div>
                  <svg
                    className={`w-5 h-5 flex-shrink-0 text-ink-3 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 bg-ground border-t border-rule">
                    {mi.recipes.length > 0 && (
                      <ul className="rule-list mb-3">
                        {mi.recipes.map((r) => (
                          <li key={r.id} className="flex items-center gap-3 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-[15px] font-medium text-ink truncate">
                                {r.inventoryItem.name}
                              </p>
                              <p className="tnum mt-0.5 text-[13px] text-ink-3">
                                {r.quantityUsed} {r.unit} per order
                              </p>
                            </div>
                            <button
                              onClick={() => handleRemove(r.id)}
                              className="px-3 py-2 rounded-control text-[13px] font-semibold
                                         text-flame active:bg-flame-soft transition-colors"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}

                    {addingFor === mi.id ? (
                      <div className="space-y-3 pt-3 border-t border-rule">
                        <select
                          value={form.inventoryItemId}
                          onChange={(e) => {
                            const item = invItems.find((i) => i.id === e.target.value);
                            setForm({ ...form, inventoryItemId: e.target.value, unit: item?.unit ?? "" });
                          }}
                          aria-label="Ingredient"
                          className={fieldClass}
                        >
                          <option value="">Pick an ingredient</option>
                          {invItems.map((i) => (
                            <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder="How much per order"
                            aria-label="Quantity used per order"
                            value={form.quantityUsed || ""}
                            onChange={(e) => setForm({ ...form, quantityUsed: parseFloat(e.target.value) || 0 })}
                            min={0}
                            step="any"
                            className={`${fieldClass} tnum flex-1`}
                          />
                          <input
                            type="text"
                            placeholder="Unit"
                            aria-label="Unit"
                            value={form.unit}
                            onChange={(e) => setForm({ ...form, unit: e.target.value })}
                            className={`${fieldClass} w-24`}
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => { setAddingFor(null); setForm({ inventoryItemId: "", quantityUsed: 0, unit: "" }); }}
                            className="flex-1 py-3 rounded-control bg-surface-sunk text-ink
                                       font-semibold text-[15px] active:bg-rule transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleAddIngredient(mi.id)}
                            disabled={saving}
                            className="flex-1 py-3 rounded-control bg-ink text-white
                                       font-bold text-[15px] disabled:opacity-40
                                       active:bg-ink/90 transition-colors"
                          >
                            {saving ? "Adding" : "Add"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setAddingFor(mi.id); setForm({ inventoryItemId: "", quantityUsed: 0, unit: "" }); }}
                        className="w-full py-3 rounded-control bg-surface border border-rule
                                   text-ink font-semibold text-[15px]
                                   active:bg-surface-sunk transition-colors"
                      >
                        Add ingredient
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ListState>
    </div>
  );
}
