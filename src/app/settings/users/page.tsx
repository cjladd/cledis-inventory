"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { PIN_PATTERN, PIN_MIN_LENGTH, PIN_MAX_LENGTH, PIN_RULE_MESSAGE } from "@/lib/pin";
import PageHeader from "@/components/PageHeader";
import ListState from "@/components/ListState";

type User = {
  id:        string;
  name:      string;
  email:     string;
  role:      "ADMIN" | "MANAGER" | "STAFF";
  isActive:  boolean;
  createdAt: string;
};

type FormData = {
  name:  string;
  email: string;
  pin:   string;
  role:  "ADMIN" | "MANAGER" | "STAFF";
};

/** Role reads by weight rather than by colour; colour is reserved for stock. */
const ROLE_STYLE: Record<string, string> = {
  ADMIN:   "bg-ink text-white",
  MANAGER: "bg-surface-sunk text-ink",
  STAFF:   "bg-transparent text-ink-3",
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN:   "Admin",
  MANAGER: "Manager",
  STAFF:   "Line cook",
};

const BLANK_FORM: FormData = { name: "", email: "", pin: "", role: "STAFF" };

const fieldClass =
  "w-full px-4 py-3 rounded-control bg-ground border border-rule text-[15px] text-ink " +
  "placeholder:text-ink-3 focus:outline-none focus:border-ink transition-colors";

const labelClass = "block mb-1.5 text-[13px] font-semibold text-ink-2";

