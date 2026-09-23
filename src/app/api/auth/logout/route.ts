import { NextResponse } from "next/server";
import { COOKIE_NAME, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST() {
  const user = await getCurrentUser();
  if (user) {
    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "User Logout",
        details: `User ${user.username} logged out.`,
      },
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

