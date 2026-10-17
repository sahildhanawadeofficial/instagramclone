import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Notification from "@/models/Notification";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recipientId = (session.user as any).id;
  await dbConnect();
  const notifications = await Notification.find({ recipient: recipientId })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate("sender", "name username image")
    .populate("post", "imageUrl videoUrl mediaType caption")
    .populate("comment", "text");
  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const recipientId = (session.user as any).id;
  const { notificationId, markAll } = await request.json();
  await dbConnect();
  if (markAll) {
    await Notification.updateMany({ recipient: recipientId, read: false }, { read: true });
    return NextResponse.json({ success: true });
  }
  if (!notificationId) {
    return NextResponse.json({ error: "notificationId is required" }, { status: 400 });
  }
  await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: recipientId },
    { read: true }
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { notificationId } = await request.json();
  const recipientId = (session.user as any).id;
  await dbConnect();
  await Notification.findOneAndDelete({ _id: notificationId, recipient: recipientId });
  return NextResponse.json({ success: true });
}
