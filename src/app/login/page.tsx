"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const ACCOUNTS = [
  { label: "Manager",   email: "admin@restaurant.com", hint: "PIN: 1234" },
  { label: "Line Cook", email: "staff@restaurant.com", hint: "PIN: 0000" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email,   setEmail]   = useState(ACCOUNTS[0].email);
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    pinRef.current?.focus();
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) {
      triggerError("PIN must be at least 4 digits");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        pin,
        redirect: false,
      });

      if (result?.error) {
        triggerError("Invalid email or PIN");
        return;
      }

      router.replace("/");
    } catch {
      triggerError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const triggerError = (msg: string) => {
    setError(msg);
    setPin("");
    setShake(true);
    setTimeout(() => setShake(false), 600);
    pinRef.current?.focus();
  };

  const handlePinKey = (digit: string) => {
    if (pin.length < 8) setPin((p) => p + digit);
  };

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-emerald-100 flex flex-col items-center justify-center px-4">
      {/* Branding */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Kitchen-Up</h1>
        <p className="text-gray-500 mt-1">Inventory Management</p>
      </div>

      {/* Card */}
      <div className={`w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 ${shake ? "animate-shake" : ""}`}>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Account selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Who are you?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPin(""); setError(""); }}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    email === acc.email
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className={`font-medium text-sm ${email === acc.email ? "text-emerald-700" : "text-gray-800"}`}>
                    {acc.label}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{acc.hint}</p>
                </button>
              ))}
            </div>
          </div>

          {/* PIN display */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter PIN
            </label>
            <div className="flex justify-center gap-3 mb-3">
              {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
                <div
                  key={i}
                  className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all ${
                    i < pin.length
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  {i < pin.length ? "●" : ""}
                </div>
              ))}
            </div>
            {/* Hidden input for accessibility / keyboard users */}
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 8))}
              className="sr-only"
              aria-label="PIN"
              autoComplete="current-password"
            />
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9","","0","⌫"].map((key) => (
              <button
                key={key || "empty"}
                type="button"
                onClick={() => {
                  if (key === "⌫") handlePinDelete();
                  else if (key) handlePinKey(key);
                }}
                disabled={!key}
                className={`h-14 rounded-xl text-xl font-semibold transition-all active:scale-95 ${
                  key === "⌫"
                    ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    : key
                    ? "bg-gray-100 text-gray-900 hover:bg-emerald-50 hover:text-emerald-700"
                    : "invisible"
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-sm text-red-600 font-medium">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-4 bg-emerald-500 text-white font-semibold rounded-xl
                       hover:bg-emerald-600 active:scale-95 transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-gray-400">Kitchen-Up Inventory v0.1</p>
    </div>
  );
}
