import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import User from "@/models/User";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
import { getMediaUrl } from "@/lib/s3";

export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await dbConnect();
  const comments = await Comment.find({ post: postId })
    .sort({ createdAt: 1 })
    .populate("user", "name username image");

  const resolved = comments.map((c) => {
    const obj = c.toObject() as any;
    if (obj.user && typeof obj.user === "object" && obj.user.image) {
      obj.user.image = getMediaUrl(obj.user.image);
    }
    return obj;
  });

  return NextResponse.json(resolved);
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;
  const { text, parentId } = await request.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Comment text is required" }, { status: 400 });
  }

  if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
    return NextResponse.json({ error: "Invalid parent comment id" }, { status: 400 });
  }

  await dbConnect();
  const post = await Post.findById(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const user = await User.findById(userId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const comment = await Comment.create({
    post: postId,
    user: user._id,
    text: text.trim(),
    parentId: parentId || null,
  });
  await comment.populate("user", "name username image");

  // Create notification for post owner (not self)
  if (post.user.toString() !== userId) {
    await Notification.create({
      recipient: post.user,
      sender: userId,
      type: "comment",
      post: postId,
      comment: comment._id,
    });
  }

  // If this was a reply to another comment, also notify the comment author
  if (parentId) {
    const parentComment = await Comment.findById(parentId);
    if (parentComment && parentComment.user.toString() !== userId && parentComment.user.toString() !== post.user.toString()) {
      await Notification.create({
        recipient: parentComment.user,
        sender: userId,
        type: "comment",
        post: postId,
        comment: comment._id,
      });
    }
  }

  const commentObj = comment.toObject() as any;
  if (commentObj.user && typeof commentObj.user === "object" && commentObj.user.image) {
    commentObj.user.image = getMediaUrl(commentObj.user.image);
  }

  return NextResponse.json(commentObj, { status: 201 });
}
