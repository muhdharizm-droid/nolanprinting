import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const logs = await db.activityLog.findMany({
      include: {
        user: { select: { id: true, username: true, fullName: true, role: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch logs" }, { status: 500 });
  }
}

