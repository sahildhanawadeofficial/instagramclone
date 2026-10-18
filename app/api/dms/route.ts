import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import { DMConversation, DMMessage } from "@/models/DM";
import User from "@/models/User";
import mongoose from "mongoose";
import Notification from "@/models/Notification";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id;
  await dbConnect();
  const conversations = await DMConversation.find({ participants: userId })
    .sort({ updatedAt: -1 })
    .populate("participants", "name username image")
    .populate("lastMessage");
  return NextResponse.json(conversations);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { recipientId, text } = await request.json();
  const senderId = (session.user as any).id;
  if (!recipientId) {
    return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
  }
  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    return NextResponse.json({ error: "Invalid recipientId" }, { status: 400 });
  }
  if (recipientId === senderId) {
    return NextResponse.json({ error: "You cannot message yourself" }, { status: 400 });
  }
  await dbConnect();
  const recipient = await User.findById(recipientId).select("_id");
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }
  // Find existing conversation between these two users
  let conversation = await DMConversation.findOne({
    participants: { $all: [senderId, recipientId] },
  });
  if (!conversation) {
    conversation = await DMConversation.create({
      participants: [senderId, recipientId],
      requestStatus: "pending",
      requestedBy: senderId,
    });
  }

  if (text && text.trim()) {
    const message = await DMMessage.create({
      conversationId: conversation._id,
      sender: senderId,
      text: text.trim(),
    });
    conversation.lastMessage = message._id;
    await conversation.save();
    if (recipientId !== senderId) {
      await Notification.findOneAndUpdate(
        { recipient: recipientId, sender: senderId, type: conversation.requestStatus === "pending" ? "message_request" : "message", conversation: conversation._id },
        { recipient: recipientId, sender: senderId, type: conversation.requestStatus === "pending" ? "message_request" : "message", conversation: conversation._id, read: false },
        { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  await conversation.populate("participants", "name username image");
  if (conversation.lastMessage) {
    await conversation.populate("lastMessage");
  }
  return NextResponse.json(conversation, { status: 201 });
}
