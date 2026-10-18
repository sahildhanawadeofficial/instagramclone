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
  const { emoji } = await request.json();
  if (!mongoose.Types.ObjectId.isValid(storyId) || typeof emoji !== "string" || !emoji.trim() || emoji.length > 32) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }
  const userId = (session.user as any).id;
  await dbConnect();
  const story = await Story.findOne({ _id: storyId, expiresAt: { $gt: new Date() } });
  if (!story) return NextResponse.json({ error: "Story not found" }, { status: 404 });
  const old = story.reactions.find((r) => r.user.toString() === userId);
  if (old) old.emoji = emoji.trim(); else story.reactions.push({ user: new mongoose.Types.ObjectId(userId), emoji: emoji.trim(), createdAt: new Date() });
  await story.save();
  if (story.user.toString() !== userId) await Notification.create({ recipient: story.user, sender: userId, type: "story_reaction", story: story._id });
  return NextResponse.json({ reacted: true, emoji: emoji.trim() });
}
