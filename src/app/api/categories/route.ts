import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "cashier") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Cashiers do not have access to category management." },
        { status: 403 }
      );
    }

    const categories = await db.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, categories });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Admin (owner) and Stock Manager (stock_handler) can Add categories
    if (!user || (user.role !== "owner" && user.role !== "stock_handler")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin or Stock Manager access required." },
        { status: 403 }
      );
    }

    const { name } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Category name is required." }, { status: 400 });
    }

    const existing = await db.category.findUnique({ where: { name: name.trim() } });
    if (existing) {
      return NextResponse.json({ success: false, message: "Category already exists." }, { status: 400 });
    }

    const category = await db.category.create({
      data: { name: name.trim() },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Category Added",
        details: `${user.role === "owner" ? "Admin" : "Stock Manager"} created category: '${category.name}'`,
      },
    });

    return NextResponse.json({ success: true, category });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Admin (owner) and Stock Manager (stock_handler) can Edit categories
    if (!user || (user.role !== "owner" && user.role !== "stock_handler")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin or Stock Manager access required." },
        { status: 403 }
      );
    }

    const { id, name } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ success: false, message: "Category ID and new name are required." }, { status: 400 });
    }

    const existing = await db.category.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Category not found." }, { status: 404 });
    }

    // Check duplicate name
    const duplicate = await db.category.findFirst({
      where: { name: name.trim(), NOT: { id: parseInt(id, 10) } },
    });
    if (duplicate) {
      return NextResponse.json({ success: false, message: "Another category with this name already exists." }, { status: 400 });
    }

    const updated = await db.category.update({
      where: { id: parseInt(id, 10) },
      data: { name: name.trim() },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Category Updated",
        details: `${user.role === "owner" ? "Admin" : "Stock Manager"} updated category #${updated.id} to '${updated.name}'`,
      },
    });

    return NextResponse.json({ success: true, category: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Only Admin (owner) can delete categories
    if (!user || user.role !== "owner") {
      return NextResponse.json({ success: false, message: "Forbidden: Only Admin can delete categories." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Category ID is required." }, { status: 400 });
    }

    const categoryId = parseInt(id, 10);
    const existing = await db.category.findUnique({
      where: { id: categoryId },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Category not found." }, { status: 404 });
    }

    // Unlink products first if any exist
    if (existing._count.products > 0) {
      await db.product.updateMany({
        where: { categoryId },
        data: { categoryId: null },
      });
    }

    await db.category.delete({ where: { id: categoryId } });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Category Deleted",
        details: `Admin deleted category '${existing.name}' (unlinked ${existing._count.products} products)`,
      },
    });

    return NextResponse.json({ success: true, message: "Category deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to delete category" }, { status: 500 });
  }
}
