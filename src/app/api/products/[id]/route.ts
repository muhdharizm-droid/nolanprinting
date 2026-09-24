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
    const { barcode, name, price, costPrice, stock, threshold, categoryId, supplierId, isService, isRawMaterial } = data;

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
        price: parseFloat(price || 0),
        costPrice: parseFloat(costPrice || 0),
        stock: parseInt(stock, 10),
        threshold: parseInt(threshold || 10, 10),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        isService: isRawMaterial ? false : !!isService,
        isRawMaterial: !!isRawMaterial,
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

    const product = await db.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { saleItems: true, stockIntakes: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ success: false, message: "Product not found" }, { status: 404 });
    }

    const salesCount = product._count.saleItems;

    // Direct permanent delete requested from Archived tab
    if (permanent) {
      if (user.role !== "owner") {
        return NextResponse.json({ success: false, message: "Only Store Owner can permanently purge products." }, { status: 403 });
      }

      if (salesCount > 0) {
        return NextResponse.json({
          success: false,
          message: `Cannot permanently purge '${product.name}' because it is linked to ${salesCount} completed customer sales and receipts. It is already safely hidden from active catalog and POS.`,
        }, { status: 400 });
      }

      if (product._count.stockIntakes > 0) {
        await db.stockIntake.deleteMany({ where: { productId: id } });
      }
      await db.product.delete({ where: { id } });

      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Product Purged",
          details: `Permanently purged product ID: ${id} ('${product.name}') with 0 sales.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Product '${product.name}' was permanently purged from the database.`,
      });
    }

    // Standard Direct Delete (from Active or Low Stock catalog)
    if (salesCount === 0) {
      // 1. Product never had sales: Permanently delete row from DB immediately
      if (product._count.stockIntakes > 0) {
        await db.stockIntake.deleteMany({ where: { productId: id } });
      }
      await db.product.delete({ where: { id } });

      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Product Deleted",
          details: `Directly deleted product '${product.name}' (0 sales recorded).`,
        },
      });

      return NextResponse.json({
        success: true,
        deleted: true,
        hasSales: false,
        message: `Product '${product.name}' had no sales history and was permanently deleted.`,
      });
    } else {
      // 2. Product has sales history: Remove from active catalog & POS, release barcode for reuse, protect sales snapshot
      await db.product.update({
        where: { id },
        data: {
          status: "archived",
          barcode: null, // free up barcode so it can be reused immediately
          stock: 0,
        },
      });

      await db.activityLog.create({
        data: {
          userId: user.id,
          action: "Product Removed",
          details: `Removed '${product.name}' from catalog. Preserved ${salesCount} historical sales receipts.`,
        },
      });

      return NextResponse.json({
        success: true,
        deleted: true,
        hasSales: true,
        salesCount,
        message: `Product '${product.name}' was removed from your active catalog and POS. Its ${salesCount} historical sales record(s) and receipts were preserved.`,
      });
    }
  } catch (error: any) {
    console.error("Delete product error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to delete product" }, { status: 500 });
  }
}

