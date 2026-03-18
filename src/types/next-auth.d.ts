import "next-auth";

declare module "next-auth" {
  interface User {
    role:       string;
    locationId: string;
  }

  interface Session {
    user: {
      id:         string;
      name:       string;
      email:      string;
      role:       "ADMIN" | "MANAGER" | "STAFF";
      locationId: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role:       string;
    locationId: string;
  }
}
