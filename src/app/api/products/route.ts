import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("category");
    const status = searchParams.get("status") || "active";
    const lowStock = searchParams.get("low_stock") === "true";

    // Build filter query
    const where: any = {};

    if (status !== "all") {
      where.status = status as "active" | "archived";
    }

    if (categoryId && categoryId !== "all") {
      where.categoryId = parseInt(categoryId, 10);
    }

    if (search.trim()) {
      where.OR = [
        { name: { contains: search } },
        { barcode: { contains: search } },
      ];
    }

    const products = await db.product.findMany({
      where,
      include: {
        category: true,
        supplier: true,
        _count: {
          select: { saleItems: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const filtered = lowStock
      ? products.filter((p) => !p.isService && p.stock <= p.threshold)
      : products;

    return NextResponse.json({ success: true, products: filtered });
  } catch (error) {
    console.error("Fetch products error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const data = await req.json();
    const { barcode, name, price, costPrice, stock, threshold, categoryId, supplierId, isService } = data;

    if (!name || price === undefined) {
      return NextResponse.json({ success: false, message: "Product name and price are required" }, { status: 400 });
    }

    if (barcode) {
      const existing = await db.product.findUnique({ where: { barcode } });
      if (existing) {
        return NextResponse.json({ success: false, message: `Barcode/SKU '${barcode}' is already in use.` }, { status: 400 });
      }
    }

    const product = await db.product.create({
      data: {
        barcode: barcode || null,
        name,
        price: parseFloat(price),
        costPrice: parseFloat(costPrice || 0),
        stock: parseInt(stock || 0, 10),
        threshold: parseInt(threshold || 10, 10),
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        supplierId: supplierId ? parseInt(supplierId, 10) : null,
        isService: !!isService,
        status: "active",
      },
    });

    if (product.stock > 0 && !product.isService) {
      await db.stockIntake.create({
        data: {
          productId: product.id,
          quantity: product.stock,
          userId: user.id,
        },
      });
    }

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Product Created",
        details: `Created product '${product.name}' (SKU: ${product.barcode || "None"})`,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error: any) {
    console.error("Create product error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to create product" }, { status: 500 });
  }
}

