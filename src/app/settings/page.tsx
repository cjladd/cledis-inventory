"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { useSession, signOut } from "next-auth/react";
import PageHeader from "@/components/PageHeader";

type LocationSettings = {
  id:                 string;
  name:               string;
  toastClientId:      string | null;
  toastLocationId:    string | null;
  writeBackEnabled:   boolean;
  alertWindowMinutes: number;
  isConfigured:       boolean;
  hasClientSecret:    boolean;
};

const MANAGEMENT_LINKS = [
  { href: "/settings/items",   title: "Inventory items", detail: "What the kitchen tracks, and its par levels" },
  { href: "/settings/recipes", title: "Recipes",         detail: "What each menu item uses up" },
  { href: "/settings/users",   title: "Team",            detail: "Who can log in, and what they can do" },
];

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
      .catch(() => toast.error("Could not load settings"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
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
        toast.error(err.error ?? "Could not save settings");
      }
    } catch {
      toast.error("No connection. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.replace("/login");
  };

  return (
    <div>
      <PageHeader title="Setup" detail={settings?.name} />

      {/* Who is signed in */}
      {session?.user && (
        <section className="flex items-center gap-3 px-4 py-4 bg-surface border-b border-rule">
          <div className="w-11 h-11 flex-shrink-0 rounded-full bg-ink flex items-center justify-center">
            <span className="text-white font-bold text-lg">
              {session.user.name?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-[15px] text-ink truncate">{session.user.name}</p>
            <p className="text-[13px] text-ink-3 truncate">
              {session.user.role.toLowerCase()}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-control bg-surface-sunk text-ink
                       font-semibold text-[13px] active:bg-rule transition-colors"
          >
            Sign out
          </button>
        </section>
      )}

      {/* Management */}
      <section className="mt-6">
        <h2 className="px-4 pb-2 text-[13px] font-bold text-ink-2">Manage</h2>
        <div className="rule-list border-y border-rule">
          {MANAGEMENT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-3 px-4 py-4 bg-surface
                         active:bg-surface-sunk transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] text-ink">{link.title}</p>
                <p className="mt-0.5 text-[13px] text-ink-3">{link.detail}</p>
              </div>
              <svg className="w-5 h-5 flex-shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </section>

      {/* Alerts */}
      <section className="mt-6">
        <h2 className="px-4 pb-2 text-[13px] font-bold text-ink-2">Alerts</h2>
        <div className="px-4 py-4 bg-surface border-y border-rule">
          <label htmlFor="alert-window" className="block font-semibold text-[15px] text-ink">
            Warn me this far ahead
          </label>
          <p className="mt-0.5 mb-3 text-[13px] text-ink-3">
            Flag an item when it is forecast to run out within this many minutes.
          </p>
          <input
            id="alert-window"
            type="number"
            value={alertWindow}
            onChange={(e) => setAlertWindow(parseInt(e.target.value) || 90)}
            min={15}
            max={480}
            className="tnum w-full px-4 py-3 rounded-control bg-ground border border-rule
                       text-[15px] text-ink focus:outline-none focus:border-ink transition-colors"
          />
        </div>
      </section>

      {/* Toast */}
      <section className="mt-6">
        <h2 className="px-4 pb-2 text-[13px] font-bold text-ink-2">Toast POS</h2>

        <div className="bg-surface border-y border-rule">
          <div
            className={`spine ${settings?.isConfigured ? "text-amber" : "text-transparent"}
                        px-4 py-4 border-b border-rule`}
          >
            <p className="font-semibold text-[15px] text-ink">
              {loading
                ? "Checking"
                : settings?.isConfigured
                ? "Connected to Toast"
                : "Not connected"}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-3">
              {settings?.isConfigured
                ? `Sales sync from location ${settings.toastLocationId}`
                : "Sales figures are simulated until credentials are added."}
            </p>
          </div>

          <div className="px-4 py-4 space-y-4">
            <div>
              <label htmlFor="toast-client" className="block mb-1.5 text-[13px] font-semibold text-ink-2">
                Client ID
              </label>
              <input
                id="toast-client"
                type="text"
                value={toastClientId}
                onChange={(e) => setToastClientId(e.target.value)}
                placeholder="From the Toast developer portal"
                className="w-full px-4 py-3 rounded-control bg-ground border border-rule
                           text-[15px] text-ink placeholder:text-ink-3
                           focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            <div>
              <label htmlFor="toast-secret" className="block mb-1.5 text-[13px] font-semibold text-ink-2">
                Client secret
              </label>
              <input
                id="toast-secret"
                type="password"
                value={toastClientSecret}
                onChange={(e) => setToastClientSecret(e.target.value)}
                placeholder={settings?.hasClientSecret ? "Saved — enter a new one to replace" : "Not set"}
                autoComplete="off"
                className="w-full px-4 py-3 rounded-control bg-ground border border-rule
                           text-[15px] text-ink placeholder:text-ink-3
                           focus:outline-none focus:border-ink transition-colors"
              />
              <p className="mt-1.5 text-[13px] text-ink-3">
                The secret is never sent back to this screen once saved.
              </p>
            </div>

            <div>
              <label htmlFor="toast-location" className="block mb-1.5 text-[13px] font-semibold text-ink-2">
                Location ID
              </label>
              <input
                id="toast-location"
                type="text"
                value={toastLocationId}
                onChange={(e) => setToastLocationId(e.target.value)}
                placeholder="Toast restaurant GUID"
                className="w-full px-4 py-3 rounded-control bg-ground border border-rule
                           text-[15px] text-ink placeholder:text-ink-3
                           focus:outline-none focus:border-ink transition-colors"
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-1">
              <div className="min-w-0">
                <p className="font-semibold text-[15px] text-ink">Write counts back to Toast</p>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  Push our stock figures to the POS.
                </p>
              </div>
              <button
                onClick={() => setWriteBackEnabled(!writeBackEnabled)}
                role="switch"
                aria-checked={writeBackEnabled}
                aria-label="Write counts back to Toast"
                className={`relative w-12 h-7 flex-shrink-0 rounded-full transition-colors
                            ${writeBackEnabled ? "bg-amber" : "bg-rule-strong"}`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow
                              transition-transform
                              ${writeBackEnabled ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 py-6">
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="w-full py-4 rounded-control bg-ink text-white font-bold text-[17px]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     active:bg-ink/90 transition-colors"
        >
          {saving ? "Saving" : "Save settings"}
        </button>
      </div>
    </div>
  );
}
