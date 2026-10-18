import mongoose, { Document, Model, Schema } from "mongoose";

export interface IShare extends Document {
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  recipients: mongoose.Types.ObjectId[];
  caption?: string;
  createdAt: Date;
}
const ShareSchema = new Schema<IShare>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
  recipients: [{ type: Schema.Types.ObjectId, ref: "User" }],
  caption: { type: String, trim: true, maxlength: 1000 },
}, { timestamps: true });
ShareSchema.index({ user: 1, createdAt: -1 });
const Share: Model<IShare> = mongoose.models.Share || mongoose.model<IShare>("Share", ShareSchema);
export default Share;

