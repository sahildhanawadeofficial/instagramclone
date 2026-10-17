import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";

export async function GET(_request: Request, { params }: { params: Promise<{ username: string }> }) {
  const session = await getServerSession(authOptions);
  const { username } = await params;
  const meId = session ? (session.user as any).id : null;

  await dbConnect();

  const user = await User.findOne({ username: username.toLowerCase().trim() }).select(
    "name username image bio followers following isPrivate createdAt"
  );

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if viewing own profile or following
  const isSelf = meId ? user._id.toString() === meId : false;
  let isFollowing = false;
  if (meId && !isSelf) {
    const me = await User.findById(meId).select("following");
    isFollowing = me?.following.some((id: any) => id.toString() === user._id.toString()) ?? false;
  }

  // If private account and not following and not self, do not return posts
  let posts: any[] = [];
  if (!user.isPrivate || isFollowing || isSelf) {
    posts = await Post.find({ user: user._id }).sort({ createdAt: -1 }).limit(100);
  }

  return NextResponse.json({
    ...user.toObject(),
    posts,
    isFollowing,
    isSelf,
  });
}
