// app/api/logins/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/app/lib/mongoose";
import LogModel from "@/app/models/LogLogin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/lib/auth";

export async function GET(req: Request) {
  await connectDB();
  
  const session = await getServerSession(authOptions);

  if (!session || !["admin", "superadmin"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);

  const email = searchParams.get("email");
  const provider = searchParams.get("provider");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let filters: any = {};

  if (email) filters.email = { $regex: email, $options: "i" };
  if (provider) filters.provider = provider;
  if (from || to) {
    filters.timestamp = {};
    if (from) filters.timestamp.$gte = new Date(from);
    if (to) filters.timestamp.$lte = new Date(to);
  }

  const logs = await LogModel.find(filters).sort({ timestamp: -1 });

  return NextResponse.json(logs);
}
