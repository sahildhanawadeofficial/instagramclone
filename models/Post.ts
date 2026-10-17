import mongoose, { Schema, Document, Model } from "mongoose";

export type MediaType = "image" | "video";

export interface IPost extends Document {
  user: mongoose.Types.ObjectId;
  caption: string;
  location?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: MediaType;
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const PostSchema = new Schema<IPost>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  caption: { type: String, default: "", trim: true },
  location: { type: String, trim: true },
  imageUrl: { type: String },
  videoUrl: { type: String },
  mediaType: { type: String, enum: ["image", "video"], default: "image" },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

PostSchema.index({ createdAt: -1 });
PostSchema.index({ user: 1, createdAt: -1 });

const Post: Model<IPost> =
  mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);

export default Post;
