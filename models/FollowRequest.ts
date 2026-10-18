import mongoose, { Document, Model, Schema } from "mongoose";

export type FollowRequestStatus = "pending" | "accepted" | "rejected";

export interface IFollowRequest extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: FollowRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

const FollowRequestSchema = new Schema<IFollowRequest>(
  {
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
      required: true,
    },
  },
  { timestamps: true }
);

FollowRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
FollowRequestSchema.index({ recipient: 1, status: 1, createdAt: -1 });

const FollowRequest: Model<IFollowRequest> =
  mongoose.models.FollowRequest ||
  mongoose.model<IFollowRequest>("FollowRequest", FollowRequestSchema);

export default FollowRequest;
