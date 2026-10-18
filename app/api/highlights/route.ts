import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Highlight from "@/models/Highlight";
import Story from "@/models/Story";
import mongoose from "mongoose";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId") || (session.user as any).id;
  await dbConnect();
  const highlights = await Highlight.find({ user: targetUserId })
    .sort({ createdAt: -1 })
    .populate("stories");
  return NextResponse.json(highlights);
}
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, coverUrl, storyIds = [] } = await request.json();
  if (typeof name !== "string" || !name.trim() || name.trim().length > 50 || !Array.isArray(storyIds) ||
      storyIds.some((id: unknown) => typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id))) {
    return NextResponse.json({ error: "Invalid highlight" }, { status: 400 });
  }
  await dbConnect();
  const stories = await Story.find({ _id: { $in: storyIds }, user: (session.user as any).id }).select("_id");
  const highlight = await Highlight.create({ user: (session.user as any).id, name: name.trim(), coverUrl, stories: stories.map((s) => s._id) });
  return NextResponse.json(await highlight.populate("stories"), { status: 201 });
}
