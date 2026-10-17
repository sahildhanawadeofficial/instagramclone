import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function POST(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { postId } = await params;
  const userId = (session.user as any).id;
  await dbConnect();
  const post = await Post.findById(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  const liked = post.likes.some((id) => id.toString() === userId);
  const likesArr = post.likes as any;
  if (liked) {
    likesArr.pull(post.likes.find((id) => id.toString() === userId)!);
  } else {
    likesArr.addToSet(userId);
    // Create notification for post owner (not self)
    if (post.user.toString() !== userId) {
      const sender = await User.findById(userId).select("name username image");
      await Notification.create({
        recipient: post.user,
        sender: userId,
        type: "like",
        post: postId,
      });
    }
  }
  await post.save();
  return NextResponse.json({ liked: !liked, likes: post.likes.length });
}
