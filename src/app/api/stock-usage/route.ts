import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const where: any = {};
    if (productId) {
      where.productId = parseInt(productId, 10);
    }

    const usages = await db.stockUsage.findMany({
      where,
      take: Math.min(limit, 100),
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            barcode: true,
            packSize: true,
            stock: true,
            looseStock: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            fullName: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, usages });
  } catch (error: any) {
    console.error("Fetch stock usages error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to fetch stock usages" }, { status: 500 });
  }
}

