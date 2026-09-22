"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PIN_MIN_LENGTH, PIN_MAX_LENGTH } from "@/lib/pin";

/**
 * Seeded demo accounts, with their PINs printed on screen. Gated behind an env
 * flag so they can never reach a real deployment — set
 * NEXT_PUBLIC_SHOW_DEMO_LOGINS=true locally or for a demo build.
 */
const SHOW_DEMO_ACCOUNTS = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS === "true";

const ACCOUNTS = [
  { label: "Manager",   email: "manager.elmhill@cledis.com", hint: "PIN: 1234" },
  { label: "Line Cook", email: "staff.elmhill@cledis.com",   hint: "PIN: 0000" },
];

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LoginPage() {
  const router = useRouter();
  const [email,   setEmail]   = useState(SHOW_DEMO_ACCOUNTS ? ACCOUNTS[0].email : "");
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
    if (!email.trim()) {
      triggerError("Enter your email");
      return;
    }
    if (pin.length < PIN_MIN_LENGTH) {
      triggerError(`PIN must be at least ${PIN_MIN_LENGTH} digits`);
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
        triggerError("That email and PIN do not match");
        return;
      }

      router.replace("/");
    } catch {
      triggerError("No connection. Try again.");
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
    if (pin.length < PIN_MAX_LENGTH) setPin((p) => p + digit);
  };

  const handlePinDelete = () => setPin((p) => p.slice(0, -1));

  return (
    <div className="min-h-screen bg-ground flex flex-col justify-center px-6 py-10">
      <div className="w-full max-w-sm mx-auto">
        <div className="mb-8">
          <h1 className="text-[34px] font-extrabold leading-none tracking-tight text-ink">
            Kitchen-Up
          </h1>
          <p className="mt-2 text-[15px] text-ink-2">Prep, waste and stock for Cledis</p>
        </div>

        <form onSubmit={handleSubmit} className={shake ? "animate-shake" : ""}>
          <div className="mb-5">
            <label
              htmlFor="login-email"
              className="block mb-2 text-[13px] font-semibold text-ink-2"
            >
              Who are you?
            </label>

            {!SHOW_DEMO_ACCOUNTS ? (
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@cledis.com"
                autoComplete="username"
                className="w-full px-4 py-3.5 rounded-control bg-surface border border-rule
                           text-[15px] text-ink placeholder:text-ink-3
                           focus:outline-none focus:border-ink transition-colors"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPin(""); setError(""); }}
                    className={`p-3 rounded-control text-left transition-colors
                                ${
                                  email === acc.email
                                    ? "bg-ink text-white"
                                    : "bg-surface border border-rule text-ink active:bg-surface-sunk"
                                }`}
                  >
                    <p className="font-bold text-[15px] leading-tight">{acc.label}</p>
                    <p
                      className={`tnum mt-0.5 text-[12px] ${
                        email === acc.email ? "text-white/60" : "text-ink-3"
                      }`}
                    >
                      {acc.hint}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filled bars rather than dots: easier to count at a glance. */}
          <div className="mb-5">
            <div className="flex gap-2" aria-hidden="true">
              {Array.from({ length: Math.max(PIN_MIN_LENGTH, pin.length) }).map((_, i) => (
                <div
                  key={i}
                  className={`h-12 flex-1 rounded-control transition-colors
                              ${i < pin.length ? "bg-ink" : "bg-surface border border-rule"}`}
                />
              ))}
            </div>

            {/* Real input, kept offscreen so hardware keyboards still work. */}
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH))}
              className="sr-only"
              aria-label="PIN"
              autoComplete="current-password"
            />
          </div>

          {/* The keypad is the interface here, so it gets the room. */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((key, i) => {
              if (!key) return <div key={`gap-${i}`} />;

              const isDelete = key === "del";
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => (isDelete ? handlePinDelete() : handlePinKey(key))}
                  aria-label={isDelete ? "Delete" : key}
                  className={`tnum h-16 rounded-control text-2xl font-bold
                              transition-colors touch-manipulation
                              ${
                                isDelete
                                  ? "bg-transparent text-ink-2 active:bg-surface-sunk"
                                  : "bg-surface border border-rule text-ink active:bg-surface-sunk"
                              }`}
                >
                  {isDelete ? (
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                    </svg>
                  ) : (
                    key
                  )}
                </button>
              );
            })}
          </div>

          {error && (
            <p role="alert" className="mt-4 text-[15px] font-semibold text-flame">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || pin.length < PIN_MIN_LENGTH}
            className="w-full mt-5 py-4 rounded-control bg-amber text-white font-bold text-[17px]
                       disabled:opacity-40 disabled:cursor-not-allowed
                       active:bg-amber/90 transition-colors"
          >
            {loading ? "Signing in" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
