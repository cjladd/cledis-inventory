"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [toastClientId, setToastClientId] = useState("");
  const [toastClientSecret, setToastClientSecret] = useState("");
  const [toastLocationId, setToastLocationId] = useState("");
  const [writeBackEnabled, setWriteBackEnabled] = useState(false);
  const [alertWindow, setAlertWindow] = useState(90);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setSaving(true);
    try {
      // TODO: Implement settings save API
      // For now, just show success
      setMessage("Settings saved (placeholder)");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Error saving settings:", error);
      setMessage("Error saving settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-6 pb-4">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Configure your inventory system</p>
      </header>

      {/* Success/Error Message */}
      {message && (
        <div
          className={`mb-4 p-3 rounded-xl ${
            message.includes("Error")
              ? "bg-red-100 text-red-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Toast Integration */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Toast Integration
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Enter your Toast API credentials to enable POS integration. Get these
          from your Toast developer portal.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID
            </label>
            <input
              type="text"
              value={toastClientId}
              onChange={(e) => setToastClientId(e.target.value)}
              placeholder="Enter Toast Client ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client Secret
            </label>
            <input
              type="password"
              value={toastClientSecret}
              onChange={(e) => setToastClientSecret(e.target.value)}
              placeholder="Enter Toast Client Secret"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location ID
            </label>
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
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Inventory Settings
        </h2>

        <div className="space-y-4">
          {/* Write-back Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900">
                Enable Toast Write-back
              </p>
              <p className="text-sm text-gray-500">
                Sync inventory counts back to Toast POS
              </p>
            </div>
            <button
              onClick={() => setWriteBackEnabled(!writeBackEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                writeBackEnabled ? "bg-emerald-500" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
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
              Get alerted when stock is predicted to run out within this time
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

      {/* Quick Links */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Management
        </h2>
        <div className="space-y-2">
          <a
            href="/settings/items"
            className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <p className="font-medium text-gray-900">Manage Inventory Items</p>
            <p className="text-sm text-gray-500">Add, edit, or remove items</p>
          </a>
          <a
            href="/settings/recipes"
            className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <p className="font-medium text-gray-900">Manage Recipes</p>
            <p className="text-sm text-gray-500">
              Link menu items to inventory
            </p>
          </a>
          <a
            href="/settings/users"
            className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <p className="font-medium text-gray-900">Manage Users</p>
            <p className="text-sm text-gray-500">Add staff and set roles</p>
          </a>
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl touch-feedback disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Settings"}
      </button>
    </div>
  );
}
