"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";

type User = {
  id:        string;
  name:      string;
  email:     string;
  role:      "ADMIN" | "MANAGER" | "STAFF";
  createdAt: string;
};

type FormData = {
  name:  string;
  email: string;
  pin:   string;
  role:  "ADMIN" | "MANAGER" | "STAFF";
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  STAFF:   "bg-gray-100 text-gray-700",
};

const BLANK_FORM: FormData = { name: "", email: "", pin: "", role: "STAFF" };

export default function UsersPage() {
  const { data: session } = useSession();
  const sessionRole = (session?.user as { role?: string })?.role;
  const isAdmin = sessionRole === "ADMIN";

  const [users,          setUsers]          = useState<User[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showModal,      setShowModal]      = useState(false);
  const [editingUser,    setEditingUser]    = useState<User | null>(null);
  const [form,           setForm]           = useState<FormData>(BLANK_FORM);
  const [saving,         setSaving]         = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState<User | null>(null);
  const [deleting,       setDeleting]       = useState(false);

  const loadUsers = () => {
    setLoading(true);
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  };

  useEffect(loadUsers, []);

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
    if (!editingUser && form.pin.length < 4) {
      toast.error("PIN must be at least 4 digits");
      return;
    }
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) {
      toast.error("PIN must be 4-6 digits");
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
        toast.error(data.error ?? (editingUser ? "Failed to update user" : "Failed to create user"));
        return;
      }

      toast.success(editingUser ? "User updated" : "User created");
      closeModal();
      loadUsers();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/users?id=${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to delete user");
        return;
      }
      toast.success(`${deleteTarget.name} removed`);
      setDeleteTarget(null);
      loadUsers();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      <header className="mb-5">
        <Link href="/settings" className="text-emerald-600 hover:text-emerald-700 text-sm">
          ← Settings
        </Link>
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
            <p className="text-sm text-gray-500">{users.length} users</p>
          </div>
          <button
            onClick={openCreate}
            className="px-4 py-2 bg-emerald-500 text-white font-medium rounded-xl text-sm
                       hover:bg-emerald-600 active:scale-95 transition-all"
          >
            + Add User
          </button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500 py-10">No users found</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="p-4 bg-white border border-gray-200 rounded-xl flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-700 font-bold text-lg">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900">{user.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? ROLE_COLORS.STAFF}`}>
                    {user.role}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">{user.email}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setDeleteTarget(user)}
                    className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">
              {editingUser ? "Edit User" : "Add User"}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Full name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="email@restaurant.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                PIN {editingUser && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={form.pin}
                onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
                placeholder={editingUser ? "New PIN (optional)" : "4-6 digit PIN"}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as FormData["role"] }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={closeModal}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving…" : editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Delete User?</h2>
            <p className="text-gray-600">
              Are you sure you want to remove <strong>{deleteTarget.name}</strong>? They will no longer be able to log in.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 border-2 border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
