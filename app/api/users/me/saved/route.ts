import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import "@/models/Post"; // ensure Post model registered for populate

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const user = await User.findById(userId)
    .populate({
      path: "bookmarks",
      populate: {
        path: "user",
        select: "name username image",
      },
    })
    .select("bookmarks");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ posts: user.bookmarks || [] });
}