export default function UsersPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [users,          setUsers]          = useState<User[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [editingUser,    setEditingUser]    = useState<User | null>(null);
  const [form,           setForm]           = useState<FormData>(BLANK_FORM);
  const [saving,         setSaving]         = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState<User | null>(null);
  const [deleting,       setDeleting]       = useState(false);

  // Bumping refreshKey re-runs the load; keeping the fetch inside the effect is
  // what react-hooks/set-state-in-effect expects, and the cancelled flag stops a
  // late response from setting state after unmount.
  const [refreshKey, setRefreshKey] = useState(0);
  const [showDeactivated, setShowDeactivated] = useState(false);
  const loadUsers = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(
          `/api/admin/users${showDeactivated ? "?includeInactive=true" : ""}`
        );
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!cancelled) setUsers(data.users ?? []);
      } catch {
        if (!cancelled) toast.error("Could not load the team");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [refreshKey, showDeactivated]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(BLANK_FORM);
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, pin: "", role: user.role });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(BLANK_FORM);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    if (!editingUser && form.pin.length < PIN_MIN_LENGTH) {
      toast.error(PIN_RULE_MESSAGE);
      return;
    }
    // Same rule the API and the login form use, from lib/pin.
    if (form.pin && !PIN_PATTERN.test(form.pin)) {
      toast.error(PIN_RULE_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const url    = "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const body: Record<string, unknown> = editingUser
        ? { id: editingUser.id, name: form.name, email: form.email, role: form.role, ...(form.pin && { pin: form.pin }) }
        : { name: form.name, email: form.email, pin: form.pin, role: form.role };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save");
        return;
      }

      toast.success(editingUser ? "Changes saved" : `${form.name} added`);
      closeModal();
      loadUsers();
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (user: User) => {
    try {
      const res = await fetch("/api/admin/users", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: user.id, isActive: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Could not restore");
        return;
      }
      toast.success(`${user.name} restored`);
      loadUsers();
    } catch {
      toast.error("No connection. Try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not deactivate");
        return;
      }
      toast.success(`${deleteTarget.name} deactivated`);
      setDeleteTarget(null);
      loadUsers();
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Team"
        detail={loading ? undefined : `${users.length} people`}
        backHref="/settings"
        backLabel="Setup"
        action={
          <button
            onClick={openCreate}
            className="px-4 py-2.5 rounded-control bg-ink text-white
                       font-semibold text-[13px] active:bg-ink/90 transition-colors"
          >
            Add person
          </button>
        }
      />

      <label className="flex items-center gap-2.5 px-4 py-3 text-[13px] text-ink-2 select-none">
        <input
          type="checkbox"
          checked={showDeactivated}
          onChange={(e) => setShowDeactivated(e.target.checked)}
          className="w-4 h-4 rounded border-rule-strong text-ink focus:ring-ink"
        />
        Show deactivated
      </label>

      <ListState
        loading={loading}
        isEmpty={users.length === 0}
        skeletonRows={3}
        emptyMessage="Nobody here yet. Add the first person."
      >
        <div className="rule-list border-y border-rule">
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-3 px-4 py-3.5 bg-surface">
              <div
                className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center
                            ${user.isActive ? "bg-surface-sunk" : "bg-transparent border border-rule"}`}
              >
                <span className={`font-bold text-[15px] ${user.isActive ? "text-ink" : "text-ink-3"}`}>
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-[15px] text-ink truncate">{user.name}</p>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold
                                ${ROLE_STYLE[user.role] ?? ROLE_STYLE.STAFF}`}
                  >
                    {ROLE_LABEL[user.role] ?? user.role}
                  </span>
                  {!user.isActive && (
                    <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-surface-sunk
                                     text-[11px] font-semibold text-ink-2">
                      Off
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[13px] text-ink-3 truncate">{user.email}</p>
              </div>

              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="px-3 py-2 rounded-control bg-surface-sunk text-ink
                             text-[13px] font-semibold active:bg-rule transition-colors"
                >
                  Edit
                </button>
                {isAdmin && user.isActive && (
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="px-3 py-2 rounded-control bg-flame-soft text-flame
                               text-[13px] font-semibold active:bg-flame/20 transition-colors"
                  >
                    Turn off
                  </button>
                )}
                {isAdmin && !user.isActive && (
                  <button
                    onClick={() => handleRestore(user)}
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

      {/* Create / edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-ink/50" onClick={closeModal} aria-hidden="true" />
          <div
            className="animate-sheet relative w-full max-w-md bg-surface
                       rounded-t-sheet sm:rounded-sheet pb-safe shadow-2xl
                       max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
          >
            <div className="px-5 pt-5 pb-4 border-b border-rule">
              <h2 id="user-form-title" className="text-lg font-bold text-ink">
                {editingUser ? "Edit person" : "Add person"}
              </h2>
            </div>

            <div className="px-5 py-5 space-y-4">
              <div>
                <label htmlFor="user-name" className={labelClass}>Name</label>
                <input
                  id="user-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="user-email" className={labelClass}>Email</label>
                <input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="name@cledis.com"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="user-pin" className={labelClass}>
                  PIN {editingUser && <span className="font-normal text-ink-3">— leave blank to keep</span>}
                </label>
                <input
                  id="user-pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.pin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pin: e.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH),
                    }))
                  }
                  placeholder={editingUser ? "New PIN" : `${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digits`}
                  className={`${fieldClass} tnum`}
                />
              </div>

              <div>
                <label htmlFor="user-role" className={labelClass}>Role</label>
                <select
                  id="user-role"
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as FormData["role"] }))}
                  className={fieldClass}
                >
                  <option value="STAFF">Line cook — log prep and waste</option>
                  <option value="MANAGER">Manager — also edit items and recipes</option>
                  <option value="ADMIN">Admin — also manage the team</option>
                </select>
                {!isAdmin && (
                  <p className="mt-1.5 text-[13px] text-ink-3">
                    Only an admin can grant manager or admin access.
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 px-5 pb-5">
              <button
                onClick={closeModal}
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
                {saving ? "Saving" : editingUser ? "Save changes" : "Add person"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
          <div
            className="absolute inset-0 bg-ink/50"
            onClick={() => setDeleteTarget(null)}
            aria-hidden="true"
          />
          <div
            className="animate-sheet relative w-full max-w-sm bg-surface rounded-sheet p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="deactivate-title"
          >
            <h2 id="deactivate-title" className="text-lg font-bold text-ink">
              Turn off {deleteTarget.name}?
            </h2>
            <p className="mt-2 text-[15px] text-ink-2">
              They will not be able to log in. Their prep and waste history is kept,
              and you can restore them later.
            </p>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3.5 rounded-control bg-surface-sunk text-ink
                           font-semibold text-[15px] active:bg-rule transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3.5 rounded-control bg-flame text-white
                           font-bold text-[15px] disabled:opacity-40
                           active:bg-flame/90 transition-colors"
              >
                {deleting ? "Turning off" : "Turn off"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
