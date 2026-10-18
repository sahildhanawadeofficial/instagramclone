import mongoose, { Document, Model, Schema } from "mongoose";
export interface IArchive extends Document {
  user: mongoose.Types.ObjectId;
  post?: mongoose.Types.ObjectId;
  story?: mongoose.Types.ObjectId;
  createdAt: Date;
}
const ArchiveSchema = new Schema<IArchive>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  post: { type: Schema.Types.ObjectId, ref: "Post" },
  story: { type: Schema.Types.ObjectId, ref: "Story" },
}, { timestamps: { createdAt: true, updatedAt: false } });
ArchiveSchema.index({ user: 1, post: 1 }, { unique: true, sparse: true });
ArchiveSchema.index({ user: 1, story: 1 }, { unique: true, sparse: true });
const Archive: Model<IArchive> = mongoose.models.Archive || mongoose.model<IArchive>("Archive", ArchiveSchema);
export default Archive;
