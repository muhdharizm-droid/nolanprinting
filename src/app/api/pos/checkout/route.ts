import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    if (user.role === "stock_handler") {
      return NextResponse.json({ success: false, message: "Stock handlers do not have POS access." }, { status: 403 });
    }

    const body = await req.json();
    const { items, discountAmount = 0, taxRate = 6, paymentMethod = "Cash", cashReceived } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, message: "Cart is empty." }, { status: 400 });
    }

    // Execute atomic transaction
    const result = await db.$transaction(async (tx) => {
      let subtotalCalc = 0;
      const itemsToProcess: Array<{
        productId: number;
        quantity: number;
        priceAtSale: number;
        costAtSale: number;
        details?: string | null;
        isService: boolean;
      }> = [];

      for (const item of items) {
        const qty = Math.max(1, parseInt(item.quantity, 10));

        if (item.isService) {
          const unitPrice = parseFloat(item.price);
          subtotalCalc += unitPrice * qty;

          itemsToProcess.push({
            productId: parseInt(item.serviceProductId || item.id, 10),
            quantity: qty,
            priceAtSale: unitPrice,
            costAtSale: 0.0,
            details: item.details || "Custom Print Service",
            isService: true,
          });
        } else {
          const product = await tx.product.findUnique({
            where: { id: parseInt(item.id, 10) },
          });

          if (!product) {
            throw new Error(`Product #${item.id} not found.`);
          }

          if (product.isRawMaterial) {
            throw new Error(
              `'${product.name}' is an internal printing supply/raw material and cannot be sold in transactions.`
            );
          }

          if (product.stock < qty) {
            throw new Error(
              `Insufficient stock for '${product.name}'. Available: ${product.stock} units.`
            );
          }

          const unitPrice = Number(product.price);
          const costPrice = Number(product.costPrice);
          subtotalCalc += unitPrice * qty;

          // Decrement stock
          await tx.product.update({
            where: { id: product.id },
            data: { stock: { decrement: qty } },
          });

          itemsToProcess.push({
            productId: product.id,
            quantity: qty,
            priceAtSale: unitPrice,
            costAtSale: costPrice,
            details: null,
            isService: false,
          });
        }
      }

      const discount = Math.max(0, parseFloat(discountAmount || 0));
      const rate = Math.max(0, parseFloat(taxRate || 0));
      const subtotalAfterDiscount = Math.max(0, subtotalCalc - discount);
      const taxAmount = Math.round(subtotalAfterDiscount * (rate / 100) * 100) / 100;
      const total = Math.round((subtotalAfterDiscount + taxAmount) * 100) / 100;

      // Create Sale record
      const sale = await tx.sale.create({
        data: {
          userId: user.id,
          subtotal: subtotalCalc,
          discountAmount: discount,
          taxAmount,
          total,
          paymentMethod,
          status: "completed",
          items: {
            create: itemsToProcess.map((it) => ({
              productId: it.productId,
              quantity: it.quantity,
              priceAtSale: it.priceAtSale,
              costAtSale: it.costAtSale,
              details: it.details,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: {
            select: { id: true, username: true, fullName: true },
          },
        },
      });

      // Log sale activity
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "Sale Completed",
          details: `Completed sale #${sale.id} for RM ${total.toFixed(2)} (${paymentMethod})`,
        },
      });

      return {
        sale,
        subtotal: subtotalCalc,
        discount,
        taxAmount,
        total,
        cashReceived: parseFloat(cashReceived || total),
        change: Math.max(0, parseFloat(cashReceived || total) - total),
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("POS Checkout error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Checkout failed" },
      { status: 400 }
    );
  }
}

