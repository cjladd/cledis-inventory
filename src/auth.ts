import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { PIN_MIN_LENGTH, PIN_MAX_LENGTH } from "@/lib/pin";

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MINUTES = 15;

// Comparing against this when the email is unknown keeps the response time of a
// bad email indistinguishable from a bad PIN, so the form cannot be used to
// enumerate which addresses are real.
const DUMMY_HASH = "$2a$10$R97wy4P.uHoi8cWqbz8G8.eYKsVyuTQvmU7aKBIDKz.Z2sokBECV6";

const LoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().min(PIN_MIN_LENGTH).max(PIN_MAX_LENGTH),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id:         true,
            name:       true,
            email:      true,
            role:       true,
            pin:        true,
            locationId: true,
            isActive:   true,
            failedLoginAttempts: true,
            lockedUntil: true,
          },
        });

        if (!user || !user.isActive) {
          await bcrypt.compare(parsed.data.pin, DUMMY_HASH);
          return null;
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        const pinMatch = await bcrypt.compare(parsed.data.pin, user.pin);

        if (!pinMatch) {
          const attempts = user.failedLoginAttempts + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginAttempts: attempts,
              lockedUntil:
                attempts >= MAX_FAILED_ATTEMPTS
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
                  : null,
            },
          });
          return null;
        }

        if (user.failedLoginAttempts > 0 || user.lockedUntil) {
          await prisma.user.update({
            where: { id: user.id },
            data:  { failedLoginAttempts: 0, lockedUntil: null },
          });
        }

        return {
          id:         user.id,
          name:       user.name,
          email:      user.email,
          role:       user.role,
          locationId: user.locationId,
        };
      },
    }),
  ],
});
