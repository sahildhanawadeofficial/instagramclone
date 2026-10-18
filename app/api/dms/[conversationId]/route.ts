import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import { DMConversation, DMMessage } from "@/models/DM";
import mongoose from "mongoose";
import Notification from "@/models/Notification";

export async function GET(_request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationId } = await params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;
  await dbConnect();
  const conversation = await DMConversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  const messages = await DMMessage.find({ conversationId })
    .sort({ createdAt: 1 })
    .populate("sender", "name username image");

  // Mark as read
  await DMMessage.updateMany(
    { conversationId, readBy: { $ne: userId } },
    { $push: { readBy: userId } }
  );
  return NextResponse.json(messages);
}

export async function POST(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { conversationId } = await params;
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const userId = (session.user as any).id;
  const { text } = await request.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  await dbConnect();
  const conversation = await DMConversation.findOne({
    _id: conversationId,
    participants: userId,
  });
  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }
  if (conversation.requestStatus === "pending" && conversation.requestedBy?.toString() !== userId) {
    return NextResponse.json({ error: "Accept the message request before replying" }, { status: 403 });
  }
  const message = await DMMessage.create({
    conversationId,
    sender: userId,
    text: text.trim(),
  });
  conversation.lastMessage = message._id;
  await conversation.save();
  const recipientId = conversation.participants.find((id) => id.toString() !== userId);
  if (recipientId) {
    await Notification.findOneAndUpdate(
      { recipient: recipientId, sender: userId, type: "message", conversation: conversation._id },
      { recipient: recipientId, sender: userId, type: "message", conversation: conversation._id, read: false },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }
  await message.populate("sender", "name username image");
  return NextResponse.json(message, { status: 201 });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ conversationId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { conversationId } = await params; const { action } = await request.json();
  if (!mongoose.Types.ObjectId.isValid(conversationId) || !["accept", "decline"].includes(action)) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const userId = (session.user as any).id; await dbConnect();
  const conversation = await DMConversation.findOne({ _id: conversationId, participants: userId });
  if (!conversation) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (conversation.requestedBy?.toString() === userId) return NextResponse.json({ error: "Only the recipient can decide this request" }, { status: 403 });
  conversation.requestStatus = action === "accept" ? "accepted" : "declined";
  await conversation.save();
  await Notification.updateMany({ recipient: userId, conversation: conversation._id, type: "message_request" }, { read: true });
  return NextResponse.json({ requestStatus: conversation.requestStatus });
}
