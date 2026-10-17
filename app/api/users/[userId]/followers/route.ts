import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";
import mongoose from "mongoose";
import { getMediaUrl } from "@/lib/s3";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await dbConnect();
  const user = await User.findById(userId)
    .select("followers")
    .populate("followers", "name username image bio followers following");

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const followers = (user.followers || []).map((f: any) => {
    const fObj = typeof f.toObject === "function" ? f.toObject() : { ...f };
    if (fObj.image) fObj.image = getMediaUrl(fObj.image);
    return fObj;
  });

  return NextResponse.json({ followers });
}
