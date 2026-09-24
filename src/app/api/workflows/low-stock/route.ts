import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "cashier") {
      return NextResponse.json({ success: false, message: "Forbidden: Stock Managers and Owner only" }, { status: 403 });
    }

    // 1. Auto-detection scan: Fetch all active products (excluding services)
    const allProducts = await prisma.product.findMany({
      where: {
        status: "active",
        isService: false,
      },
      include: {
        supplier: true,
        category: true,
      },
    });

    const lowStockProducts = allProducts.filter((p) => p.stock <= p.threshold);

    // 2. Sync with RestockWorkflow table
    for (const prod of lowStockProducts) {
      const activeWorkflow = await prisma.restockWorkflow.findFirst({
        where: {
          productId: prod.id,
          status: { in: ["alert_triggered", "po_issued", "in_transit"] },
        },
      });

      // Calculate recommended reorder units
      const targetStock = prod.threshold * 2;
      const deficit = Math.max(1, targetStock - prod.stock);
      const packSize = prod.packSize > 0 ? prod.packSize : 1;
      const suggestedQty = Math.ceil(deficit / packSize) * packSize;

      if (!activeWorkflow) {
        await prisma.restockWorkflow.create({
          data: {
            productId: prod.id,
            supplierId: prod.supplierId,
            currentStock: prod.stock,
            threshold: prod.threshold,
            suggestedQty,
            orderQty: suggestedQty,
            status: "alert_triggered",
          },
        });
      } else {
        // Update current stock snapshot if changed
        if (activeWorkflow.currentStock !== prod.stock) {
          await prisma.restockWorkflow.update({
            where: { id: activeWorkflow.id },
            data: { currentStock: prod.stock },
          });
        }
      }
    }

    // 3. Fetch active workflows
    const activeWorkflows = await prisma.restockWorkflow.findMany({
      where: {
        status: { in: ["alert_triggered", "po_issued", "in_transit"] },
      },
      include: {
        product: {
          include: {
            category: true,
            supplier: true,
          },
        },
        supplier: true,
        createdBy: {
          select: { id: true, fullName: true, username: true },
        },
        resolvedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: [
        { currentStock: "asc" }, // 0 stock items first
        { updatedAt: "desc" },
      ],
    });

    // 4. Fetch recent resolved/completed workflows
    const resolvedWorkflows = await prisma.restockWorkflow.findMany({
      where: {
        status: { in: ["received", "dismissed"] },
      },
      include: {
        product: true,
        supplier: true,
        resolvedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    // 5. Summary metrics
    const triggered = activeWorkflows.filter((w) => w.status === "alert_triggered");
    const poIssued = activeWorkflows.filter((w) => w.status === "po_issued");
    const inTransit = activeWorkflows.filter((w) => w.status === "in_transit");
    const critical = activeWorkflows.filter((w) => w.currentStock <= 0);

    const supplierIds = new Set(
      activeWorkflows.map((w) => w.supplierId).filter(Boolean)
    );

    return NextResponse.json({
      success: true,
      workflows: activeWorkflows,
      resolvedWorkflows,
      summary: {
        totalActive: activeWorkflows.length,
        triggeredCount: triggered.length,
        criticalCount: critical.length,
        poIssuedCount: poIssued.length,
        inTransitCount: inTransit.length,
        suppliersCount: supplierIds.size,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch low-stock workflows:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role === "cashier") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { action, workflowId, workflowIds, poNumber, orderQty, receivedQty, expectedDate, notes, supplierId } = body;

    // ACTION: Single PO Issue
    if (action === "issue_po") {
      if (!workflowId) {
        return NextResponse.json({ success: false, message: "workflowId required" }, { status: 400 });
      }

      const generatedPO = poNumber || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      const updated = await prisma.restockWorkflow.update({
        where: { id: workflowId },
        data: {
          status: "po_issued",
          poNumber: generatedPO,
          orderQty: orderQty ? parseInt(orderQty.toString()) : undefined,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes: notes || null,
          createdById: user.id,
        },
        include: { product: true, supplier: true },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "PO_ISSUED",
          details: `Issued Purchase Order ${generatedPO} for ${updated.product.name} (Qty: ${updated.orderQty || updated.suggestedQty})`,
        },
      });

      return NextResponse.json({ success: true, workflow: updated });
    }

    // ACTION: Batch PO Issue (Group of items from the same supplier)
    if (action === "batch_issue_po") {
      if (!workflowIds || !Array.isArray(workflowIds) || workflowIds.length === 0) {
        return NextResponse.json({ success: false, message: "workflowIds array required" }, { status: 400 });
      }

      const generatedPO = poNumber || `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

      await prisma.restockWorkflow.updateMany({
        where: { id: { in: workflowIds } },
        data: {
          status: "po_issued",
          poNumber: generatedPO,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes: notes || null,
          createdById: user.id,
        },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "BATCH_PO_ISSUED",
          details: `Issued Batch Purchase Order ${generatedPO} covering ${workflowIds.length} items`,
        },
      });

      return NextResponse.json({ success: true, poNumber: generatedPO });
    }

    // ACTION: Mark In Transit
    if (action === "mark_in_transit") {
      if (!workflowId) {
        return NextResponse.json({ success: false, message: "workflowId required" }, { status: 400 });
      }

      const updated = await prisma.restockWorkflow.update({
        where: { id: workflowId },
        data: {
          status: "in_transit",
          expectedDate: expectedDate ? new Date(expectedDate) : undefined,
          notes: notes ? notes : undefined,
        },
        include: { product: true },
      });

      await prisma.activityLog.create({
        data: {
          userId: user.id,
          action: "RESTOCK_IN_TRANSIT",
          details: `Restock delivery dispatched for ${updated.product.name} (PO: ${updated.poNumber || "N/A"})`,
        },
      });

      return NextResponse.json({ success: true, workflow: updated });
    }

    // ACTION: Receive Stock Delivery (Auto-Intake)
    if (action === "receive_stock") {
      if (!workflowId) {
        return NextResponse.json({ success: false, message: "workflowId required" }, { status: 400 });
      }

      const workflow = await prisma.restockWorkflow.findUnique({
        where: { id: workflowId },
        include: { product: true },
      });

      if (!workflow) {
        return NextResponse.json({ success: false, message: "Workflow record not found" }, { status: 404 });
      }

      const qty = receivedQty ? parseInt(receivedQty.toString()) : (workflow.orderQty || workflow.suggestedQty);

      // Perform atomic database transaction
      const result = await prisma.$transaction(async (tx) => {
        // 1. Record stock intake audit record
        const intake = await tx.stockIntake.create({
          data: {
            productId: workflow.productId,
            quantity: qty,
            userId: user.id,
          },
        });

        // 2. Increment product stock
        const updatedProduct = await tx.product.update({
          where: { id: workflow.productId },
          data: {
            stock: { increment: qty },
          },
        });

        // 3. Update workflow to received/resolved
        const updatedWorkflow = await tx.restockWorkflow.update({
          where: { id: workflowId },
          data: {
            status: "received",
            currentStock: updatedProduct.stock,
            resolvedById: user.id,
            notes: notes ? `${workflow.notes ? workflow.notes + " | " : ""}Received ${qty} units. ${notes}` : workflow.notes,
          },
        });

        // 4. Log activity
        await tx.activityLog.create({
          data: {
            userId: user.id,
            action: "RESTOCK_RECEIVED",
            details: `Received restock delivery of ${qty} units for ${workflow.product.name} (PO: ${workflow.poNumber || "N/A"}). New Stock: ${updatedProduct.stock}`,
          },
        });

        return { intake, updatedProduct, updatedWorkflow };
      });

      return NextResponse.json({ success: true, ...result });
    }

    // ACTION: Dismiss Alert
    if (action === "dismiss") {
      if (!workflowId) {
        return NextResponse.json({ success: false, message: "workflowId required" }, { status: 400 });
      }

      const updated = await prisma.restockWorkflow.update({
        where: { id: workflowId },
        data: {
          status: "dismissed",
          resolvedById: user.id,
          notes: notes || "Dismissed by user",
        },
      });

      return NextResponse.json({ success: true, workflow: updated });
    }

    return NextResponse.json({ success: false, message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Failed to process restock workflow action:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
