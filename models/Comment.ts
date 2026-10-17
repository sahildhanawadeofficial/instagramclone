import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  post: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  text: string;
  parentId?: mongoose.Types.ObjectId | null;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: "Post", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: { type: String, required: true, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

CommentSchema.index({ post: 1, createdAt: -1 });
CommentSchema.index({ post: 1, parentId: 1, createdAt: 1 });

const Comment: Model<IComment> =
  mongoose.models.Comment || mongoose.model<IComment>("Comment", CommentSchema);

export default Comment;
