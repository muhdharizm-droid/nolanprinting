import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Nolan Printing database...");

  // 1. Settings
  const defaultSettings = [
    { key: "store_name", value: "Nolan Printing Services" },
    { key: "store_phone", value: "013-2707949" },
    { key: "store_address", value: "Ampang, Selangor, Malaysia" },
    { key: "tax_rate", value: "6" },
    { key: "currency", value: "RM" },
    { key: "receipt_footer", value: "Thank you for printing with Nolan! Please come again." },
    { key: "discount_amount", value: "0" },
    { key: "discount_type", value: "fixed" },
  ];

  for (const s of defaultSettings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  // 2. Users (Owner, Cashier, Stock Handler)
  const hashedOwnerPassword = await bcrypt.hash("admin123", 10);
  const hashedCashierPassword = await bcrypt.hash("cashier123", 10);
  const hashedStockPassword = await bcrypt.hash("stock123", 10);

  const owner = await prisma.user.upsert({
    where: { username: "Hariz" },
    update: {},
    create: {
      username: "Hariz",
      password: hashedOwnerPassword,
      role: "owner",
      fullName: "Muhammad Hariz Bin Muslan",
      gender: "Male",
      race: "Malay",
      address: "12A, Jalan Andaman 5, Taman Andaman Ukay, 68000 Ampang, Selangor",
      phoneNumber: "0132707949",
    },
  });

  await prisma.user.upsert({
    where: { username: "cashier" },
    update: {},
    create: {
      username: "cashier",
      password: hashedCashierPassword,
      role: "cashier",
      fullName: "Ahmad Kassim (Cashier)",
      phoneNumber: "0123456789",
    },
  });

  await prisma.user.upsert({
    where: { username: "stock" },
    update: {},
    create: {
      username: "stock",
      password: hashedStockPassword,
      role: "stock_handler",
      fullName: "Siti Rahmah (Stock Handler)",
      phoneNumber: "0198765432",
    },
  });

  // 3. Suppliers
  const stabilo = await prisma.supplier.create({
    data: {
      name: "Stabilo Malaysia",
      contact: "03-5485921",
      email: "stabilo@gmail.com",
      address: "6, Jalan SR 8/3, Taman Serdang Raya, 43300 Seri Kembangan, Selangor",
    },
  });

  // 4. Categories
  const catPrint = await prisma.category.upsert({
    where: { name: "Printing & Services" },
    update: {},
    create: { name: "Printing & Services" },
  });

  const catStationery = await prisma.category.upsert({
    where: { name: "Stationery" },
    update: {},
    create: { name: "Stationery" },
  });

  const catPaper = await prisma.category.upsert({
    where: { name: "Paper & Supplies" },
    update: {},
    create: { name: "Paper & Supplies" },
  });

  // 5. Products
  await prisma.product.upsert({
    where: { barcode: "123456" },
    update: {},
    create: {
      barcode: "123456",
      name: "Printing Service",
      price: 0.00,
      costPrice: 0.00,
      stock: 999999,
      threshold: 10,
      categoryId: catPrint.id,
      isService: true,
    },
  });

  await prisma.product.upsert({
    where: { barcode: "456789" },
    update: {},
    create: {
      barcode: "456789",
      name: "Photocopy Service",
      price: 0.00,
      costPrice: 0.00,
      stock: 999999,
      threshold: 10,
      categoryId: catPrint.id,
      isService: true,
    },
  });

  await prisma.product.upsert({
    where: { barcode: "111111" },
    update: {},
    create: {
      barcode: "111111",
      name: "Pen Biru (Stabilo)",
      price: 0.80,
      costPrice: 0.50,
      stock: 50,
      threshold: 10,
      categoryId: catStationery.id,
      supplierId: stabilo.id,
      isService: false,
    },
  });

  await prisma.product.upsert({
    where: { barcode: "222222" },
    update: { isRawMaterial: true },
    create: {
      barcode: "222222",
      name: "A4 Paper Ream (80gsm Double A)",
      price: 0.00,
      costPrice: 11.50,
      stock: 45,
      threshold: 15,
      categoryId: catPaper.id,
      isService: false,
      isRawMaterial: true,
    },
  });

  // 6. Initial Activity Log
  await prisma.activityLog.create({
    data: {
      userId: owner.id,
      action: "System Initialized",
      details: "Seeded initial categories, default users, settings, and base products.",
    },
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

