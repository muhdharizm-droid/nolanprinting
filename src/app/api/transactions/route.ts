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

    const { saleId, voidReason } = await req.json();
    const id = parseInt(saleId, 10);

    if (isNaN(id)) {
      return NextResponse.json({ success: false, message: "Invalid sale ID" }, { status: 400 });
    }

    const cleanReason =
      typeof voidReason === "string" && voidReason.trim().length > 0
        ? voidReason.trim()
        : "No reason specified";

    const result = await db.$transaction(async (tx: any) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (!sale) throw new Error("Sale record not found");
      if (sale.status === "voided") throw new Error("Transaction is already voided.");

      // 1. Restore stock for retail inventory items
      for (const item of sale.items) {
        if (!item.product.isService) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // 2. Restore auto-deducted raw materials (BOM / recipe) from stock_usages
      const rawUsages = await tx.stockUsage.findMany({
        where: { saleId: id },
        include: { product: true },
      });

      for (const usage of rawUsages) {
        const prod = usage.product;
        if (prod) {
          const packCapacity = prod.packSize || 1;
          let curStock = prod.stock;
          let curLoose = prod.looseStock + usage.quantity;

          if (packCapacity > 1 && curLoose >= packCapacity) {
            const packsToAdd = Math.floor(curLoose / packCapacity);
            curStock += packsToAdd;
            curLoose = curLoose % packCapacity;
          }

          await tx.product.update({
            where: { id: prod.id },
            data: {
              stock: curStock,
              looseStock: curLoose,
            },
          });
        }
      }

      // Clean up stockUsages associated with this voided sale
      if (rawUsages.length > 0) {
        await tx.stockUsage.deleteMany({
          where: { saleId: id },
        });
      }

      // Mark sale as voided with reason
      const updatedSale = await tx.sale.update({
        where: { id },
        data: {
          status: "voided",
          voidReason: cleanReason,
        },
      });

      // Log activity with void reason and restoration summary
      const rawCountMsg = rawUsages.length > 0 ? ` & ${rawUsages.length} raw material BOM items` : "";
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "Sale Voided",
          details: `Voided transaction #${id} (Reason: ${cleanReason}) and restored retail stock${rawCountMsg}.`,
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

