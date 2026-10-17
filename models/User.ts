import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  username: string;
  image?: string;
  bio?: string;
  googleId?: string;
  followers: mongoose.Types.ObjectId[];
  following: mongoose.Types.ObjectId[];
  bookmarks: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  image: { type: String },
  bio: { type: String, maxlength: 160 },
  googleId: { type: String },
  followers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: Schema.Types.ObjectId, ref: "User" }],
  bookmarks: [{ type: Schema.Types.ObjectId, ref: "Post" }],
}, { timestamps: true });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
