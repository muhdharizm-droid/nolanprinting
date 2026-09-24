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

    // Both Store Owner and Stock Handler can view stock intake reports
    if (user.role !== "owner" && user.role !== "stock_handler") {
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "30d"; // "7d" | "30d" | "90d" | "1y" | "all"

    const now = new Date();
    let startDate: Date | undefined;

    if (range === "7d") {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "90d") {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    } else if (range === "1y") {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    } // "all" leaves startDate undefined

    const where: any = {};
    if (startDate) {
      where.createdAt = { gte: startDate };
    }

    const intakes = await db.stockIntake.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: {
        product: {
          include: {
            category: true,
            supplier: true,
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

    // 1. Calculate Summary Metrics
    let totalUnits = 0;
    let totalCostValuation = 0;
    const productAgg: Record<
      number,
      {
        id: number;
        name: string;
        categoryName: string;
        isRawMaterial: boolean;
        units: number;
        cost: number;
        packSize: number;
      }
    > = {};
    const categoryAgg: Record<string, { units: number; cost: number }> = {};
    const dateAgg: Record<string, { label: string; units: number; cost: number; batches: number }> = {};

    for (const item of intakes) {
      const qty = item.quantity;
      const unitCost = Number(item.product.costPrice || 0);
      const batchCost = qty * unitCost;

      totalUnits += qty;
      totalCostValuation += batchCost;

      // Product Aggregation
      const pId = item.productId;
      if (!productAgg[pId]) {
        productAgg[pId] = {
          id: pId,
          name: item.product.name,
          categoryName: item.product.category?.name || (item.product.isRawMaterial ? "Paper & Supplies" : "Uncategorized"),
          isRawMaterial: item.product.isRawMaterial,
          units: 0,
          cost: 0,
          packSize: item.product.packSize || 1,
        };
      }
      productAgg[pId].units += qty;
      productAgg[pId].cost += batchCost;

      // Category Aggregation
      const catName = item.product.category?.name || (item.product.isRawMaterial ? "Paper & Supplies" : "General");
      if (!categoryAgg[catName]) {
        categoryAgg[catName] = { units: 0, cost: 0 };
      }
      categoryAgg[catName].units += qty;
      categoryAgg[catName].cost += batchCost;

      // Date Trend Aggregation
      const d = new Date(item.createdAt);
      const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const dateLabel = d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });

      if (!dateAgg[dateKey]) {
        dateAgg[dateKey] = { label: dateLabel, units: 0, cost: 0, batches: 0 };
      }
      dateAgg[dateKey].units += qty;
      dateAgg[dateKey].cost += batchCost;
      dateAgg[dateKey].batches += 1;
    }

    // Sort products by total intake volume
    const topProducts = Object.values(productAgg)
      .map((p) => ({
        ...p,
        cost: Math.round(p.cost * 100) / 100,
      }))
      .sort((a, b) => b.units - a.units);

    // Sort categories by volume
    const byCategory = Object.entries(categoryAgg).map(([name, data]) => ({
      name,
      units: data.units,
      cost: Math.round(data.cost * 100) / 100,
      percentage: totalUnits > 0 ? Math.round((data.units / totalUnits) * 1000) / 10 : 0,
    })).sort((a, b) => b.units - a.units);

    // Build timeline trend (fill empty days if 7d or 30d for clean graph continuity)
    let trend: Array<{ date: string; dateKey: string; units: number; cost: number; batches: number }> = [];

    if (range === "7d" || range === "30d") {
      const daysCount = range === "7d" ? 7 : 30;
      for (let i = daysCount - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });

        const existing = dateAgg[key];
        trend.push({
          date: label,
          dateKey: key,
          units: existing ? existing.units : 0,
          cost: existing ? Math.round(existing.cost * 100) / 100 : 0,
          batches: existing ? existing.batches : 0,
        });
      }
    } else {
      trend = Object.entries(dateAgg)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({
          date: val.label,
          dateKey: key,
          units: val.units,
          cost: Math.round(val.cost * 100) / 100,
          batches: val.batches,
        }));
    }

    // Recent Intakes List (newest first)
    const recentIntakes = intakes
      .slice(-30)
      .reverse()
      .map((item) => ({
        id: item.id,
        createdAt: item.createdAt,
        productName: item.product.name,
        isRawMaterial: item.product.isRawMaterial,
        categoryName: item.product.category?.name || "General",
        quantity: item.quantity,
        unitCost: Number(item.product.costPrice || 0),
        totalCost: Math.round(item.quantity * Number(item.product.costPrice || 0) * 100) / 100,
        supplierName: item.product.supplier?.name || "Direct Supplier",
        userFullName: item.user.fullName || item.user.username,
        userRole: item.user.role,
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalUnits,
        totalCostValuation: Math.round(totalCostValuation * 100) / 100,
        totalBatches: intakes.length,
        mostRestockedItem: topProducts[0]?.name || "None",
      },
      trend,
      byCategory,
      topProducts,
      recentIntakes,
    });
  } catch (error: any) {
    console.error("Stock intake report API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate stock intake report" },
      { status: 500 }
    );
  }
}

