import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
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

  const post = await Post.findById(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const userObjectId = new Types.ObjectId(userId);
  const liked = post.likes.some((id) => id.toString() === userId);
  const likesArr = post.likes as any;

  if (liked) {
    likesArr.pull(userObjectId);
    // Remove notification on unlike
    if (post.user.toString() !== userId) {
      await Notification.findOneAndDelete({
        recipient: post.user,
        sender: userObjectId,
        type: "like",
        post: post._id,
      });
    }
  } else {
    likesArr.addToSet(userObjectId);
    // Create/update notification for post owner (not self)
    if (post.user.toString() !== userId) {
      await Notification.findOneAndUpdate(
        { recipient: post.user, sender: userObjectId, type: "like", post: post._id },
        { recipient: post.user, sender: userObjectId, type: "like", post: post._id, read: false, createdAt: new Date() },
        { upsert: true }
      );
    }
  }

  await post.save();
  return NextResponse.json({ liked: !liked, likes: post.likes.length });
}
