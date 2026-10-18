import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import mongoose from "mongoose";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { userId } = await params;
  const meId = (session.user as any).id;
  if (!mongoose.Types.ObjectId.isValid(userId) || userId === meId) {
    return NextResponse.json({ error: "Invalid user" }, { status: 400 });
  }
  await dbConnect();
  const me = await User.findById(meId);
  const target = await User.findById(userId).select("_id");
  if (!me || !target) return NextResponse.json({ error: "User not found" }, { status: 404 });
  const muted = me.mutedUsers.some((id) => id.toString() === userId);
  if (muted) (me.mutedUsers as any).pull(target._id);
  else (me.mutedUsers as any).addToSet(target._id);
  await me.save();
  return NextResponse.json({ muted: !muted });
}
