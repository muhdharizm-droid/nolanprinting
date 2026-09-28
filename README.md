# 🖨️ Nolan Printing Services Management System

A production-ready, full-stack **Point of Sale (POS)**, **Inventory & Raw Material Tracking (BOM)**, **Automated Low-Stock Reordering & PO Pipeline**, and **Business Analytics** platform custom-built for digital printing, photocopy, and stationery retail hubs.

Built with **Next.js 14 (App Router)**, **React 18**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**, powered by a cloud **PostgreSQL** database on **Neon**.

---

## 🌟 Key Features & Core Modules

### 1. Point of Sale (POS) Register
* **Fast Barcode & SKU Scanning**: Instant lookup with live stock validation.
* **Custom Print & Photocopy Calculator**:
  * Calculates print jobs dynamically: Paper Sizes (`A4`, `A3`, `A5`, `B5`), Sides (`1-Sided` vs `2-Sided Duplex`), Color Modes (`B&W Grayscale` vs `Full Color`), Pages, Copies, and Material types (Simili 70gsm, Double A 80gsm, Inkjet 100gsm, Art Card 260gsm, Sticker, Transparency).
  * Finishing & Binding options: Plastic Comb Binding, Wire-O Metal Binding, Heat Laminating, Stapling, and Punching.
  * Required custom price rate input per page and finishing fees.
* **Cart & Billing Tools**:
  * Hold Bill / Resume Held Bill (persisted via localStorage).
  * Multiple Payment Methods: Cash (with auto-change calculator & quick-tender buttons), Credit/Debit Card, and DuitNow QR.
  * Direct thermal receipt printing & WhatsApp receipt sharing.

### 2. Bill of Materials (BOM) & Raw Material Auto-Deduction 📦
* **Dual-Unit Inventory Tracking**: Tracks paper in full packs/reams (`stock`) and loose sheets in the printer feed trays (`looseStock`).
* **Automated Tray Depletion & Pack Unpacking**: Deducts consumed sheets from tray loose stock. When the tray is empty, the system automatically unpacks reams and transfers the remainder to loose stock.
* **Real-Time Stock Availability in POS**:
  * Calculator displays live material stock status before adding to the bill (e.g., `A4 70gsm Simili: 64 reams + 499 sheets in tray`).
  * Instant warning badge if requested print volume exceeds available shop paper or binding supplies.
* **Transparent Cart & Recipe Badging**: Shows allocated materials on custom print items (`[📦 BOM: 150x A4 Simili 70g • 1x Comb Spine • 2x PVC Cover]`).
* **Accurate Cost of Goods Sold (COGS)**: Automatically factors raw paper and consumable costs into sales for genuine gross profit margin reporting.

### 3. Automated Low-Stock & Purchase Order (PO) Pipeline 🚨
* **Low-Stock Notification Bell**: Real-time counter badge in the top navigation bar alerting staff when any product or paper supply breaches minimum threshold.
* **4-Stage Automated Workflow Pipeline** (`/workflows/low-stock`):
  1. **Alerts Triggered**: Automatic detection of breached thresholds with suggested reorder quantities.
  2. **PO Issued**: Generates formal Purchase Orders with official PO numbers.
     * **Official Purchase Order Document**: Printable/PDF-ready document with supplier details, receiving hub info, item specifications, and signature blocks.
     * **1-Click WhatsApp Order**: Formats and copies a professional WhatsApp order message ready to send to suppliers.
  3. **In-Transit Tracking**: Monitors expected delivery dates, courier tracking numbers, and logistics notes.
  4. **One-Click Intake Restock**: Receiving department verifies units inspected; automatically increments inventory stock and records an audit log.

### 4. Transactions & Secure Voiding with Reason Form 🔄
* **Transaction History**: Filter by status (`Completed` / `Voided`), date, or search by Sale ID.
* **Dedicated Void Form Modal**:
  * Prevents accidental clicks with a structured modal dialog and stock restoration warnings.
  * Quick-select reason presets (*Cashier error*, *Customer requested refund*, *Defective print / misprint*, *Duplicate transaction*, *Payment method issue*, *Other*).
  * Required custom explanation textarea.
* **Automatic Stock Restoration**: Restores both retail merchandise and raw paper/supplies (via linked BOM `StockUsage`) back into inventory.
* **Receipt & Table Display**: Highlights recorded void reasons on receipts and transaction tables with hover tooltips.

### 5. Multi-Format Thermal Receipts & Tax Invoices 🧾
* **Flexible Paper Sizing Switcher**:
  * `80mm Roll` (Standard POS thermal printers)
  * `58mm Mini` (Compact mobile bluetooth printers)
  * `A4 Invoice` (Official corporate tax invoice with table breakdown and signature stamp)
  * `A5 Slip` (Compact half-page receipt slip)
* **Official Branding**: Features the official logo, company contact info, SST tax breakdown, and customizable receipt footer note.

### 6. Inventory & Stockroom Operations
* **Product Categorization**: Filter by Retail Merchandise, Paper & Supplies (raw materials), and Custom Print Services.
* **Barcode Generation**: Generates and prints Code128 barcodes and product shelf labels.
* **Manual Stock Usage / Floor Issue**: Log paper reams loaded into machine trays or shop consumption.
* **Stock Intake History & Analytics**: Visual trend charts tracking replenishment volume over time.
* **Excel / CSV Export**: Instant export of inventory valuation and stock levels.

