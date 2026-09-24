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
    if (user.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only Store Owner can access transaction history.", sales: [] },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    const where: any = {};
    if (status !== "all") {
      where.status = status as "completed" | "voided";
    }

    if (search.trim()) {
      const num = parseInt(search, 10);
      if (!isNaN(num)) {
        where.id = num;
      }
    }

    const sales = await db.sale.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true } },
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ success: true, sales });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch transactions" }, { status: 500 });
  }
}

// Void a sale and restore stock
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    if (user.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only Store Owner can void transactions." },
        { status: 403 }
      );
    }

    const { saleId } = await req.json();
    const id = parseInt(saleId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid sale ID" }, { status: 400 });
    }

    const result = await db.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!sale) throw new Error("Sale record not found");
      if (sale.status === "voided") throw new Error("Transaction is already voided.");

      // Restore stock for inventory items
      for (const item of sale.items) {
        if (!item.product.isService) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // Mark sale as voided
      const updatedSale = await tx.sale.update({
        where: { id },
        data: { status: "voided" },
      });

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "Sale Voided",
          details: `Voided transaction #${id} and restored inventory stock.`,
        },
      });

      return updatedSale;
    });

    return NextResponse.json({ success: true, sale: result });
  } catch (error: any) {
    console.error("Void sale error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to void sale" }, { status: 400 });
  }
}

