import mongoose, { Document, Model, Schema } from "mongoose";

export type ReportTargetType = "user" | "post" | "comment" | "story" | "message";

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  targetType: ReportTargetType;
  targetId: mongoose.Types.ObjectId;
  reason: string;
  details?: string;
  status: "open" | "reviewed" | "resolved" | "dismissed";
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: {
      type: String,
      enum: ["user", "post", "comment", "story", "message"],
      required: true,
    },
    targetId: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, required: true, maxlength: 100 },
    details: { type: String, maxlength: 1000 },
    status: {
      type: String,
      enum: ["open", "reviewed", "resolved", "dismissed"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true }
);

ReportSchema.index({ reporter: 1, targetType: 1, targetId: 1 });

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;
