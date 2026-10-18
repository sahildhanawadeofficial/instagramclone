import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongoose";
import Report from "@/models/Report";
import mongoose from "mongoose";

const targetTypes = ["user", "post", "comment", "story", "message"] as const;

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  if (
    typeof body.targetId !== "string" ||
    !mongoose.Types.ObjectId.isValid(body.targetId) ||
    !targetTypes.includes(body.targetType) ||
    typeof body.reason !== "string" ||
    !body.reason.trim() ||
    body.reason.length > 100 ||
    (body.details !== undefined && (typeof body.details !== "string" || body.details.length > 1000))
  ) {
    return NextResponse.json({ error: "Invalid report" }, { status: 400 });
  }
  await dbConnect();
  const report = await Report.create({
    reporter: (session.user as any).id,
    targetType: body.targetType,
    targetId: body.targetId,
    reason: body.reason.trim(),
    details: body.details?.trim(),
  });
  return NextResponse.json({ id: report._id, status: report.status }, { status: 201 });
}
