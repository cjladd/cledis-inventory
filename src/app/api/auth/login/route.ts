import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const LoginSchema = z.object({
  email: z.string().email(),
  pin:   z.string().min(4).max(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = LoginSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, name: true, email: true, role: true, pin: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or PIN" },
        { status: 401 }
      );
    }

    const pinMatch = await bcrypt.compare(data.pin, user.pin);
    if (!pinMatch) {
      return NextResponse.json(
        { error: "Invalid email or PIN" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
