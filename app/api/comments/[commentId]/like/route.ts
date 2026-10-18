import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Comment from "@/models/Comment";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

export async function POST(_request: Request, { params }: { params: Promise<{ commentId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { commentId } = await params;
  if (!mongoose.Types.ObjectId.isValid(commentId)) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  const userId = (session.user as any).id;
  await dbConnect();
  const comment = await Comment.findById(commentId);
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  const liked = comment.likes.some((id) => id.toString() === userId);
  if (liked) {
    comment.likes = comment.likes.filter((id) => id.toString() !== userId);
    await Notification.deleteOne({ recipient: comment.user, sender: userId, type: "like", comment: comment._id });
  } else {
    if (!liked) comment.likes.push(new mongoose.Types.ObjectId(userId));
    if (comment.user.toString() !== userId) {
      await Notification.findOneAndUpdate(
        { recipient: comment.user, sender: userId, type: "like", comment: comment._id },
        { $set: { read: false } }, { upsert: true, setDefaultsOnInsert: true }
      );
    }
  }
  await comment.save();
  return NextResponse.json({ liked: !liked, likes: comment.likes.length });
}
