import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Story from "@/models/Story";
import mongoose from "next-auth/adapters"; // wait, mongoose from mongoose

export async function POST(
  request: Request,
  { params }: { params: Promise<{ storyId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { storyId } = await params;
  if (!storyId || storyId.startsWith("demo-")) {
    return NextResponse.json({ success: true });
  }

  const currentUserId = (session.user as any).id;
  const { default: mongooseLib } = await import("mongoose");
  if (!mongooseLib.Types.ObjectId.isValid(storyId)) {
    return NextResponse.json({ success: true });
  }

  await dbConnect();
  await Story.findByIdAndUpdate(storyId, {
    $addToSet: { viewers: currentUserId },
  });

  return NextResponse.json({ success: true });
}
