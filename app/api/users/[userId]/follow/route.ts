import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import { Types } from "mongoose";
import Notification from "@/models/Notification";

export async function POST(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { userId } = await params;
  const meId = (session.user as any).id;
  if (userId === meId) {
    return NextResponse.json({ error: "You cannot follow yourself" }, { status: 400 });
  }
  await dbConnect();
  const target = await User.findById(userId);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  const me = await User.findById(meId);
  if (!me) {
    return NextResponse.json({ error: "Current user not found" }, { status: 404 });
  }
  const targetObjectId = new Types.ObjectId(userId);
  const meObjectId = new Types.ObjectId(meId);
  const alreadyFollowing = me.following.some((id) => id.toString() === userId);
  const meFollowing = me.following as any;
  const targetFollowers = target.followers as any;
  if (alreadyFollowing) {
    meFollowing.pull(targetObjectId);
    targetFollowers.pull(meObjectId);
  } else {
    meFollowing.addToSet(targetObjectId);
    targetFollowers.addToSet(meObjectId);
    // Create notification for followed user
    await Notification.create({
      recipient: userId,
      sender: meId,
      type: "follow",
    });
  }
  await me.save();
  await target.save();
  return NextResponse.json({ following: !alreadyFollowing });
}
