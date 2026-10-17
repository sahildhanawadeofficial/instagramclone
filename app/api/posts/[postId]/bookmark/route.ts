import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import Post from "@/models/Post";
import mongoose, { Types } from "mongoose";

export async function POST(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;
  await dbConnect();

  const post = await Post.findById(postId).select("_id");
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const me = await User.findById(userId);
  if (!me) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const postObjectId = new Types.ObjectId(postId);
  const bookmarks = me.bookmarks as any;
  const alreadyBookmarked = bookmarks.some((id: any) => id.toString() === postId);

  if (alreadyBookmarked) {
    bookmarks.pull(postObjectId);
  } else {
    bookmarks.addToSet(postObjectId);
  }

  await me.save();
  return NextResponse.json({ bookmarked: !alreadyBookmarked });
}
