import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

const registerSchema = z.object({
  name: z.string().trim().min(1, "Full name is required").max(60),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9._]+$/, "Username can only contain letters, numbers, periods, and underscores")
    .toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Validation failed";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, username, password } = parsed.data;

    await dbConnect();

    // Check if email already taken
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Check if username already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name,
      email,
      username,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        message: "Account created successfully",
        user: {
          id: newUser._id.toString(),
          name: newUser.name,
          email: newUser.email,
          username: newUser.username,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Register error:", error);
    return NextResponse.json({ error: "Something went wrong during registration" }, { status: 500 });
  }
}
