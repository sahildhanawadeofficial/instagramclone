import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Story from "@/models/Story";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export async function POST(request: Request, { params }: { params: Promise<{ storyId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { storyId } = await params;
  const { text } = await request.json();
  if (!mongoose.Types.ObjectId.isValid(storyId) || typeof text !== "string" || !text.trim() || text.trim().length > 1000) {
    return NextResponse.json({ error: "Invalid story or reply" }, { status: 400 });
  }
  const userId = (session.user as any).id;
  await dbConnect();
  const story = await Story.findOne({ _id: storyId, expiresAt: { $gt: new Date() } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  story.replies.push({ user: new mongoose.Types.ObjectId(userId), text: text.trim(), createdAt: new Date() });
  await story.save();
  if (story.user.toString() !== userId) await Notification.create({ recipient: story.user, sender: userId, type: "story_reply", story: story._id });
  return NextResponse.json(story.replies[story.replies.length - 1], { status: 201 });
}
