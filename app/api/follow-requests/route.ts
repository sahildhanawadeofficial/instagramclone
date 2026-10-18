import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import FollowRequest from "@/models/FollowRequest";
import User from "@/models/User";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await dbConnect();
  const userId = (session.user as any).id;
  const requests = await FollowRequest.find({ recipient: userId, status: "pending" })
    .sort({ createdAt: -1 })
    .populate("requester", "name username image");
  return NextResponse.json(requests);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const { requestId, action } = body;
  if (
    typeof requestId !== "string" ||
    !mongoose.Types.ObjectId.isValid(requestId) ||
    !["accept", "reject"].includes(action)
  ) {
    return NextResponse.json({ error: "Invalid follow request action" }, { status: 400 });
  }

  await dbConnect();
  const recipientId = (session.user as any).id;
  const followRequest = await FollowRequest.findOne({
    _id: requestId,
    recipient: recipientId,
    status: "pending",
  });
  if (!followRequest) {
    return NextResponse.json({ error: "Follow request not found" }, { status: 404 });
  }

  if (action === "reject") {
    followRequest.status = "rejected";
    await followRequest.save();
    await Notification.deleteOne({ followRequest: followRequest._id });
    return NextResponse.json({ status: "rejected" });
  }

  const requester = await User.findById(followRequest.requester);
  const recipient = await User.findById(recipientId);
  if (!requester || !recipient) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  (requester.following as any).addToSet(recipient._id);
  (recipient.followers as any).addToSet(requester._id);
  followRequest.status = "accepted";
  await Promise.all([requester.save(), recipient.save(), followRequest.save()]);
  await Notification.deleteOne({ followRequest: followRequest._id });
  await Notification.create({
    recipient: requester._id,
    sender: recipient._id,
    type: "follow_request_accepted",
  });
  return NextResponse.json({ status: "accepted" });
}
