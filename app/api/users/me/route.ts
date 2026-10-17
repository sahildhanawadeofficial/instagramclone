import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  const { name, username, bio, image } = await request.json();
  await dbConnect();
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (username !== undefined) updateData.username = username;
  if (bio !== undefined) updateData.bio = bio;
  if (image !== undefined) updateData.image = image;
  const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select(
    "name username image bio followers following"
  );
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  await dbConnect();
  const user = await User.findById(userId).select("name username image bio followers following bookmarks");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(user);
}
