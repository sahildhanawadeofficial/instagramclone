import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import { deleteS3Object } from "@/lib/s3";
import mongoose from "mongoose";

export async function DELETE(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
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
  if (post.user.toString() !== userId) {
    return NextResponse.json({ error: "Not authorized to delete this post" }, { status: 403 });
  }

  // Delete media from S3 if key or URL exists
  if (post.mediaKey) {
    await deleteS3Object(post.mediaKey);
  } else if (post.imageUrl) {
    await deleteS3Object(post.imageUrl);
  } else if (post.videoUrl) {
    await deleteS3Object(post.videoUrl);
  }

  await Post.findByIdAndDelete(postId);
  await Comment.deleteMany({ post: postId });
  await Notification.deleteMany({ post: postId });

  return NextResponse.json({ success: true });
}
