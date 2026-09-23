import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "7d"; // "today" | "7d" | "30d" | "all"

    // 1. Fetch completed sales with items
    const completedSales = await db.sale.findMany({
      where: { status: "completed" },
      include: {
        items: {
          include: {
            product: { include: { category: true } },
          },
        },
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // 2. Fetch all expenses
    const expenses = await db.expense.findMany({
      orderBy: { createdAt: "desc" },
    });
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const expensesByCategoryMap: Record<string, number> = {};
    for (const exp of expenses) {
      const cat = exp.category || "General Operating";
      expensesByCategoryMap[cat] = (expensesByCategoryMap[cat] || 0) + Number(exp.amount);
    }
    const expensesByCategory = Object.entries(expensesByCategoryMap).map(([category, amount]) => ({
      category,
      amount: Math.round(amount * 100) / 100,
    }));

    // 3. Financial calculations
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    const categorySalesMap: Record<string, { total: number; count: number }> = {};
    const productSalesMap: Record<number, {
      productId: number;
      productName: string;
      categoryName: string;
      isService: boolean;
      unitsSold: number;
      totalRevenue: number;
      totalCogs: number;
      unitPrice: number;
    }> = {};

    for (const sale of completedSales) {
      const saleTotal = Number(sale.total);
      totalRevenue += saleTotal;
      totalDiscounts += Number(sale.discountAmount || 0);
      totalTax += Number(sale.taxAmount || 0);

      let saleCogs = 0;
      for (const item of sale.items) {
        const itemCogs = Number(item.costAtSale) * item.quantity;
        saleCogs += itemCogs;
        const itemRevenue = Number(item.priceAtSale) * item.quantity;

        const catName =
          item.product?.category?.name || (item.product?.isService ? "Printing Services" : "Uncategorized");

        if (!categorySalesMap[catName]) {
          categorySalesMap[catName] = { total: 0, count: 0 };
        }
        categorySalesMap[catName].total += itemRevenue;
        categorySalesMap[catName].count += item.quantity;

        const prodId = item.productId || item.product?.id || 0;
        const prodName = item.product?.name || "Custom Item";
        if (!productSalesMap[prodId]) {
          productSalesMap[prodId] = {
            productId: prodId,
            productName: prodName,
            categoryName: catName,
            isService: Boolean(item.product?.isService),
            unitsSold: 0,
            totalRevenue: 0,
            totalCogs: 0,
            unitPrice: Number(item.priceAtSale),
          };
        }
        productSalesMap[prodId].unitsSold += item.quantity;
        productSalesMap[prodId].totalRevenue += itemRevenue;
        productSalesMap[prodId].totalCogs += itemCogs;
      }
      totalCogs += saleCogs;
    }

    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // 4. Stock statistics
    const products = await db.product.findMany({
      where: { status: "active", isService: false },
    });
    const lowStockCount = products.filter((p) => p.stock <= p.threshold && p.stock > 0).length;
    const outOfStockCount = products.filter((p) => p.stock <= 0).length;
    const healthyStockCount = products.filter((p) => p.stock > p.threshold).length;

    // Format category datasets
    const categoryChartData = Object.entries(categorySalesMap)
      .map(([name, data]) => ({
        name,
        value: Math.round(data.total * 100) / 100,
        count: data.count,
        percentage: totalRevenue > 0 ? Math.round((data.total / totalRevenue) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // Format product-level breakdown
    const productSalesData = Object.values(productSalesMap)
      .map((p) => {
        const profit = p.totalRevenue - p.totalCogs;
        const margin = p.totalRevenue > 0 ? (profit / p.totalRevenue) * 100 : 0;
        return {
          ...p,
          totalRevenue: Math.round(p.totalRevenue * 100) / 100,
          totalCogs: Math.round(p.totalCogs * 100) / 100,
          profit: Math.round(profit * 100) / 100,
          margin: Math.round(margin * 10) / 10,
        };
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // 5. Generate Trend Data based on Range
    const now = new Date();
    let trendData: { date: string; revenue: number; profit: number; transactions: number }[] = [];

    if (range === "today") {
      // Hourly buckets for today (from 08:00 to 22:00)
      const hoursMap: Record<string, { revenue: number; profit: number; count: number }> = {};
      for (let h = 8; h <= 22; h += 2) {
        const label = `${h.toString().padStart(2, "0")}:00`;
        hoursMap[label] = { revenue: 0, profit: 0, count: 0 };
      }

      const todayStr = now.toISOString().split("T")[0];
      for (const sale of completedSales) {
        const saleDate = new Date(sale.createdAt);
        const saleDateStr = saleDate.toISOString().split("T")[0];
        if (saleDateStr === todayStr) {
          const saleHour = saleDate.getHours();
          const bucketHour = Math.min(22, Math.max(8, Math.floor(saleHour / 2) * 2));
          const label = `${bucketHour.toString().padStart(2, "0")}:00`;
          const saleTotal = Number(sale.total);
          const saleCogs = sale.items.reduce((s, it) => s + Number(it.costAtSale) * it.quantity, 0);

          if (!hoursMap[label]) {
            hoursMap[label] = { revenue: 0, profit: 0, count: 0 };
          }
          hoursMap[label].revenue += saleTotal;
          hoursMap[label].profit += saleTotal - saleCogs;
          hoursMap[label].count += 1;
        }
      }

      trendData = Object.entries(hoursMap).map(([date, val]) => ({
        date,
        revenue: Math.round(val.revenue * 100) / 100,
        profit: Math.round(val.profit * 100) / 100,
        transactions: val.count,
      }));
    } else if (range === "30d") {
      const daysMap: Record<string, { date: string; revenue: number; profit: number; count: number }> = {};
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
        daysMap[key] = { date: label, revenue: 0, profit: 0, count: 0 };
      }

      for (const sale of completedSales) {
        const key = new Date(sale.createdAt).toISOString().split("T")[0];
        if (daysMap[key]) {
          const saleTotal = Number(sale.total);
          const saleCogs = sale.items.reduce((s, it) => s + Number(it.costAtSale) * it.quantity, 0);
          daysMap[key].revenue += saleTotal;
          daysMap[key].profit += saleTotal - saleCogs;
          daysMap[key].count += 1;
        }
      }

      trendData = Object.values(daysMap).map((d) => ({
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
        profit: Math.round(d.profit * 100) / 100,
        transactions: d.count,
      }));
    } else if (range === "all") {
      const daysMap: Record<string, { date: string; revenue: number; profit: number; count: number }> = {};
      for (const sale of completedSales) {
        const key = new Date(sale.createdAt).toISOString().split("T")[0];
        const label = new Date(sale.createdAt).toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
          year: "2-digit",
        });
        if (!daysMap[key]) {
          daysMap[key] = { date: label, revenue: 0, profit: 0, count: 0 };
        }
        const saleTotal = Number(sale.total);
        const saleCogs = sale.items.reduce((s, it) => s + Number(it.costAtSale) * it.quantity, 0);
        daysMap[key].revenue += saleTotal;
        daysMap[key].profit += saleTotal - saleCogs;
        daysMap[key].count += 1;
      }

      trendData = Object.values(daysMap).map((d) => ({
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
        profit: Math.round(d.profit * 100) / 100,
        transactions: d.count,
      }));
    } else {
      // Default: Last 7 calendar days
      const daysMap: Record<string, { date: string; revenue: number; profit: number; count: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        const label = d.toLocaleDateString("en-MY", { weekday: "short", day: "numeric", month: "short" });
        daysMap[key] = { date: label, revenue: 0, profit: 0, count: 0 };
      }

      for (const sale of completedSales) {
        const key = new Date(sale.createdAt).toISOString().split("T")[0];
        if (daysMap[key]) {
          const saleTotal = Number(sale.total);
          const saleCogs = sale.items.reduce((s, it) => s + Number(it.costAtSale) * it.quantity, 0);
          daysMap[key].revenue += saleTotal;
          daysMap[key].profit += saleTotal - saleCogs;
          daysMap[key].count += 1;
        }
      }

      trendData = Object.values(daysMap).map((d) => ({
        date: d.date,
        revenue: Math.round(d.revenue * 100) / 100,
        profit: Math.round(d.profit * 100) / 100,
        transactions: d.count,
      }));
    }

    return NextResponse.json({
      success: true,
      range,
      summary: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalCogs: Math.round(totalCogs * 100) / 100,
        grossProfit: Math.round(grossProfit * 100) / 100,
        grossMargin: Math.round(grossMargin * 10) / 10,
        totalDiscounts: Math.round(totalDiscounts * 100) / 100,
        totalTax: Math.round(totalTax * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netProfit: Math.round(netProfit * 100) / 100,
        profitMargin: Math.round(profitMargin * 10) / 10,
        totalTransactions: completedSales.length,
        lowStockCount,
        outOfStockCount,
        healthyStockCount,
        totalActiveProducts: products.length,
      },
      categoryChartData,
      productSalesData,
      expensesByCategory,
      dailyTrendData: trendData,
    });
  } catch (error) {
    console.error("Reports API error:", error);
    return NextResponse.json({ success: false, message: "Failed to generate report" }, { status: 500 });
  }
}
