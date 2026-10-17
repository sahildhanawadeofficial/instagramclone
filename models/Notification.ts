import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType = "like" | "follow" | "comment";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  sender: mongoose.Types.ObjectId;
  type: NotificationType;
  post?: mongoose.Types.ObjectId;
  comment?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["like", "follow", "comment"], required: true },
  post: { type: Schema.Types.ObjectId, ref: "Post" },
  comment: { type: Schema.Types.ObjectId, ref: "Comment" },
  read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

NotificationSchema.index({ recipient: 1, createdAt: -1 });
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
