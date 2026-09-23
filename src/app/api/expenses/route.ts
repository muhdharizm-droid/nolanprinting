import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const expenses = await db.expense.findMany({
      include: {
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({ success: true, expenses, totalExpense });
  } catch (error) {
    return NextResponse.json({ success: false, message: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const { description, amount, category } = await req.json();

    if (!description?.trim() || !amount) {
      return NextResponse.json({ success: false, message: "Description and amount are required." }, { status: 400 });
    }

    const expense = await db.expense.create({
      data: {
        userId: user.id,
        description: description.trim(),
        amount: parseFloat(amount),
        category: category?.trim() || "General",
      },
    });

    await db.activityLog.create({
      data: {
        userId: user.id,
        action: "Expense Added",
        details: `Recorded expense '${expense.description}' of RM ${Number(expense.amount).toFixed(2)} under ${expense.category}`,
      },
    });

    return NextResponse.json({ success: true, expense });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || "Failed to record expense" }, { status: 500 });
  }
}

