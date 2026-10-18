import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Archive from "@/models/Archive";
import Post from "@/models/Post";
import Story from "@/models/Story";
import mongoose from "mongoose";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  return NextResponse.json(await Archive.find({ user: (session.user as any).id }).sort({ createdAt: -1 }).populate("post").populate("story"));
}
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { postId, storyId } = await request.json();
  if ((postId && storyId) || (!postId && !storyId) ||
      (postId && (!mongoose.Types.ObjectId.isValid(postId) || typeof postId !== "string")) ||
      (storyId && (!mongoose.Types.ObjectId.isValid(storyId) || typeof storyId !== "string"))) {
    return NextResponse.json({ error: "Provide a valid postId or storyId" }, { status: 400 });
  }
  const userId = (session.user as any).id; await dbConnect();
  const item = postId ? await Post.findOne({ _id: postId, user: userId }).select("_id") : await Story.findOne({ _id: storyId, user: userId }).select("_id");
  if (!item) return NextResponse.json({ error: "Item not found or not owned by you" }, { status: 404 });
  const archive = await Archive.findOneAndUpdate({ user: userId, ...(postId ? { post: postId } : { story: storyId }) }, { user: userId, ...(postId ? { post: postId } : { story: storyId }) }, { upsert: true, new: true, setDefaultsOnInsert: true });
  return NextResponse.json(archive, { status: 201 });
}
export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { postId, storyId } = await request.json();
  if ((postId && storyId) || (!postId && !storyId) || (postId && !mongoose.Types.ObjectId.isValid(postId)) || (storyId && !mongoose.Types.ObjectId.isValid(storyId))) return NextResponse.json({ error: "Invalid item" }, { status: 400 });
  await dbConnect();
  await Archive.deleteOne({ user: (session.user as any).id, ...(postId ? { post: postId } : { story: storyId }) });
  return NextResponse.json({ success: true });
}
