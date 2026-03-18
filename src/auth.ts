import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const LoginSchema = z.object({
  email: z.string().email(),
  pin: z.string().min(4).max(8),
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
          },
        });

        if (!user) return null;

        const pinMatch = await bcrypt.compare(parsed.data.pin, user.pin);
        if (!pinMatch) return null;

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
