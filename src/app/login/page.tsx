"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PIN_MIN_LENGTH, PIN_MAX_LENGTH } from "@/lib/pin";

/**
 * Seeded demo accounts, with their PINs printed on screen.
 *
 * NEXT_PUBLIC_SHOW_DEMO_LOGINS decides which roles are offered:
 *
 *   unset   no shortcuts at all; the form asks for an email. Real deployments.
 *   "staff" the line cook only. The right setting for a link anyone can open:
 *           every destructive route is ADMIN/MANAGER-only, so a visitor
 *           holding a STAFF session can log prep, waste and counts but cannot
 *           touch items, users, PINs or settings.
 *   "all"   every role, for a private walkthrough.
 *
 * Anything else truthy is read as "staff". Publishing a PIN is the kind of
 * mistake that should fail towards the least access, not the most, and a
 * stale "true" left over from an earlier deploy lands here.
 */
const DEMO_MODE = process.env.NEXT_PUBLIC_SHOW_DEMO_LOGINS;

const ALL_ACCOUNTS = [
  { label: "Admin",     email: "admin.elmhill@cledis.com",   hint: "9999", staff: false },
  { label: "Manager",   email: "manager.elmhill@cledis.com", hint: "1234", staff: false },
  { label: "Line cook", email: "staff.elmhill@cledis.com",   hint: "0000", staff: true  },
];

const ACCOUNTS = !DEMO_MODE
  ? []
  : DEMO_MODE === "all"
  ? ALL_ACCOUNTS
  : ALL_ACCOUNTS.filter((a) => a.staff);

const SHOW_DEMO_ACCOUNTS = ACCOUNTS.length > 0;

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export default function LoginPage() {
  const router = useRouter();
  const [email,   setEmail]   = useState(ACCOUNTS[0]?.email ?? "");
  const [pin,     setPin]     = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [shake,   setShake]   = useState(false);
  // Shortcuts are a convenience, not the only way in. Someone who knows real
  // credentials can always type them, which is what lets one deployment serve
  // both a public demo and whoever actually administers it.
  const [typingEmail, setTypingEmail] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);

  const showShortcuts = SHOW_DEMO_ACCOUNTS && !typingEmail;

  // Focus the keypad on mount, but only when a shortcut has already filled in
  // an account. This used to run on every email change, which stole focus after
  // the first keystroke and made the email field impossible to type into - the
  // field every real deployment relies on, since shortcuts are demo-only.
  useEffect(() => {
    if (SHOW_DEMO_ACCOUNTS) pinRef.current?.focus();
  }, []);

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

            {!showShortcuts ? (
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
              <div className={ACCOUNTS.length === 1 ? "grid grid-cols-1 gap-2" : "grid grid-cols-3 gap-2"}>
                {ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPin("");
                      setError("");
                      pinRef.current?.focus();
                    }}
                    className={`p-3 rounded-control text-left transition-colors
                                ${
                                  email === acc.email
                                    ? "bg-ink text-white"
                                    : "bg-surface border border-rule text-ink active:bg-surface-sunk"
                                }`}
                  >
                    <p className="font-bold text-[14px] leading-tight">{acc.label}</p>
                    <p
                      className={`tnum mt-0.5 text-[12px] ${
                        email === acc.email ? "text-white/60" : "text-ink-3"
                      }`}
                    >
                      PIN {acc.hint}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {SHOW_DEMO_ACCOUNTS && (
              <button
                type="button"
                onClick={() => {
                  setTypingEmail((wasTyping) => {
                    setEmail(wasTyping ? ACCOUNTS[0]?.email ?? "" : "");
                    return !wasTyping;
                  });
                  setPin("");
                  setError("");
                }}
                className="mt-2 text-[13px] font-semibold text-ink-2 hover:text-ink
                           transition-colors"
              >
                {typingEmail ? "Use a demo account" : "Sign in with another account"}
              </button>
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
