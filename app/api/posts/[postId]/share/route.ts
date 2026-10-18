import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Post from "@/models/Post";
import Share from "@/models/Share";
import Notification from "@/models/Notification";
import User from "@/models/User";
import mongoose from "mongoose";

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { postId } = await params; const body = await request.json();
  if (!mongoose.Types.ObjectId.isValid(postId) || !Array.isArray(body.recipientIds) || body.recipientIds.some((id: unknown) => typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id))) return NextResponse.json({ error: "Invalid share request" }, { status: 400 });
  const userId = (session.user as any).id; await dbConnect();
  const post = await Post.findById(postId); if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const recipients = await User.find({ _id: { $in: body.recipientIds } }).select("_id");
  const share = await Share.create({ user: userId, post: post._id, recipients: recipients.map((u) => u._id), caption: typeof body.caption === "string" ? body.caption.trim() : undefined });
  post.shares += 1; await post.save();
  await Promise.all(recipients.filter((u) => u._id.toString() !== userId).map((u) => Notification.create({ recipient: u._id, sender: userId, type: "share", post: post._id, share: share._id })));
  return NextResponse.json({ shareId: share._id, shares: post.shares }, { status: 201 });
}
