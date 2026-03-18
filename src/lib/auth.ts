/**
 * Auth helpers.
 *
 * Server-side: use getSession() / requireAuth().
 * Client-side: use useSession() from next-auth/react.
 *
 * The localStorage helpers below are deprecated and kept only for the
 * transition period while AuthGuard is still referenced in some places.
 */

export interface SessionUser {
  id:         string;
  name:       string;
  email:      string;
  role:       "ADMIN" | "MANAGER" | "STAFF";
  locationId: string;
}

// ---------------------------------------------------------------------------
// Deprecated client-side helpers (localStorage-based)
// ---------------------------------------------------------------------------

const USER_KEY = "kui_user";

/** @deprecated Use useSession() from next-auth/react instead */
export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

/** @deprecated Session is managed by NextAuth — no manual setUser needed */
export function setUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** @deprecated Use signOut() from next-auth/react instead */
export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

/** @deprecated Use useSession() from next-auth/react instead */
export function isLoggedIn(): boolean {
  return getUser() !== null;
}
