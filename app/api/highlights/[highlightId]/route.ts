import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Highlight from "@/models/Highlight";
import Story from "@/models/Story";
import mongoose from "mongoose";

export async function PATCH(request: Request, { params }: { params: Promise<{ highlightId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { highlightId } = await params; const body = await request.json();
  if (!mongoose.Types.ObjectId.isValid(highlightId)) return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
  await dbConnect();
  const highlight = await Highlight.findOne({ _id: highlightId, user: (session.user as any).id });
  if (!highlight) return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 50) return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    highlight.name = body.name.trim();
  }
  if (body.storyIds !== undefined) {
    if (!Array.isArray(body.storyIds) || body.storyIds.some((id: unknown) => typeof id !== "string" || !mongoose.Types.ObjectId.isValid(id))) return NextResponse.json({ error: "Invalid story ids" }, { status: 400 });
    const stories = await Story.find({ _id: { $in: body.storyIds }, user: (session.user as any).id }).select("_id");
    highlight.stories = stories.map((s) => s._id);
  }
  if (body.coverUrl !== undefined) highlight.coverUrl = body.coverUrl;
  await highlight.save();
  return NextResponse.json(await highlight.populate("stories"));
}
export async function DELETE(_request: Request, { params }: { params: Promise<{ highlightId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { highlightId } = await params;
  if (!mongoose.Types.ObjectId.isValid(highlightId)) return NextResponse.json({ error: "Highlight not found" }, { status: 404 });
  await dbConnect();
  const result = await Highlight.deleteOne({ _id: highlightId, user: (session.user as any).id });
  return result.deletedCount ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Highlight not found" }, { status: 404 });
}
