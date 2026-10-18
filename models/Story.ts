import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStory extends Document {
  user: mongoose.Types.ObjectId;
  mediaKey?: string;
  mediaUrl?: string;
  mediaType: "image" | "video";
  caption?: string;
  viewers: mongoose.Types.ObjectId[];
  replies: { user: mongoose.Types.ObjectId; text: string; createdAt: Date }[];
  reactions: { user: mongoose.Types.ObjectId; emoji: string; createdAt: Date }[];
  taggedUsers: mongoose.Types.ObjectId[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const StorySchema = new Schema<IStory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    mediaKey: { type: String, maxlength: 512 },
    // Legacy stories retain mediaUrl; new stories always persist mediaKey.
    mediaUrl: { type: String },
    mediaType: { type: String, enum: ["image", "video"], default: "image" },
    caption: { type: String, default: "", trim: true },
    viewers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    replies: [{
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      text: { type: String, required: true, maxlength: 1000 },
      createdAt: { type: Date, default: Date.now },
    }],
    reactions: [{
      user: { type: Schema.Types.ObjectId, ref: "User", required: true },
      emoji: { type: String, required: true, maxlength: 32 },
      createdAt: { type: Date, default: Date.now },
    }],
    taggedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
      index: { expires: "1s" }, // MongoDB TTL auto-cleanup after 24h
    },
  },
  { timestamps: true }
);

StorySchema.index({ createdAt: -1 });

const Story: Model<IStory> =
  mongoose.models.Story || mongoose.model<IStory>("Story", StorySchema);

export default Story;
