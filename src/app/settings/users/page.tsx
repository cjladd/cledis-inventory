"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

type User = {
  id:        string;
  name:      string;
  email:     string;
  role:      "ADMIN" | "MANAGER" | "STAFF";
  createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN:   "bg-purple-100 text-purple-700",
  MANAGER: "bg-blue-100 text-blue-700",
  STAFF:   "bg-gray-100 text-gray-700",
};

export default function UsersPage() {
  const [users,   setUsers]   = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.json())
      .then((data) => setUsers(data.users ?? []))
      .catch(() => toast.error("Failed to load users"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="px-4 pt-6 pb-4">
      <header className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/settings" className="text-emerald-600 hover:text-emerald-700">
            ← Settings
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Team Members</h1>
        <p className="text-sm text-gray-500">{users.length} users</p>
      </header>

      {/* Info banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-100 rounded-xl">
        <p className="text-sm text-blue-700">
          User management is read-only in demo mode. Full CRUD will be available after Toast integration.
        </p>
      </div>

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
              {/* Avatar */}
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
            </div>
          ))}
        </div>
      )}

      {/* Demo PIN reminder */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">Demo Login PINs</p>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Kitchen Manager (admin@restaurant.com): <strong>1234</strong></p>
          <p className="text-xs text-gray-500">Line Cook (staff@restaurant.com): <strong>0000</strong></p>
        </div>
      </div>
    </div>
  );
}
