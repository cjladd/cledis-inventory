import { NextResponse } from "next/server";
import { auth } from "@/auth";

export interface ApiSession {
  user: {
    id:         string;
    name:       string;
    email:      string;
    role:       "ADMIN" | "MANAGER" | "STAFF";
    locationId: string;
  };
}

/**
 * Extract the session from the current request context.
 * Returns null if not authenticated.
 */
export async function getApiSession(): Promise<ApiSession | null> {
  const session = await auth();
  if (!session?.user) return null;

  const user = session.user as Record<string, unknown>;
  if (!user.id || !user.role || !user.locationId) return null;

  return session as unknown as ApiSession;
}

/**
 * Require authentication. Returns the session or a 401 response.
 */
export async function requireApiAuth(
): Promise<ApiSession | NextResponse> {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

/**
 * Require a specific role. Returns the session or a 403 response.
 */
export async function requireApiRole(
  roles: Array<"ADMIN" | "MANAGER" | "STAFF">,
): Promise<ApiSession | NextResponse> {
  const result = await requireApiAuth();
  if (result instanceof NextResponse) return result;

  if (!roles.includes(result.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return result;
}

/** Type guard: check if the result of requireApiAuth/requireApiRole is a session */
export function isSession(
  result: ApiSession | NextResponse,
): result is ApiSession {
  return !(result instanceof NextResponse);
}
