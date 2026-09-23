import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const id = parseInt(params.id, 10);
    const data = await req.json();

    // Check if this is an intake or status change
    if (data.action === "intake") {
      const addedQty = parseInt(data.quantity, 10);
      if (isNaN(addedQty) || addedQty <= 0) {
        return NextResponse.json({ success: false, message: "Invalid intake quantity" }, { status: 400 });
      }

      const updated = await db.product.update({
        where: { id },
        data: {
          stock: { increment: addedQty },
        },
      });

      await db.stockIntake.create({
        data: {
          productId: id,
          quantity: addedQty,
          userId: user.id,
        },
      });

      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Stock Added",
          details: `Added ${addedQty} units to '${updated.name}'. Total stock: ${updated.stock}`,
        },
      });

      return NextResponse.json({ success: true, product: updated });
    }

    if (data.action === "restore") {
      const updated = await db.product.update({
        where: { id },
        data: { status: "active" },
      });

      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Product Restored",
          details: `Restored product '${updated.name}' from archive.`,
        },
      });

      return NextResponse.json({ success: true, product: updated });
    }

    // Standard edit
    const { barcode, name, price, costPrice, stock, threshold, categoryId, supplierId, isService } = data;

    if (barcode) {
      const existing = await db.product.findFirst({
        where: { barcode, NOT: { id } },
      });
      if (existing) {
        return NextResponse.json({ success: false, message: `Barcode/SKU '${barcode}' is already in use by another product.` }, { status: 400 });
      }
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        barcode: barcode || null,
        name,
        price: parseFloat(price),
        costPrice: parseFloat(costPrice || 0),
        stock: parseInt(stock, 10),
        threshold: parseInt(threshold || 10, 10),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        isService: !!isService,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Product Updated",
        details: `Updated product details for '${updated.name}'`,
      },
    });

    return NextResponse.json({ success: true, product: updated });
  } catch (error: any) {
    console.error("Update product error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to update product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const id = parseInt(params.id, 10);
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get("permanent") === "true";

    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    if (permanent) {
      if (user.role !== "owner") {
        return NextResponse.json({ success: false, message: "Only Owner can permanently delete products." }, { status: 403 });
      }
      await db.product.delete({ where: { id } });
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Product Deleted",
          details: `Permanently deleted product ID: ${id} ('${product.name}')`,
        },
      });
      return NextResponse.json({ success: true, message: "Product permanently deleted." });
    } else {
      // Archive
      await db.product.update({
        where: { id },
        data: { status: "archived" },
      });
      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Product Archived",
          details: `Archived product '${product.name}' (ID: ${id})`,
        },
      });
      return NextResponse.json({ success: true, message: "Product archived." });
    }
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to delete product" }, { status: 500 });
  }
}

