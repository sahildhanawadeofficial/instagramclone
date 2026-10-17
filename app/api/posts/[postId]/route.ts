import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import { getMediaUrl, deleteS3Object } from "@/lib/s3";
import mongoose from "mongoose";

export async function GET(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await dbConnect();
  const post = await Post.findById(postId).populate("user", "name username image");
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const postObj = post.toObject() as any;
  if (postObj.mediaKey) {
    if (postObj.mediaType === "video") {
      postObj.videoUrl = getMediaUrl(postObj.mediaKey);
    } else {
      postObj.imageUrl = getMediaUrl(postObj.mediaKey);
    }
  } else {
    if (postObj.imageUrl) postObj.imageUrl = getMediaUrl(postObj.imageUrl);
    if (postObj.videoUrl) postObj.videoUrl = getMediaUrl(postObj.videoUrl);
  }

  if (postObj.user && typeof postObj.user === "object" && postObj.user.image) {
    postObj.user.image = getMediaUrl(postObj.user.image);
  }

  return NextResponse.json(postObj);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { postId } = await params;
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;
  const { caption, location } = await request.json();
  await dbConnect();
  const post = await Post.findById(postId);
  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (post.user.toString() !== userId) {
    return NextResponse.json({ error: "Not authorized to edit this post" }, { status: 403 });
  }

  if (caption !== undefined) post.caption = caption;
  if (location !== undefined) post.location = location;
  await post.save();
  await post.populate("user", "name username image");
  return NextResponse.json(post);
}

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
