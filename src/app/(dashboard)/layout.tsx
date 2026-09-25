"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  FolderTree,
  Receipt,
  WalletCards,
  Truck,
  Users,
  User,
  BarChart3,
  ScrollText,
  Settings,
  LogOut,
  Globe,
  Menu,
  X,
  ChevronRight,
  Sun,
  Moon,
  BellRing,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/context";
import { useTheme } from "@/lib/theme/context";
import BrandLoader from "@/components/BrandLoader";
import LowStockAlertBell from "@/components/LowStockAlertBell";

interface UserProfile {
  id: number;
  username: string;
  fullName: string;
  role: "owner" | "cashier" | "stock_handler";
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  roles: string[];
}

interface NavCategory {
  titleEn: string;
  titleMs: string;
  items: NavItem[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login");
          return;
        }
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          router.push("/login");
        }
      } catch {
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  // Role-based Route Guard
  useEffect(() => {
    if (!user || loading) return;

    if (user.role === "cashier") {
      const allowedCashier = ["/home", "/pos", "/profile"];
      const isAllowed = allowedCashier.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      );
      if (!isAllowed) {
        router.push("/home");
      }
    } else if (user.role === "stock_handler") {
      const allowedStock = ["/home", "/inventory", "/categories", "/suppliers", "/profile", "/workflows", "/workflows/low-stock"];
      const isAllowed = allowedStock.some(
        (r) => pathname === r || pathname.startsWith(r + "/")
      );
      if (!isAllowed) {
        router.push("/home");
      }
    }
  }, [user, loading, pathname, router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <BrandLoader
          fullScreen={false}
          message={language === "ms" ? "Mengesahkan sesi pengguna..." : "Verifying session..."}
          submessage={language === "ms" ? "Menjamin ruang kerja Nolan Printing anda" : "Securing your Nolan Printing workspace"}
        />
      </div>
    );
  }

  // Categorized Navigation Sections (Role-Restricted)
  const navCategories: NavCategory[] = [
    {
      titleEn: "MAIN MENU",
      titleMs: "MENU UTAMA",
      items: [
        {
          label: language === "ms" ? "Laman Utama" : "Home",
          href: "/home",
          icon: Home,
          roles: ["owner", "cashier", "stock_handler"],
        },
        {
          label: t("pos"),
          href: "/pos",
          icon: ShoppingCart,
          roles: ["owner", "cashier"],
        },
      ],
    },
    {
      titleEn: "INVENTORY & STOCK",
      titleMs: "INVENTORI & STOK",
      items: [
        {
          label: t("inventory"),
          href: "/inventory",
          icon: Boxes,
          roles: ["owner", "stock_handler"],
        },
        {
          label: t("manage_categories"),
          href: "/categories",
          icon: FolderTree,
          roles: ["owner", "stock_handler"],
        },
        {
          label: t("suppliers"),
          href: "/suppliers",
          icon: Truck,
          roles: ["owner", "stock_handler"],
        },
      ],
    },
    {
      titleEn: "WORKFLOWS & PIPELINES",
      titleMs: "ALIRAN KERJA & PIPELINE",
      items: [
        {
          label: language === "ms" ? "Amaran Stok & Pesanan" : "Low-Stock Reordering",
          href: "/workflows/low-stock",
          icon: BellRing,
          roles: ["owner", "stock_handler"],
        },
      ],
    },
    {
      titleEn: "FINANCE & REPORTS",
      titleMs: "KEWANGAN & LAPORAN",
      items: [
        {
          label: t("dashboard"),
          href: "/dashboard",
          icon: LayoutDashboard,
          roles: ["owner"],
        },
        {
          label: t("analytics"),
          href: "/reports",
          icon: BarChart3,
          roles: ["owner"],
        },
        {
          label: t("transactions"),
          href: "/transactions",
          icon: Receipt,
          roles: ["owner"],
        },
        {
          label: t("expenses"),
          href: "/expenses",
          icon: WalletCards,
          roles: ["owner"],
        },
      ],
    },
    {
      titleEn: "ADMINISTRATION",
      titleMs: "PENTADBIRAN",
      items: [
        {
          label: t("staff"),
          href: "/staff",
          icon: Users,
          roles: ["owner"],
        },
        {
          label: t("audit_log"),
          href: "/logs",
          icon: ScrollText,
          roles: ["owner"],
        },
        {
          label: t("settings"),
          href: "/settings",
          icon: Settings,
          roles: ["owner"],
        },
      ],
    },
    {
      titleEn: "ACCOUNT",
      titleMs: "AKAUN",
      items: [
        {
          label: t("profile"),
          href: "/profile",
          icon: User,
          roles: ["owner", "cashier", "stock_handler"],
        },
      ],
    },
  ];

  const roleBadges: Record<string, { label: string; bg: string }> = {
    owner: {
      label: language === "ms" ? "👑 Pemilik Kedai" : "👑 Store Owner",
      bg: "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    },
    cashier: {
      label: language === "ms" ? "💳 Juruwang" : "💳 Cashier",
      bg: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    },
    stock_handler: {
      label: language === "ms" ? "📦 Pengurus Stok" : "📦 Stock Manager",
      bg: "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800",
    },
  };

  const getBreadcrumbTitle = (path: string) => {
    const section = path.split("/")[1] || "home";
    const map: Record<string, { en: string; ms: string }> = {
      home: { en: "Home", ms: "Laman Utama" },
      pos: { en: "Point of Sale (POS)", ms: "Sistem POS (Jualan)" },
      inventory: { en: "Inventory", ms: "Inventori" },
      categories: { en: "Categories", ms: "Kategori" },
      suppliers: { en: "Suppliers", ms: "Pembekal" },
      workflows: { en: "Workflows & Pipelines", ms: "Aliran Kerja & Saluran" },
      dashboard: { en: "Financial Dashboard", ms: "Papan Pemuka Kewangan" },
      reports: { en: "Analytics & Reports", ms: "Analitik & Laporan" },
      transactions: { en: "Transactions", ms: "Transaksi" },
      expenses: { en: "Expense Management", ms: "Pengurusan Perbelanjaan" },
      staff: { en: "Staff Management", ms: "Pengurusan Staf" },
      logs: { en: "System Audit Log", ms: "Log Audit Sistem" },
      settings: { en: "System Settings", ms: "Tetapan Sistem" },
      profile: { en: "My Profile", ms: "Profil Saya" },
    };
    return map[section]?.[language] || section;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row transition-colors duration-200">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="relative w-16 h-8 rounded-lg overflow-hidden bg-white shrink-0 border border-white/20 shadow p-0.5 flex items-center justify-center">
            <Image src="/images/logo.jpeg" alt="Logo" fill className="object-contain" />
          </div>
          <span className="font-bold text-sm tracking-tight">{t("app_name")}</span>
        </div>

        <div className="flex items-center gap-2">
          {user && (user.role === "owner" || user.role === "stock_handler") && (
            <LowStockAlertBell />
          )}
          {/* Mobile Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
            title="Toggle Light / Dark Mode"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-300" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Categorized Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen shadow-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header with Authentic Logo */}
        <Link
          href="/home"
          onClick={() => setSidebarOpen(false)}
          className="p-4 border-b border-slate-800/80 flex items-center gap-3 hover:bg-slate-800/40 transition group"
        >
          <div className="relative w-16 h-9 rounded-xl overflow-hidden border-2 border-white/20 shadow-md bg-white shrink-0 group-hover:scale-105 transition-transform p-0.5 flex items-center justify-center">
            <Image
              src="/images/logo.jpeg"
              alt="Nolan Printing Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="overflow-hidden">
            <div className="font-black text-sm text-white tracking-tight uppercase leading-none">
              NOLAN PRINTING
            </div>
            <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mt-1">
              {language === "ms" ? "Sistem POS & Inventori" : "POS & Inventory Suite"}
            </div>
          </div>
        </Link>

        {/* User Card */}
        <div className="p-3 mx-3 my-2.5 bg-slate-800/60 rounded-xl border border-slate-700/50 flex items-center justify-between">
          <div className="overflow-hidden">
            <div className="text-xs font-bold text-white truncate">{user?.fullName}</div>
            <div className="text-[10px] text-slate-400 truncate">@{user?.username}</div>
          </div>
          {user && (
            <span
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                roleBadges[user.role]?.bg || "bg-slate-700 text-slate-200"
              }`}
            >
              {roleBadges[user.role]?.label || user.role}
            </span>
          )}
        </div>

        {/* Categorized Menu Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {navCategories.map((category) => {
            const filteredItems = category.items.filter(
              (item) => user && item.roles.includes(user.role)
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={category.titleEn} className="space-y-1">
                {/* Category Header */}
                <div className="px-2 text-[10px] font-black tracking-wider uppercase text-slate-400/90 mb-1">
                  {language === "ms" ? category.titleMs : category.titleEn}
                </div>

                {/* Items in Category */}
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.href !== "/home" && pathname.startsWith(item.href));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isActive
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                        <span>{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/70" />}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer Actions: Light/Dark Mode + Language + Sign Out */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Controls Bar: Theme + Language */}
          <div className="grid grid-cols-2 gap-2">
            {/* Dark / Light Mode Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700/80 rounded-xl text-xs font-semibold text-slate-300 transition"
              title="Toggle Theme"
            >
              {theme === "dark" ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">{t("light_mode")}</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[11px]">{t("dark_mode")}</span>
                </>
              )}
            </button>

            {/* Language Switcher */}
            <div className="flex items-center justify-center gap-1 bg-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setLanguage("en")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  language === "en" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage("ms")}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                  language === "ms" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"
                }`}
              >
                MS
              </button>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 border border-rose-900/30 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t("sign_out")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {/* Desktop Sticky Header Bar */}
        <header className="sticky top-0 z-30 hidden md:flex items-center justify-between bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-6 py-2.5 transition-colors">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>{t("app_name")}</span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-700 dark:text-slate-300">{getBreadcrumbTitle(pathname)}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Low-Stock Alert Bell for Owner & Stock Handler */}
            {user && (user.role === "owner" || user.role === "stock_handler") && (
              <LowStockAlertBell />
            )}

            {/* Profile Quick Access */}
            <Link
              href="/profile"
              className="flex items-center gap-2 py-1 px-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200/60 dark:border-slate-700/60 transition"
            >
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{user?.fullName?.split(" ")[0]}</span>
            </Link>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">{children}</div>
      </main>
    </div>
  );
}
