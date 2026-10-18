import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import FollowRequest from "@/models/FollowRequest";
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
  const [me, target] = await Promise.all([User.findById(meId), User.findById(userId)]);
  if (!me || !target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const blocked = me.blockedUsers.some((id) => id.toString() === userId);
  if (blocked) {
    (me.blockedUsers as any).pull(target._id);
  } else {
    (me.blockedUsers as any).addToSet(target._id);
    (me.following as any).pull(target._id);
    (target.followers as any).pull(me._id);
    (target.following as any).pull(me._id);
    (me.followers as any).pull(target._id);
    await FollowRequest.deleteMany({
      $or: [
        { requester: me._id, recipient: target._id },
        { requester: target._id, recipient: me._id },
      ],
    });
  }
  await Promise.all([me.save(), target.save()]);
  return NextResponse.json({ blocked: !blocked });
}
