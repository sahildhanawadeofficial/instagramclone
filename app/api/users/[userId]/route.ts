import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await params;
  const meId = (session.user as any).id;
  await dbConnect();
  const user = await User.findById(userId).select("name username image bio followers following createdAt");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const posts = await Post.find({ user: userId }).sort({ createdAt: -1 }).limit(100);
  const me = await User.findById(meId).select("following");
  const isFollowing = me?.following.some((id: any) => id.toString() === userId) ?? false;
  return NextResponse.json({
    ...user.toObject(),
    posts,
    isFollowing,
  });
}
