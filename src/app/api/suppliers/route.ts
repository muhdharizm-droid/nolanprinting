import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "cashier") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Cashiers do not have access to supplier management." },
        { status: 403 }
      );
    }

    const suppliers = await db.supplier.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, suppliers });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch suppliers" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Admin (owner) and Stock Manager (stock_handler) can Add suppliers
    if (!user || (user.role !== "owner" && user.role !== "stock_handler")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin or Stock Manager access required." },
        { status: 403 }
      );
    }

    const { name, contact, email, address } = await req.json();
    if (!name?.trim()) {
      return NextResponse.json({ success: false, message: "Supplier name is required." }, { status: 400 });
    }

    const supplier = await db.supplier.create({
      data: {
        name: name.trim(),
        contact: contact?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Supplier Added",
        details: `${user.role === "owner" ? "Admin" : "Stock Manager"} added supplier: '${supplier.name}'`,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to create supplier" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // Admin (owner) and Stock Manager (stock_handler) can Edit suppliers
    if (!user || (user.role !== "owner" && user.role !== "stock_handler")) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin or Stock Manager access required." },
        { status: 403 }
      );
    }

    const { id, name, contact, email, address } = await req.json();
    if (!id || !name?.trim()) {
      return NextResponse.json({ success: false, message: "Supplier ID and name are required." }, { status: 400 });
    }

    const existing = await db.supplier.findUnique({ where: { id: parseInt(id, 10) } });
    if (!existing) {
      return NextResponse.json({ success: false, message: "Supplier not found." }, { status: 404 });
    }

    const updated = await db.supplier.update({
      where: { id: parseInt(id, 10) },
      data: {
        name: name.trim(),
        contact: contact !== undefined ? contact?.trim() || null : existing.contact,
        email: email !== undefined ? email?.trim() || null : existing.email,
        address: address !== undefined ? address?.trim() || null : existing.address,
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Supplier Updated",
        details: `${user.role === "owner" ? "Admin" : "Stock Manager"} updated supplier #${updated.id} ('${updated.name}')`,
      },
    });

    return NextResponse.json({ success: true, supplier: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to update supplier" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    // ONLY Admin (owner) can delete suppliers. Stock managers and cashiers are forbidden.
    if (!user || user.role !== "owner") {
      return NextResponse.json(
        { success: false, message: "Forbidden: Only Admin can delete suppliers." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Supplier ID is required." }, { status: 400 });
    }

    const supplierId = parseInt(id, 10);
    const existing = await db.supplier.findUnique({
      where: { id: supplierId },
      include: { _count: { select: { products: true } } },
    });

    if (!existing) {
      return NextResponse.json({ success: false, message: "Supplier not found." }, { status: 404 });
    }

    // Unlink any products currently tied to this supplier
    if (existing._count.products > 0) {
      await db.product.updateMany({
        where: { supplierId },
        data: { supplierId: null },
      });
    }

    await db.supplier.delete({ where: { id: supplierId } });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Supplier Deleted",
        details: `Admin deleted supplier '${existing.name}' (unlinked ${existing._count.products} products)`,
      },
    });

    return NextResponse.json({ success: true, message: "Supplier deleted successfully." });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to delete supplier" }, { status: 500 });
  }
}
