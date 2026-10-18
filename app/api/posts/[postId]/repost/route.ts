import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
export async function POST(_request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions); if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { postId } = await params; if (!mongoose.Types.ObjectId.isValid(postId)) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const userId = (session.user as any).id; await dbConnect(); const post = await Post.findById(postId);
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const reposted = post.reposts.some((id) => id.toString() === userId);
  if (reposted) post.reposts = post.reposts.filter((id) => id.toString() !== userId);
  else post.reposts.push(new mongoose.Types.ObjectId(userId));
  await post.save();
  if (!reposted && post.user.toString() !== userId) await Notification.create({ recipient: post.user, sender: userId, type: "repost", post: post._id });
  return NextResponse.json({ reposted: !reposted, reposts: post.reposts.length });
}
