import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import User from "@/models/User";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  await dbConnect();
  const currentUser = await User.findById(userId).select("following");
  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const suggestions = await User.find({
    _id: { $ne: userId, $nin: currentUser.following },
  })
    .select("name username image")
    .sort({ createdAt: -1 })
    .limit(5);

  return NextResponse.json(suggestions);
}