### 7. Financial Reports & Analytics 📊
* **P&L Financial Statements**: Real-time revenue, cost of goods (COGS), operating expenses, gross profit, and net profit.
* **Product Sales Drilldown**: Revenue contribution, units sold, and margins categorized by department.
* **Expense Management**: Categorized tracking of rent, utilities, ink cartridges, wages, and store expenses.

### 8. Role-Based Access Control (RBAC) & Security 👥
* **Three Defined Roles**:
  * `👑 Store Owner`: Full access to all financial statements, staff management, settings, voids, and audit logs.
  * `💳 Cashier`: Point of Sale, custom print calculator, receipts, and basic transaction lookup.
  * `📦 Stock Manager`: Inventory management, stock intake, usage logs, barcodes, and low-stock reorder workflows.
* **Security**: Tamper-evident `ActivityLog` recording all user logins, price adjustments, voids, and stock movements.

### 9. Fully Bilingual (English & Bahasa Melayu) 🌐
* Complete client-side language switching between English (`en`) and Bahasa Melayu (`ms`) across all pages, modals, thermal receipts, and alert dialogues without page reloads.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router), [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/) |
| **Icons & UI** | [Lucide React](https://lucide.dev/), [JsBarcode](https://lindell.me/JsBarcode/), [XLSX](https://sheetjs.com/) |
| **Charts** | [Recharts](https://recharts.org/) |
| **Backend** | Next.js Serverless API Routes, Edge Middleware |
| **Database** | [PostgreSQL](https://www.postgresql.org/) on [Neon](https://neon.tech/) Serverless |
| **ORM** | [Prisma ORM v5](https://www.prisma.io/) |
| **Auth** | JWT Session Cookies via [jose](https://github.com/panva/jose), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |

---

## 🚀 Getting Started (Local Development)

### Prerequisites
* **Node.js** (v18.17.0 or later)
* **npm** or **yarn**
* PostgreSQL database instance (Neon recommended)

### 1. Clone & Install
```bash
git clone https://github.com/muhdharizm-droid/nolanprinting.git
cd nolanprinting
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory (refer to `.env.example`):
```env
DATABASE_URL="postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require"
DATABASE_URL_UNPOOLED="postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-32-character-secret-key"
```

### 3. Database Synchronization
```bash
# Push schema to PostgreSQL database
npx prisma db push

# (Optional) Seed initial categories, demo products & users
npm run db:seed
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Default Credentials

| Account | Username | Password | Role | Access Level |
| :--- | :--- | :--- | :--- | :--- |
| **Store Owner** | `Hariz` | `admin123` | `owner` | Full Administrator (All Pages & Financials) |
| **Cashier** | `cashier` | `cashier123` | `cashier` | POS Register, Receipts & Lookup |
| **Stock Manager** | `stock` | `stock123` | `stock_handler` | Inventory, POs, Barcodes & Suppliers |

---

## 📁 Directory Architecture

```
nolanprinting/
├── prisma/
│   ├── schema.prisma       # Prisma schema (Sales, Products, Workflows, BOM Usages)
│   └── seed.ts             # Initial seed script
├── public/                 # Static assets (Logos, backgrounds)
├── src/
│   ├── app/
│   │   ├── (auth)/login/   # Login authentication page
│   │   ├── (dashboard)/    # Authenticated dashboard views
│   │   │   ├── categories/ # Department / Category catalog
│   │   │   ├── dashboard/  # Executive metrics overview
│   │   │   ├── expenses/   # Operating expenses tracker
│   │   │   ├── home/       # Quick access portal
│   │   │   ├── inventory/  # Stock levels, barcodes, usage logs & intake charts
│   │   │   ├── logs/       # Tamper-evident system activity audit logs
│   │   │   ├── pos/        # POS register & custom print calculator with BOM preview
│   │   │   ├── profile/    # Personal user profile & credentials
│   │   │   ├── reports/    # P&L statements & category breakdown
│   │   │   ├── settings/   # Business profile, SST tax rates & receipt defaults
│   │   │   ├── staff/      # Staff roster & account administration
│   │   │   ├── suppliers/  # Supplier directory & product links
│   │   │   ├── transactions/# Transaction receipts & voiding workflow
│   │   │   └── workflows/
│   │   │       └── low-stock/ # Low-stock reordering & PO pipeline
│   │   └── api/            # Serverless REST endpoints
│   ├── components/         # Reusable UI widgets, ThermalReceipt, PurchaseOrderModal
│   ├── lib/
│   │   ├── auth.ts         # JWT token signing & verification
│   │   ├── db.ts           # Prisma database client singleton
│   │   ├── utils.ts        # Currency (MYR), date formatters & helpers
│   │   └── i18n/           # English & Bahasa Melayu dictionaries
│   └── middleware.ts       # Edge route protection & RBAC authorization
└── README.md
```

---

## 📄 License & Attribution

Developed for **Nolan Printing Services Hub** © 2026. All rights reserved.
Built for high-efficiency digital print operations in Malaysia.
