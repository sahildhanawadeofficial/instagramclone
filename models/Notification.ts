import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "like" | "follow" | "follow_request" | "follow_request_accepted" | "comment" | "mention" | "tag"
  | "message_request" | "message" | "story_reply" | "story_reaction"
  | "share" | "repost";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: NotificationType;
  post?: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  story?: mongoose.Types.ObjectId;
  conversation?: mongoose.Types.ObjectId;
  share?: mongoose.Types.ObjectId;
  followRequest?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["like", "follow", "follow_request", "follow_request_accepted", "comment", "mention", "tag", "message_request", "message", "story_reply", "story_reaction", "share", "repost"],
    required: true,
  },
  post: { type: Schema.Types.ObjectId, ref: "Post" },
  comment: { type: Schema.Types.ObjectId, ref: "Comment" },
  story: { type: Schema.Types.ObjectId, ref: "Story" },
  conversation: { type: Schema.Types.ObjectId, ref: "DMConversation" },
  share: { type: Schema.Types.ObjectId, ref: "Share" },
  followRequest: { type: Schema.Types.ObjectId, ref: "FollowRequest" },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
