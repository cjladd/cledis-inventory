import "next-auth";

/** Mirrors the Prisma Role enum; kept as a union so session checks are exhaustive. */
type UserRole = "ADMIN" | "MANAGER" | "STAFF";

declare module "next-auth" {
  interface User {
    role:       UserRole;
    locationId: string;
  }

  interface Session {
    user: {
      id:         string;
      name:       string;
      email:      string;
      role:       UserRole;
      locationId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id:         string;
    role:       UserRole;
    locationId: string;
  }
}
