import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getDateBounds(params: {
  period: string;
  month?: number;
  year?: number;
  startDate?: string;
  endDate?: string;
}) {
  const now = new Date();
  const tzOffset = 8 * 60 * 60 * 1000; // Malaysia UTC+8
  const localNow = new Date(now.getTime() + tzOffset);
  const currentYear = localNow.getUTCFullYear();
  const currentMonth = localNow.getUTCMonth() + 1; // 1-12
  const currentDay = localNow.getUTCDate();

  let start: Date | null = null;
  let end: Date | null = null;
  let label = "";

  const pad = (n: number) => String(n).padStart(2, "0");
  const p = params.period || "this_month";

  if (p === "today") {
    const todayStr = `${currentYear}-${pad(currentMonth)}-${pad(currentDay)}`;
    start = new Date(`${todayStr}T00:00:00.000+08:00`);
    end = new Date(`${todayStr}T23:59:59.999+08:00`);
    label = todayStr;
  } else if (p === "yesterday") {
    const yestDate = new Date(localNow.getTime() - 24 * 60 * 60 * 1000);
    const yestStr = `${yestDate.getUTCFullYear()}-${pad(yestDate.getUTCMonth() + 1)}-${pad(yestDate.getUTCDate())}`;
    start = new Date(`${yestStr}T00:00:00.000+08:00`);
    end = new Date(`${yestStr}T23:59:59.999+08:00`);
    label = yestStr;
  } else if (p === "this_month") {
    const firstDay = `${currentYear}-${pad(currentMonth)}-01`;
    const lastDayNum = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
    const lastDay = `${currentYear}-${pad(currentMonth)}-${pad(lastDayNum)}`;
    start = new Date(`${firstDay}T00:00:00.000+08:00`);
    end = new Date(`${lastDay}T23:59:59.999+08:00`);
    label = `${currentYear}-${pad(currentMonth)}`;
  } else if (p === "this_year") {
    start = new Date(`${currentYear}-01-01T00:00:00.000+08:00`);
    end = new Date(`${currentYear}-12-31T23:59:59.999+08:00`);
    label = `${currentYear}`;
  } else if (p === "monthly") {
    const y = params.year || currentYear;
    const m = params.month || currentMonth;
    const firstDay = `${y}-${pad(m)}-01`;
    const lastDayNum = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const lastDay = `${y}-${pad(m)}-${pad(lastDayNum)}`;
    start = new Date(`${firstDay}T00:00:00.000+08:00`);
    end = new Date(`${lastDay}T23:59:59.999+08:00`);
    label = `${y}-${pad(m)}`;
  } else if (p === "yearly") {
    const y = params.year || currentYear;
    start = new Date(`${y}-01-01T00:00:00.000+08:00`);
    end = new Date(`${y}-12-31T23:59:59.999+08:00`);
    label = `${y}`;
  } else if (p === "custom" && params.startDate && params.endDate) {
    start = new Date(`${params.startDate}T00:00:00.000+08:00`);
    end = new Date(`${params.endDate}T23:59:59.999+08:00`);
    label = `${params.startDate} to ${params.endDate}`;
  } else if (p === "all") {
    start = null;
    end = null;
    label = "All Time";
  } else {
    const firstDay = `${currentYear}-${pad(currentMonth)}-01`;
    const lastDayNum = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
    const lastDay = `${currentYear}-${pad(currentMonth)}-${pad(lastDayNum)}`;
    start = new Date(`${firstDay}T00:00:00.000+08:00`);
    end = new Date(`${lastDay}T23:59:59.999+08:00`);
    label = `${currentYear}-${pad(currentMonth)}`;
  }

  return { start, end, label, currentYear, currentMonth };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || searchParams.get("range") || "this_month";
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const { start, end, label, currentYear } = getDateBounds({
      period,
      month,
      year,
      startDate,
      endDate,
    });

    const where: any = {
      status: "completed",
    };

    if (start && end) {
      where.createdAt = {
        gte: start,
        lte: end,
      };
    }

    // 1. Fetch completed sales within period
    const completedSales = await db.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. Fetch all expenses (for optional context)
    const expenses = await db.expense.findMany({
      orderBy: { createdAt: "desc" },
    });
    const totalExpenses = expenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0);

    // 3. Compute Summary Totals
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalSubtotal = 0;
    let totalItemsSold = 0;

    const paymentMap: Record<string, { amount: number; count: number }> = {
      cash: { amount: 0, count: 0 },
      qr: { amount: 0, count: 0 },
      transfer: { amount: 0, count: 0 },
      card: { amount: 0, count: 0 },
    };

    const categorySalesMap: Record<string, { total: number; count: number }> = {};
    const productSalesMap: Record<string, {
      productId: number;
      productName: string;
      categoryName: string;
      isService: boolean;
      unitsSold: number;
      totalRevenue: number;
      unitPrice: number;
    }> = {};

    const dailyMap: Record<string, { date: string; dayName: string; total: number; count: number; cash: number; digital: number }> = {};

    for (const sale of completedSales) {
      const saleTotal = Number(sale.total);
      totalRevenue += saleTotal;
      totalDiscounts += Number(sale.discountAmount || 0);
      totalTax += Number(sale.taxAmount || 0);
      totalSubtotal += Number(sale.subtotal || 0);

      // Payment reconciliation
      const rawMethod = (sale.paymentMethod || "cash").toLowerCase();
      const normalizedMethod =
        rawMethod.includes("qr") || rawMethod.includes("duitnow")
          ? "qr"
          : rawMethod.includes("transfer") || rawMethod.includes("bank") || rawMethod.includes("online")
          ? "transfer"
          : rawMethod.includes("card") || rawMethod.includes("debit") || rawMethod.includes("credit")
          ? "card"
          : "cash";

      if (!paymentMap[normalizedMethod]) {
        paymentMap[normalizedMethod] = { amount: 0, count: 0 };
      }
      paymentMap[normalizedMethod].amount += saleTotal;
      paymentMap[normalizedMethod].count += 1;

      // Daily breakdown
      const localSaleTime = new Date(sale.createdAt.getTime() + 8 * 3600000);
      const dateKey = period === "yearly"
        ? `${localSaleTime.getUTCFullYear()}-${String(localSaleTime.getUTCMonth() + 1).padStart(2, "0")}`
        : localSaleTime.toISOString().split("T")[0];

      const dayName = period === "yearly"
        ? localSaleTime.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })
        : localSaleTime.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          dayName,
          total: 0,
          count: 0,
          cash: 0,
          digital: 0,
        };
      }
      dailyMap[dateKey].total += saleTotal;
      dailyMap[dateKey].count += 1;
      if (normalizedMethod === "cash") {
        dailyMap[dateKey].cash += saleTotal;
      } else {
        dailyMap[dateKey].digital += saleTotal;
      }

      // Line items iteration
      for (const item of sale.items) {
        totalItemsSold += item.quantity;
        const itemRevenue = Number(item.priceAtSale) * item.quantity;
        const itemCogs = Number(item.costAtSale) * item.quantity;
        totalCogs += itemCogs;

        const catName =
          item.product?.category?.name || (item.product?.isService ? "Printing Services" : "Uncategorized");

        if (!categorySalesMap[catName]) {
          categorySalesMap[catName] = { total: 0, count: 0 };
        }
        categorySalesMap[catName].total += itemRevenue;
        categorySalesMap[catName].count += item.quantity;

        const prodId = item.productId || item.product?.id || 0;
        const prodName = item.product?.name || "Custom Item";
        const prodKey = `${prodId}_${prodName}`;

        if (!productSalesMap[prodKey]) {
          productSalesMap[prodKey] = {
            productId: prodId,
            productName: prodName,
            categoryName: catName,
            isService: Boolean(item.product?.isService),
            unitsSold: 0,
            totalRevenue: 0,
            unitPrice: Number(item.priceAtSale),
          };
        }
        productSalesMap[prodKey].unitsSold += item.quantity;
        productSalesMap[prodKey].totalRevenue += itemRevenue;
      }
    }

    const totalTransactions = completedSales.length;
    const averageOrderValue =
      totalTransactions > 0 ? Math.round((totalRevenue / totalTransactions) * 100) / 100 : 0;

    // Payment reconciliation list
    const paymentReconciliation = Object.entries(paymentMap).map(([method, data]) => ({
      method,
      amount: Math.round(data.amount * 100) / 100,
      count: data.count,
      percentage: totalRevenue > 0 ? Math.round((data.amount / totalRevenue) * 1000) / 10 : 0,
    }));

    // Daily breakdown list
    const dailyBreakdown = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        total: Math.round(d.total * 100) / 100,
        cash: Math.round(d.cash * 100) / 100,
        digital: Math.round(d.digital * 100) / 100,
      }));

    // Top selling products
    const topProducts = Object.values(productSalesMap)
      .map((p) => ({
        ...p,
        totalRevenue: Math.round(p.totalRevenue * 100) / 100,
        percentage: totalRevenue > 0 ? Math.round((p.totalRevenue / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Category breakdown
    const categoryChartData = Object.entries(categorySalesMap)
      .map(([name, data]) => ({
        name,
        value: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Detailed transactions log
    const detailedTransactions = completedSales.map((sale: any) => ({
      id: sale.id,
      receiptNo: `REC-${String(sale.id).padStart(5, "0")}`,
      createdAt: sale.createdAt.toISOString(),
      cashier: sale.user?.fullName || sale.user?.username || "Staff",
      paymentMethod: sale.paymentMethod,
      subtotal: Number(sale.subtotal),
      discountAmount: Number(sale.discountAmount || 0),
      taxAmount: Number(sale.taxAmount || 0),
      total: Number(sale.total),
      itemCount: sale.items.reduce((acc: number, it: any) => acc + it.quantity, 0),
      itemsSummary: sale.items.map((it: any) => `${it.quantity}x ${it.product?.name || "Item"}`).join(", "),
      items: sale.items.map((it: any) => ({
        id: it.id,
        productId: it.productId,
        productName: it.product?.name || "Custom Item",
        categoryName: it.product?.category?.name || (it.product?.isService ? "Printing" : "General"),
        isService: Boolean(it.product?.isService),
        quantity: it.quantity,
        priceAtSale: Number(it.priceAtSale),
        details: it.details || null,
        lineTotal: Math.round(Number(it.priceAtSale) * it.quantity * 100) / 100,
      })),
    }));

    // Available years for filter dropdown
    const availableYears = [currentYear, currentYear - 1, currentYear - 2];

    return NextResponse.json({
      success: true,
      period,
      periodLabel: label,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalSubtotal: Math.round(totalSubtotal * 100) / 100,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalTransactions,
        totalItemsSold,
        averageOrderValue,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
      },
      paymentReconciliation,
      dailyBreakdown,
      topProducts,
      categoryChartData,
      detailedTransactions,
      availableYears,
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate sales report" }, { status: 500 });
  }
}
