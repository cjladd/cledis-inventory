import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe NextAuth config. No DB imports here — used by middleware.
 * The full auth config (with Prisma + bcrypt) lives in src/auth.ts.
 */
export const authConfig: NextAuthConfig = {
  providers: [],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      const isPublic =
        pathname === "/login" ||
        pathname.startsWith("/api/auth/") ||
        pathname.startsWith("/_next/") ||
        pathname === "/favicon.ico" ||
        pathname === "/manifest.json";

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
        token.locationId = (user as { locationId?: string }).locationId;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        (session.user as Record<string, unknown>).role = token.role;
        (session.user as Record<string, unknown>).locationId = token.locationId;
      }
      return session;
    },
  },
};
