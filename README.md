# Nolan Printing Services - Next.js (React)

A modern, full-stack Point of Sale (POS), Inventory, and Business Management system built with **Next.js 14**, **React**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM**.

Designed for zero-config deployment on **Vercel** with a free cloud PostgreSQL database (via **Neon** or **Supabase**).

---

## 🚀 Key Features

* **Point of Sale (POS):**
  * Instant product search & barcode / SKU scanning.
  * **Custom Print & Photocopy Calculator:** Dynamic calculation of B&W, Full Color, Paper types (A4, A3, Art Card, Sticker), Copies, and Finishing (Staple, Binding, Laminate).
  * Hold Bill / Retrieve Held Bill.
  * Cash Tendered calculation with change calculator & quick-tender buttons.
  * **Thermal Receipt Printing (80mm)** formatted for receipt printers & direct **WhatsApp Receipt sharing**.
* **Inventory Management:**
  * Active products, low-stock threshold alerts, and archive/restore tabs.
  * Quick stock intake batches.
  * Printable Code128 barcode labels.
  * 1-Click Excel / CSV inventory export.
* **Transactions & Voiding:**
  * Sales history with customer receipts.
  * **Void Transaction:** Cancels sale and automatically restores inventory stock.
* **Expenses & Suppliers:**
  * Categorized expense tracking and supplier directory.
* **Role-Based Access Control (RBAC):**
  * `👑 Owner`: Full system access, staff creation, financial statements, and store settings.
  * `💳 Cashier`: Point of Sale, receipts, and inventory lookup.
  * `📦 Stock Handler`: Inventory adjustments, categories, barcodes, and suppliers.
* **Bilingual Support (English & Bahasa Melayu):**
  * Seamless client-side switching between English and Malay without page reloads.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js 14 App Router, React 18, Tailwind CSS, Lucide Icons, Recharts
* **Backend:** Next.js Serverless API Routes, Edge Middleware
* **Database & ORM:** Prisma ORM (PostgreSQL)
* **Auth & Security:** JWT session cookies (via `jose`), `bcryptjs` password hashing

---

## 🌐 Deploying to Vercel in 3 Steps (100% Free)

### Step 1: Create a Free Database (60 Seconds)
1. Go to [Neon.tech](https://neon.tech) or [Supabase.com](https://supabase.com).
2. Click **"Continue with GitHub"** to sign in.
3. Create a project named `nolanprinting`.
4. Copy the connection string (`DATABASE_URL`). It looks like:
   ```
   postgresql://username:password@ep-xyz.neon.tech/neondb?sslmode=require
   ```

### Step 2: Initialize Database Tables & Default Users
In your terminal, run:
```bash
# Push tables to the cloud database
npx prisma db push

# Seed initial admin user and categories
npm run db:seed
```

### Step 3: Deploy on Vercel
1. Push this repository to **GitHub**.
2. Go to [Vercel](https://vercel.com) and click **"Add New Project"** -> Import this repository.
3. Under **Environment Variables**, add:
   * `DATABASE_URL`: *(Your Neon/Supabase PostgreSQL connection string)*
   * `JWT_SECRET`: *(Any random 32-character string)*
4. Click **Deploy**! Vercel will build and launch your live URL automatically.

---

## 🔑 Default Credentials (After Seeding)

| Account | Username | Password | Role |
| :--- | :--- | :--- | :--- |
| **Owner** | `Hariz` | `admin123` | Full Administrator Access |
| **Cashier** | `cashier` | `cashier123` | POS Register & Transactions |
| **Stock Handler** | `stock` | `stock123` | Inventory, Intake & Suppliers |

---

## 📁 Project Structure

```
├── prisma/
│   ├── schema.prisma       # Database models & relations
│   └── seed.ts             # Initial database seed script
├── public/                 # Logos, background images
├── src/
│   ├── app/
│   │   ├── (auth)/login/   # Login page
│   │   ├── (dashboard)/    # Dashboard layout & protected routes
│   │   │   ├── pos/        # POS register & custom print calculator
│   │   │   ├── inventory/  # Stock management & barcodes
│   │   │   ├── transactions/ # Sales history & voiding
│   │   │   ├── expenses/   # Expense tracker
│   │   │   ├── suppliers/  # Suppliers directory
│   │   │   ├── staff/      # Staff accounts (Owner only)
│   │   │   ├── reports/    # P&L financial reports
│   │   │   ├── logs/       # System audit logs
│   │   │   └── settings/   # Store settings & tax rates
│   │   └── api/            # 14 Serverless REST API endpoints
│   ├── lib/
│   │   ├── auth.ts         # JWT session management
│   │   ├── db.ts           # Prisma client instance
│   │   ├── utils.ts        # Currency (MYR) and date formatting
│   │   └── i18n/           # English & Malay translation dictionaries
│   └── middleware.ts       # Route protection & role guards
└── legacy_php/             # Safely archived previous PHP codebase
```

