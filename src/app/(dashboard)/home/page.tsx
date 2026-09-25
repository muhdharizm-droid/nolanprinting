"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingCart,
  Boxes,
  LayoutDashboard,
  Receipt,
  FolderTree,
  Truck,
  Users,
  Settings,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle2,
  DollarSign,
  User,
  Shield,
  BellRing,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { formatMYR, formatDate } from "@/lib/utils";

interface HomeData {
  user: { fullName: string; username: string; role: string } | null;
  stats: {
    todaySalesCount: number;
    todayRevenue: number;
    totalProducts: number;
    lowStockCount: number;
  };
  recentSales: Array<{
    id: number;
    total: number;
    paymentMethod: string;
    createdAt: string;
    user: { fullName: string; username: string };
  }>;
}

export default function HomePage() {
  const { t } = useI18n();

  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);

  // Time of day greeting
  const [greeting, setGreeting] = useState("Welcome");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    async function loadHome() {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        const currentUser = meData.user || null;

        let allSales: any[] = [];
        let totalActiveProducts = 0;
        let lowStockCount = 0;

        if (currentUser?.role === "owner") {
          const [repRes, txRes] = await Promise.all([
            fetch("/api/reports"),
            fetch("/api/transactions?status=completed"),
          ]);
          if (repRes.ok) {
            const repData = await repRes.json();
            totalActiveProducts = repData.summary?.totalActiveProducts || 0;
            lowStockCount = repData.summary?.lowStockCount || 0;
          }
          if (txRes.ok) {
            const txData = await txRes.json();
            allSales = txData.sales || [];
          }
        } else if (currentUser?.role === "stock_handler") {
          const repRes = await fetch("/api/reports");
          if (repRes.ok) {
            const repData = await repRes.json();
            totalActiveProducts = repData.summary?.totalActiveProducts || 0;
            lowStockCount = repData.summary?.lowStockCount || 0;
          }
        }

        // Calculate today's stats from transactions (for owner)
        const todayStr = new Date().toISOString().split("T")[0];
        const todaySales = allSales.filter((s: any) =>
          new Date(s.createdAt).toISOString().startsWith(todayStr)
        );
        const todayRevenue = todaySales.reduce((sum: number, s: any) => sum + Number(s.total), 0);

        setData({
          user: currentUser,
          stats: {
            todaySalesCount: todaySales.length,
            todayRevenue,
            totalProducts: totalActiveProducts,
            lowStockCount: lowStockCount,
          },
          recentSales: allSales.slice(0, 5),
        });
      } catch (e) {
        console.error("Failed to load home data", e);
      } finally {
        setLoading(false);
      }
    }
    loadHome();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const portalCards = [
    {
      title: "Point of Sale (POS)",
      desc: "Barcode scanner, custom print calculator, & thermal receipt printing",
      href: "/pos",
      icon: ShoppingCart,
      color: "from-blue-600 to-indigo-600",
      roles: ["owner", "cashier"],
      badge: "Fast Checkout",
    },
    {
      title: "Inventory & Stock",
      desc: "Monitor inventory, intake batches, barcode labels, and low-stock alerts",
      href: "/inventory",
      icon: Boxes,
      color: "from-emerald-600 to-teal-600",
      roles: ["owner", "stock_handler"],
      badge: data?.stats.lowStockCount ? `${data.stats.lowStockCount} Low` : undefined,
      badgeColor: "bg-amber-100 text-amber-800",
    },
    {
      title: "Low-Stock Pipeline",
      desc: "Automated reorder workflows, supplier PO generation, and delivery restock",
      href: "/workflows/low-stock",
      icon: BellRing,
      color: "from-rose-600 to-orange-600",
      roles: ["owner", "stock_handler"],
      badge: data?.stats.lowStockCount ? `${data.stats.lowStockCount} Alerts` : undefined,
      badgeColor: "bg-rose-100 text-rose-800",
    },
    {
      title: "Transactions",
      desc: "View customer receipts, payment methods, and void transactions",
      href: "/transactions",
      icon: Receipt,
      color: "from-cyan-600 to-blue-700",
      roles: ["owner"],
    },
    {
      title: "Financial Dashboard",
      desc: "P&L financial metrics, revenue trends, and category distribution",
      href: "/dashboard",
      icon: LayoutDashboard,
      color: "from-purple-600 to-indigo-700",
      roles: ["owner"],
    },
    {
      title: "Categories",
      desc: "Organize products into departments (Stationery, Banners, Printing)",
      href: "/categories",
      icon: FolderTree,
      color: "from-amber-600 to-orange-600",
      roles: ["owner", "stock_handler"],
    },
    {
      title: "Suppliers",
      desc: "Vendor directory for paper mills, ink suppliers, and raw materials",
      href: "/suppliers",
      icon: Truck,
      color: "from-rose-600 to-pink-600",
      roles: ["owner", "stock_handler"],
    },
    {
      title: "Staff Accounts",
      desc: "Manage team accounts, cashier permissions, and access credentials",
      href: "/staff",
      icon: Users,
      color: "from-blue-700 to-slate-800",
      roles: ["owner"],
    },
    {
      title: "System Settings",
      desc: "Store profile information, tax rates (SST), and receipt footer text",
      href: "/settings",
      icon: Settings,
      color: "from-slate-700 to-slate-900",
      roles: ["owner"],
    },
    {
      title: "My Profile",
      desc: "View personal details, employee credentials, and change password",
      href: "/profile",
      icon: User,
      color: "from-indigo-600 to-violet-700",
      roles: ["owner", "cashier", "stock_handler"],
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Skeleton Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 shadow-xl border border-slate-800 animate-pulse">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-32 h-14 sm:w-40 sm:h-16 rounded-2xl bg-white/10 shrink-0" />
              <div className="space-y-2">
                <div className="h-5 w-36 bg-white/10 rounded-full" />
                <div className="h-8 w-64 bg-white/20 rounded-xl" />
                <div className="h-4 w-80 bg-white/10 rounded-lg max-w-full" />
              </div>
            </div>
            <div className="flex gap-3">
              <div className="h-11 w-36 bg-white/10 rounded-2xl" />
              <div className="h-11 w-28 bg-white/10 rounded-2xl" />
            </div>
          </div>
        </div>

        {/* Skeleton Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="w-5 h-5 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              </div>
              <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>

        {/* Skeleton Portal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm animate-pulse space-y-3"
            >
              <div className="flex justify-between items-center">
                <div className="w-10 h-10 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="h-3 w-56 bg-slate-100 dark:bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const allowedCards = portalCards.filter(
    (card) => data?.user && card.roles.includes(data.user.role)
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      {/* Welcome Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800">
        {/* Background decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4">
            {/* Real Logo */}
            <div className="relative w-32 h-14 sm:w-40 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/20 shadow-lg bg-white shrink-0 p-1.5 flex items-center justify-center">
              <Image
                src="/images/logo.jpeg"
                alt="Nolan Printing Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 border border-white/10 mb-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{todayFormatted}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {greeting}, {data?.user?.fullName || "Hariz"}!
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Welcome to the <strong>Nolan Printing Services</strong> Management Hub. All systems and POS registers are operational.
              </p>
            </div>
          </div>

          {/* Quick Launch Buttons */}
          <div className="flex items-center gap-3 shrink-0">
            {data?.user?.role !== "stock_handler" && (
              <Link
                href="/pos"
                className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Open POS Register</span>
              </Link>
            )}
            {data?.user?.role !== "cashier" ? (
              <Link
                href="/inventory"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs sm:text-sm font-semibold rounded-2xl backdrop-blur-md border border-white/10 transition"
              >
                <Boxes className="w-4 h-4" />
                <span>Inventory</span>
              </Link>
            ) : (
              <Link
                href="/profile"
                className="flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs sm:text-sm font-semibold rounded-2xl backdrop-blur-md border border-white/10 transition"
              >
                <User className="w-4 h-4" />
                <span>My Profile</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Quick Overview Stats Row */}
      {data?.user?.role === "cashier" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/pos"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-blue-500 group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">POS Terminal</span>
              <ShoppingCart className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-blue-600">
              Active Register
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Ready for customer checkout &rarr;
            </span>
          </Link>

          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Role & Shift</span>
              <Shield className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white capitalize">
              Cashier
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Session active (@{data?.user?.username})
            </span>
          </div>

          <Link
            href="/profile"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-violet-500 group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">My Profile</span>
              <User className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {data?.user?.fullName?.split(" ")[0] || "Profile"}
            </div>
            <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mt-1 block">
              View & edit personal details &rarr;
            </span>
          </Link>
        </div>
      ) : data?.user?.role === "stock_handler" ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/inventory"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-emerald-500 group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Products</span>
              <Boxes className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {data?.stats.totalProducts ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Catalog inventory items &rarr;
            </span>
          </Link>

          <Link
            href="/workflows/low-stock"
            className={`p-5 rounded-2xl border transition block ${
              data?.stats.lowStockCount
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 hover:border-amber-500"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Stock Alerts</span>
              <BellRing className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">
              {data?.stats.lowStockCount ?? 0} items
            </div>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1 block">
              {data?.stats.lowStockCount ? "Manage reorders &rarr;" : "All healthy"}
            </span>
          </Link>

          <Link
            href="/profile"
            className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition hover:border-violet-500 group"
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">My Profile</span>
              <User className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {data?.user?.fullName?.split(" ")[0] || "Profile"}
            </div>
            <span className="text-[11px] text-violet-600 dark:text-violet-400 font-semibold mt-1 block">
              View & edit personal details &rarr;
            </span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Today's Sales Count */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Transactions</span>
              <ShoppingCart className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {data?.stats.todaySalesCount ?? 0}
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
              Completed today
            </span>
          </div>

          {/* Today's Revenue */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Today's Revenue</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-600">
              {formatMYR(data?.stats.todayRevenue ?? 0)}
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Direct receipts
            </span>
          </div>

          {/* Total Products */}
          <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Active Products</span>
              <Boxes className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {data?.stats.totalProducts ?? 0}
            </div>
            <span className="text-[11px] text-slate-400 font-medium mt-1 block">
              Catalog inventory
            </span>
          </div>

          {/* Low Stock Alerts */}
          <Link
            href="/inventory"
            className={`p-5 rounded-2xl border transition block ${
              data?.stats.lowStockCount
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Stock Alerts</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-600">
              {data?.stats.lowStockCount ?? 0} items
            </div>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 mt-1 block">
              {data?.stats.lowStockCount ? "Needs restock" : "All healthy"}
            </span>
          </Link>
        </div>
      )}

      {/* Quick Launch Department Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Department Shortcuts
            </h2>
            <p className="text-xs text-slate-400">Quickly navigate to business modules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {allowedCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group relative p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${card.color} text-white flex items-center justify-center shadow-md`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    {card.badge && (
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          card.badgeColor || "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300"
                        }`}
                      >
                        {card.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 transition mb-1">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {card.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-blue-600 dark:text-blue-400">
                  <span>Enter</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Table (Store Owner Only) */}
      {data?.user?.role === "owner" && data?.recentSales && data.recentSales.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-sm text-slate-800 dark:text-white">
                Recent Sales Transactions
              </h2>
              <p className="text-xs text-slate-400">Latest completed point of sale activity</p>
            </div>
            <Link
              href="/transactions"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <span>View all transactions</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Sale #</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Cashier</th>
                  <th className="p-3.5">Method</th>
                  <th className="p-3.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.recentSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold font-mono text-blue-600">#{sale.id}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">
                      {formatDate(sale.createdAt)}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-200">
                      {sale.user?.fullName || sale.user?.username}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-black text-slate-900 dark:text-white">
                      {formatMYR(sale.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

