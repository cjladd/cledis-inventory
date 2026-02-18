/**
 * Client-side auth helpers (localStorage-based for demo).
 *
 * In production this would be replaced by NextAuth session management.
 */

export interface SessionUser {
  id:    string;
  name:  string;
  email: string;
  role:  "ADMIN" | "MANAGER" | "STAFF";
}

const USER_KEY = "kui_user";

export function getUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setUser(user: SessionUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_KEY);
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}
