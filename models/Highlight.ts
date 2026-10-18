import mongoose, { Document, Model, Schema } from "mongoose";

export interface IHighlight extends Document {
  user: mongoose.Types.ObjectId;
  name: string;
  coverUrl?: string;
  stories: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const HighlightSchema = new Schema<IHighlight>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 50 },
  coverUrl: { type: String, trim: true },
  stories: [{ type: Schema.Types.ObjectId, ref: "Story" }],
}, { timestamps: true });
HighlightSchema.index({ user: 1, createdAt: -1 });
const Highlight: Model<IHighlight> = mongoose.models.Highlight || mongoose.model<IHighlight>("Highlight", HighlightSchema);
export default Highlight;

