"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useSession, signOut } from "next-auth/react";

type LocationSettings = {
  id:                 string;
  name:               string;
  toastClientId:      string | null;
  toastLocationId:    string | null;
  writeBackEnabled:   boolean;
  alertWindowMinutes: number;
  isConfigured:       boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();

  const [settings,         setSettings]         = useState<LocationSettings | null>(null);
  const [toastClientId,    setToastClientId]    = useState("");
  const [toastClientSecret, setToastClientSecret] = useState("");
  const [toastLocationId,  setToastLocationId]  = useState("");
  const [writeBackEnabled, setWriteBackEnabled] = useState(false);
  const [alertWindow,      setAlertWindow]      = useState(90);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data: LocationSettings) => {
        setSettings(data);
        setToastClientId(data.toastClientId ?? "");
        setToastLocationId(data.toastLocationId ?? "");
        setWriteBackEnabled(data.writeBackEnabled);
        setAlertWindow(data.alertWindowMinutes);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          writeBackEnabled,
          alertWindowMinutes: alertWindow,
          ...(toastClientId    && { toastClientId }),
          ...(toastClientSecret && { toastClientSecret }),
          ...(toastLocationId  && { toastLocationId }),
        }),
      });

      if (res.ok) {
        toast.success("Settings saved");
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

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure your inventory system</p>
      </header>

      {/* User card */}
      {session?.user && (
        <section className="mb-6 p-4 bg-gray-50 rounded-xl flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{session.user.name}</p>
            <p className="text-sm text-gray-500">{session.user.email} · {(session.user as { role?: string }).role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg text-sm hover:bg-red-200 transition-colors"
          >
            Log out
          </button>
        </section>
      )}

      {/* Toast Integration Status */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Toast Integration</h2>

        {loading ? (
          <div className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ) : (
          <div className={`p-4 rounded-xl border-2 mb-4 ${
            settings?.isConfigured
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                settings?.isConfigured ? "bg-emerald-500" : "bg-amber-500"
              }`} />
              <div>
                <p className={`font-semibold text-sm ${
                  settings?.isConfigured ? "text-emerald-800" : "text-amber-800"
                }`}>
                  {settings?.isConfigured ? "Connected to Toast POS" : "Demo Mode — Using Simulated Data"}
                </p>
                <p className={`text-xs mt-0.5 ${
                  settings?.isConfigured ? "text-emerald-600" : "text-amber-600"
                }`}>
                  {settings?.isConfigured
                    ? `Location ID: ${settings.toastLocationId}`
                    : "Add credentials below to enable live POS sync"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
            <input
              type="text"
              value={toastClientId}
              onChange={(e) => setToastClientId(e.target.value)}
              placeholder="Enter Toast Client ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Secret</label>
            <input
              type="password"
              value={toastClientSecret}
              onChange={(e) => setToastClientSecret(e.target.value)}
              placeholder="Enter Toast Client Secret"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location ID</label>
            <input
              type="text"
              value={toastLocationId}
              onChange={(e) => setToastLocationId(e.target.value)}
              placeholder="Enter Toast Location ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Inventory Settings */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Inventory Settings</h2>
        <div className="space-y-4">
          {/* Write-back Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">Enable Toast Write-back</p>
              <p className="text-sm text-gray-500">Sync inventory counts back to Toast POS</p>
            </div>
            <button
              onClick={() => setWriteBackEnabled(!writeBackEnabled)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                writeBackEnabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
              role="switch"
              aria-checked={writeBackEnabled}
            >
              <div
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  writeBackEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Alert Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Window (minutes)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Get alerted when stock is predicted to run out within this window
            </p>
            <input
              type="number"
              value={alertWindow}
              onChange={(e) => setAlertWindow(parseInt(e.target.value) || 90)}
              min={15}
              max={480}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </section>

      {/* Management Links */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Management</h2>
        <div className="space-y-2">
          <Link
            href="/settings/items"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">Manage Inventory Items</p>
              <p className="text-sm text-gray-500">Add, edit, or remove items</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/settings/recipes"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">Manage Recipes</p>
              <p className="text-sm text-gray-500">Link menu items to inventory</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
          <Link
            href="/settings/users"
            className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <div>
              <p className="font-medium text-gray-900">Manage Users</p>
              <p className="text-sm text-gray-500">View staff and roles</p>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving || loading}
        className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl
                   hover:bg-emerald-600 active:scale-95 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Save Settings"}
      </button>
    </div>
  );
}
