import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n/context";
import { ThemeProvider } from "@/lib/theme/context";
import TopProgressBar from "@/components/TopProgressBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Nolan Printing Services | Management System",
  description: "Point of Sale, Inventory, and Business Management for Nolan Printing Services",
  icons: {
    icon: [
      { url: "/icon.png?v=1", type: "image/png" },
      { url: "/favicon.ico?v=1", sizes: "any" },
    ],
    apple: "/apple-icon.png?v=1",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} transition-colors duration-200`}>
        <TopProgressBar />
        <ThemeProvider>
          <I18nProvider>{children}</I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

