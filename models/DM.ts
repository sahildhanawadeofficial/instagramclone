import mongoose, { Schema, Document, Model } from "mongoose";

export interface IDMMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  text: string;
  imageUrl?: string;
  readBy: mongoose.Types.ObjectId[];
  createdAt: Date;
}

export interface IDMConversation extends Document {
  participants: mongoose.Types.ObjectId[];
  lastMessage?: mongoose.Types.ObjectId;
  updatedAt: Date;
}

const DMMessageSchema = new Schema<IDMMessage>({
  conversationId: { type: Schema.Types.ObjectId, ref: "DMConversation", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true },
  imageUrl: { type: String },
  readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

DMMessageSchema.index({ conversationId: 1, createdAt: -1 });

const DMConversationSchema = new Schema<IDMConversation>({
  participants: [{ type: Schema.Types.ObjectId, ref: "User", required: true }],
  lastMessage: { type: Schema.Types.ObjectId, ref: "DMMessage" },
}, { timestamps: true });

DMConversationSchema.index({ participants: 1 });

export const DMMessage: Model<IDMMessage> =
  mongoose.models.DMMessage || mongoose.model<IDMMessage>("DMMessage", DMMessageSchema);

export const DMConversation: Model<IDMConversation> =
  mongoose.models.DMConversation || mongoose.model<IDMConversation>("DMConversation", DMConversationSchema);
