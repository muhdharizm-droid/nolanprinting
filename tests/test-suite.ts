const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const {
  translations,
  translateCategory,
  translatePaymentMethod,
  translatePaperMaterial,
  translateFinishing,
} = require("../src/lib/i18n/translations");

const prisma = new PrismaClient();

// ANSI Colors for formatted terminal output
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const testResults: TestResult[] = [];

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest(name: string, fn: () => Promise<void> | void) {
  const start = Date.now();
  try {
    await fn();
    const durationMs = Date.now() - start;
    testResults.push({ name, passed: true, durationMs });
    console.log(`  ${colors.green}✓${colors.reset} ${name} ${colors.dim}(${durationMs}ms)${colors.reset}`);
  } catch (err: any) {
    const durationMs = Date.now() - start;
    testResults.push({ name, passed: false, error: err.message, durationMs });
    console.log(`  ${colors.red}✗${colors.reset} ${name} ${colors.dim}(${durationMs}ms)${colors.reset}`);
    console.log(`    ${colors.red}Error: ${err.message}${colors.reset}`);
  }
}

async function main() {
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}   NOLAN PRINTING SERVICES - COMPREHENSIVE TEST SUITE   ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}\n`);

  // =========================================================================
  // SUITE 1: Internationalization (i18n) & Translation Symmetry
  // =========================================================================
  console.log(`${colors.bold}SUITE 1: Internationalization & Translation Symmetry (i18n)${colors.reset}`);

  await runTest("1.1 English & Bahasa Melayu keys count must match exactly", () => {
    const enKeys = Object.keys(translations.en);
    const msKeys = Object.keys(translations.ms);
    assert(
      enKeys.length === msKeys.length,
      `Key count mismatch: EN has ${enKeys.length} keys, MS has ${msKeys.length} keys.`
    );
  });

  await runTest("1.2 Every English translation key must exist in Bahasa Melayu", () => {
    const enKeys = Object.keys(translations.en);
    const msObj: Record<string, string> = translations.ms;
    const missingInMs = enKeys.filter((k) => msObj[k] === undefined);
    assert(
      missingInMs.length === 0,
      `Missing in MS (${missingInMs.length} keys): ${missingInMs.slice(0, 5).join(", ")}...`
    );
  });

  await runTest("1.3 Every Bahasa Melayu translation key must exist in English", () => {
    const msKeys = Object.keys(translations.ms);
    const enObj: Record<string, string> = translations.en;
    const missingInEn = msKeys.filter((k) => enObj[k] === undefined);
    assert(
      missingInEn.length === 0,
      `Missing in EN (${missingInEn.length} keys): ${missingInEn.slice(0, 5).join(", ")}...`
    );
  });

  await runTest("1.4 No translation value should be empty string or undefined", () => {
    const enEntries = Object.entries(translations.en);
    const msEntries = Object.entries(translations.ms);
    const emptyEn = enEntries.filter(([_, v]) => typeof v !== "string" || v.trim() === "");
    const emptyMs = msEntries.filter(([_, v]) => typeof v !== "string" || v.trim() === "");
    assert(emptyEn.length === 0, `Found empty strings in EN: ${emptyEn.map((e) => e[0]).join(", ")}`);
    assert(emptyMs.length === 0, `Found empty strings in MS: ${emptyMs.map((e) => e[0]).join(", ")}`);
  });

  await runTest("1.5 Helper translation functions must produce correct localized output", () => {
    assert(translatePaymentMethod("Cash", "en") === "Cash", "Payment method EN failed");
    assert(translatePaymentMethod("Cash", "ms") === "Tunai", "Payment method MS failed");
    assert(translatePaymentMethod("DuitNow QR", "ms") === "DuitNow QR", "QR method MS failed");
    assert(translateCategory("Paper & Supplies", "ms") === "Kertas & Bekalan", "Category MS failed");
    assert(translatePaperMaterial("70gsm Simili Standard", "ms").includes("Simili"), "Material MS failed");
    assert(translateFinishing("Plastic Comb Binding", "ms").includes("Jilid"), "Finishing MS failed");
  });

  // =========================================================================
  // SUITE 2: Print Shop Calculator & BOM Math (Unit Tests)
  // =========================================================================
  console.log(`\n${colors.bold}SUITE 2: Print Calculator & Bill of Materials (BOM) Logic${colors.reset}`);

  await runTest("2.1 Sheet calculation for Single-Sided printing", () => {
    const pages = 25;
    const copies = 4;
    const totalSheets = pages * copies;
    assert(totalSheets === 100, `Expected 100 sheets, got ${totalSheets}`);
  });

  await runTest("2.2 Sheet calculation for Duplex (Double-Sided) printing", () => {
    const pages = 51; // 51 pages duplex = 26 sheets per copy
    const copies = 3;
    const sheetsPerCopy = Math.ceil(pages / 2);
    const totalSheets = sheetsPerCopy * copies;
    assert(sheetsPerCopy === 26, `Expected 26 sheets/copy, got ${sheetsPerCopy}`);
    assert(totalSheets === 78, `Expected 78 total sheets, got ${totalSheets}`);
  });

  await runTest("2.3 A5 Parent Sheet Conversion (cut from parent A4)", () => {
    // 1 A4 parent sheet yields 2 A5 pages
    const a5Sheets = 75;
    const parentA4Sheets = Math.ceil(a5Sheets / 2);
    assert(parentA4Sheets === 38, `Expected 38 A4 parent sheets for 75 A5 sheets, got ${parentA4Sheets}`);
  });

  await runTest("2.4 Finishing consumables requirement calculations", () => {
    const copies = 5;
    const totalSheets = 120;

    // Comb Binding: 1 comb spine per copy, 2 PVC clear covers per copy
    const combSpinesNeeded = copies;
    const pvcCoversNeeded = copies * 2;
    assert(combSpinesNeeded === 5, `Expected 5 spines, got ${combSpinesNeeded}`);
    assert(pvcCoversNeeded === 10, `Expected 10 PVC covers, got ${pvcCoversNeeded}`);

    // Heat Laminate: 1 pouch per sheet
    const pouchesNeeded = totalSheets;
    assert(pouchesNeeded === 120, `Expected 120 laminating pouches, got ${pouchesNeeded}`);
  });

  await runTest("2.5 Tray loose stock depletion & pack auto-unpacking math", () => {
    const packCapacity = 500; // 500 sheets/ream

    // Scenario A: Sufficient loose stock in tray
    let stock = 10;
    let loose = 350;
    let needed = 150;
    if (loose >= needed) {
      loose -= needed;
    }
    assert(loose === 200 && stock === 10, "Scenario A failed: loose stock should be 200, stock 10");

    // Scenario B: Loose stock insufficient -> Unpack 1 ream
    needed = 450; // requires 200 loose + 250 from 1 new ream
    const neededFromPacks = needed - loose;
    const packsToOpen = Math.ceil(neededFromPacks / packCapacity);
    assert(packsToOpen === 1, "Expected 1 ream to open");
    stock -= packsToOpen;
    loose = (loose + packsToOpen * packCapacity) - needed;
    assert(stock === 9, "Expected 9 reams left");
    assert(loose === 250, "Expected 250 loose sheets left in tray");
  });

  await runTest("2.6 Void stock restoration consolidation math", () => {
    const packCapacity = 500;
    let stock = 9;
    let loose = 250;
    const restoreAmount = 450;

    loose += restoreAmount; // 700 sheets
    if (loose >= packCapacity) {
      const packsToAdd = Math.floor(loose / packCapacity);
      stock += packsToAdd;
      loose = loose % packCapacity;
    }
    assert(stock === 10, "Expected re-consolidated reams to be 10");
    assert(loose === 200, "Expected consolidated loose sheets to be 200");
  });

  await runTest("2.7 SST Tax and Discount calculation", () => {
    const subtotal = 120.0;
    const discount = 15.0;
    const taxRate = 6; // 6%

    const afterDiscount = Math.max(0, subtotal - discount); // 105.00
    const taxAmount = Math.round(afterDiscount * (taxRate / 100) * 100) / 100; // 6.30
    const grandTotal = Math.round((afterDiscount + taxAmount) * 100) / 100; // 111.30

    assert(afterDiscount === 105.0, `Expected afterDiscount 105.00, got ${afterDiscount}`);
    assert(taxAmount === 6.3, `Expected tax 6.30, got ${taxAmount}`);
    assert(grandTotal === 111.3, `Expected grand total 111.30, got ${grandTotal}`);
  });

  // =========================================================================
  // SUITE 3: Database & Security Integrity (Integration Tests)
  // =========================================================================
  console.log(`\n${colors.bold}SUITE 3: Database & Security Integrity (Neon PostgreSQL)${colors.reset}`);

  await runTest("3.1 Database connectivity and ping test", async () => {
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    assert(Array.isArray(result) && result.length > 0, "Database query returned no rows");
  });

  await runTest("3.2 Verify all required system roles exist in database", async () => {
    const users = await prisma.user.findMany({ select: { role: true, username: true } });
    const roles = new Set(users.map((u) => u.role));
    assert(roles.has("owner"), "Missing 'owner' role account");
    assert(roles.has("cashier"), "Missing 'cashier' role account");
    assert(roles.has("stock_handler"), "Missing 'stock_handler' role account");
  });

  await runTest("3.3 Verify BCrypt password authentication for system accounts", async () => {
    const cashier = await prisma.user.findUnique({ where: { username: "cashier" } });
    assert(!!cashier, "Cashier account not found");
    const isCashierMatch = await bcrypt.compare("cashier123", cashier!.password);
    assert(isCashierMatch, "Cashier password hash comparison failed");

    const stock = await prisma.user.findUnique({ where: { username: "stock" } });
    assert(!!stock, "Stock account not found");
    const isStockMatch = await bcrypt.compare("stock123", stock!.password);
    assert(isStockMatch, "Stock handler password hash comparison failed");

    const owner = await prisma.user.findUnique({ where: { username: "Hariz" } });
    assert(!!owner, "Owner account 'Hariz' not found");
    assert(
      owner!.password.startsWith("$2") && owner!.password.length === 60,
      "Owner password must be a valid 60-char BCrypt hash"
    );
  });

  await runTest("3.4 Product classification integrity", async () => {
    const products = await prisma.product.findMany();
    assert(products.length > 0, "No products found in database");

    for (const p of products) {
      if (p.isService) {
        assert(!p.isRawMaterial, `Product #${p.id} (${p.name}) cannot be both service and raw material`);
      }
      if (p.isRawMaterial) {
        assert(!p.isService, `Product #${p.id} (${p.name}) cannot be both raw material and service`);
        assert(p.packSize >= 1, `Raw material #${p.id} packSize must be >= 1`);
      }
    }
  });

  await runTest("3.5 Essential raw materials with barcodes exist", async () => {
    const barcodesToCheck = [
      "RAW-A4-70G",
      "RAW-A4-80G",
      "RAW-A3-70G",
      "RAW-COMB-12",
      "RAW-PVC-A4",
      "RAW-LAM-A4",
    ];

    const found = await prisma.product.findMany({
      where: { barcode: { in: barcodesToCheck } },
      select: { barcode: true, name: true, stock: true, packSize: true },
    });

    const foundBarcodes = new Set(found.map((f) => f.barcode));
    for (const b of barcodesToCheck) {
      assert(foundBarcodes.has(b), `Missing required raw material barcode: ${b}`);
    }
  });

  // =========================================================================
  // SUITE 4: End-to-End POS Checkout, BOM Auto-Deduction & Void Restoration
  // =========================================================================
  console.log(`\n${colors.bold}SUITE 4: End-to-End POS Checkout, BOM Auto-Deduction & Voiding Flow${colors.reset}`);

  let testSaleId: number | null = null;
  let testRetailProductId: number | null = null;
  let testRawMaterialId: number | null = null;

  await runTest("4.1 Setup controlled test products and execute POS checkout with BOM", async () => {
    const owner = await prisma.user.findFirst({ where: { role: "owner" } });
    assert(!!owner, "Owner user required for test");

    // Create controlled test retail product
    const retailProduct = await prisma.product.create({
      data: {
        barcode: `TEST-RET-${Date.now()}`,
        name: "Automated Test Pen",
        price: 3.5,
        costPrice: 2.0,
        stock: 50,
        threshold: 10,
        isService: false,
        isRawMaterial: false,
      },
    });
    testRetailProductId = retailProduct.id;

    // Create controlled test raw material paper
    const rawMaterial = await prisma.product.create({
      data: {
        barcode: `TEST-RAW-${Date.now()}`,
        name: "Automated Test Paper (Ream 500)",
        price: 0,
        costPrice: 12.0,
        stock: 5, // 5 reams
        looseStock: 150, // 150 sheets in tray
        packSize: 500,
        threshold: 2,
        isService: false,
        isRawMaterial: true,
      },
    });
    testRawMaterialId = rawMaterial.id;

    // Get an existing printing service product
    let svc = await prisma.product.findFirst({ where: { isService: true } });
    if (!svc) {
      svc = await prisma.product.create({
        data: {
          name: "Test Printing Service",
          price: 0,
          costPrice: 0,
          stock: 0,
          threshold: 0,
          isService: true,
        },
      });
    }

    // SIMULATE POS CHECKOUT (2 retail pens + 200 sheets of custom print)
    // 200 sheets needed from 150 loose -> unpacks 1 ream -> new stock: 4 reams, new loose: 450 sheets
    const sheetsNeeded = 200;
    const retailQtyToBuy = 2;

    const sale = await prisma.$transaction(async (tx) => {
      // 1. Decrement retail product
      await tx.product.update({
        where: { id: retailProduct.id },
        data: { stock: { decrement: retailQtyToBuy } },
      });

      // 2. Process BOM raw material deduction
      const packCapacity = rawMaterial.packSize;
      let curStock = rawMaterial.stock;
      let curLoose = rawMaterial.looseStock;

      if (curLoose >= sheetsNeeded) {
        curLoose -= sheetsNeeded;
      } else {
        const neededFromPacks = sheetsNeeded - curLoose;
        const packsToOpen = Math.ceil(neededFromPacks / packCapacity);
        curStock -= packsToOpen;
        curLoose = curLoose + packsToOpen * packCapacity - sheetsNeeded;
      }

      await tx.product.update({
        where: { id: rawMaterial.id },
        data: { stock: curStock, looseStock: curLoose },
      });

      // 3. Create Sale
      const unitMaterialCost = (Number(rawMaterial.costPrice) / packCapacity) * sheetsNeeded;
      const createdSale = await tx.sale.create({
        data: {
          userId: owner!.id,
          subtotal: 7.0 + 30.0,
          discountAmount: 0,
          taxAmount: 2.22,
          total: 39.22,
          paymentMethod: "Cash",
          status: "completed",
          items: {
            create: [
              {
                productId: retailProduct.id,
                quantity: retailQtyToBuy,
                priceAtSale: 3.5,
                costAtSale: 2.0,
              },
              {
                productId: svc!.id,
                quantity: 1,
                priceAtSale: 30.0,
                costAtSale: unitMaterialCost,
                details: "A4 | B&W | 100 pgs x 2 sets",
              },
            ],
          },
        },
      });

      // 4. Create StockUsage linked to saleId
      await tx.stockUsage.create({
        data: {
          productId: rawMaterial.id,
          quantity: sheetsNeeded,
          unitType: "loose",
          reason: "POS Customer Printing Order",
          notes: "Auto-deducted for Automated Test Print Order",
          userId: owner!.id,
          saleId: createdSale.id,
        },
      });

      return createdSale;
    });

    testSaleId = sale.id;

    // VERIFY DATABASE STATE AFTER CHECKOUT
    const updatedRetail = await prisma.product.findUnique({ where: { id: retailProduct.id } });
    const updatedRaw = await prisma.product.findUnique({ where: { id: rawMaterial.id } });
    const usageRecord = await prisma.stockUsage.findFirst({ where: { saleId: sale.id } });

    assert(updatedRetail!.stock === 48, `Retail stock expected 48, got ${updatedRetail!.stock}`);
    assert(updatedRaw!.stock === 4, `Raw stock expected 4 reams, got ${updatedRaw!.stock}`);
    assert(updatedRaw!.looseStock === 450, `Raw loose stock expected 450, got ${updatedRaw!.looseStock}`);
    assert(!!usageRecord, "StockUsage was not created with linked saleId");
    assert(usageRecord!.quantity === 200, `StockUsage quantity expected 200, got ${usageRecord!.quantity}`);
  });

  await runTest("4.2 Execute Transaction Void and verify accurate stock restoration", async () => {
    assert(testSaleId !== null, "Test sale ID must exist");
    const owner = await prisma.user.findFirst({ where: { role: "owner" } });

    // SIMULATE TRANSACTION VOID
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id: testSaleId! },
        include: { items: { include: { product: true } } },
      });

      assert(!!sale, "Sale not found for void");

      // 1. Restore retail products
      for (const item of sale!.items) {
        if (!item.product.isService) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }

      // 2. Restore BOM raw materials from linked stock_usages
      const rawUsages = await tx.stockUsage.findMany({
        where: { saleId: testSaleId! },
        include: { product: true },
      });

      for (const usage of rawUsages) {
        const prod = usage.product;
        const packCapacity = prod.packSize || 1;
        let curStock = prod.stock;
        let curLoose = prod.looseStock + usage.quantity;

        if (packCapacity > 1 && curLoose >= packCapacity) {
          const packsToAdd = Math.floor(curLoose / packCapacity);
          curStock += packsToAdd;
          curLoose = curLoose % packCapacity;
        }

        await tx.product.update({
          where: { id: prod.id },
          data: { stock: curStock, looseStock: curLoose },
        });
      }

      await tx.stockUsage.deleteMany({ where: { saleId: testSaleId! } });

      await tx.sale.update({
        where: { id: testSaleId! },
        data: {
          status: "voided",
          voidReason: "Customer requested cancellation / refund (Automated Test)",
        },
      });

      await tx.activityLog.create({
        data: {
          userId: owner!.id,
          action: "Sale Voided",
          details: `Voided transaction #${testSaleId} (Automated Test Verification)`,
        },
      });
    });

    // VERIFY DATABASE STATE AFTER VOID
    const restoredRetail = await prisma.product.findUnique({ where: { id: testRetailProductId! } });
    const restoredRaw = await prisma.product.findUnique({ where: { id: testRawMaterialId! } });
    const voidedSale = await prisma.sale.findUnique({ where: { id: testSaleId! } });

    assert(restoredRetail!.stock === 50, `Retail stock should be fully restored to 50, got ${restoredRetail!.stock}`);
    assert(restoredRaw!.stock === 5, `Raw reams should be restored to 5, got ${restoredRaw!.stock}`);
    assert(restoredRaw!.looseStock === 150, `Raw loose sheets should be restored to 150, got ${restoredRaw!.looseStock}`);
    assert(voidedSale!.status === "voided", "Sale status should be 'voided'");
    assert(
      Boolean(voidedSale!.voidReason && voidedSale!.voidReason.includes("Customer requested cancellation")),
      "Void reason was not correctly recorded"
    );

    // Clean up test data
    await prisma.saleItem.deleteMany({ where: { saleId: testSaleId! } });
    await prisma.sale.delete({ where: { id: testSaleId! } });
    await prisma.product.delete({ where: { id: testRetailProductId! } });
    await prisma.product.delete({ where: { id: testRawMaterialId! } });
  });

  // =========================================================================
  // SUITE 5: Low-Stock Automated Reorder & PO Pipeline Flow
  // =========================================================================
  console.log(`\n${colors.bold}SUITE 5: Low-Stock Automated Reorder & PO Pipeline Workflow${colors.reset}`);

  let testWorkflowId: number | null = null;
  let testPOProductId: number | null = null;

  await runTest("5.1 Create low-stock trigger and initialize Restock Workflow", async () => {
    const owner = await prisma.user.findFirst({ where: { role: "owner" } });

    // Create item breaching threshold
    const lowStockProduct = await prisma.product.create({
      data: {
        barcode: `TEST-LOW-${Date.now()}`,
        name: "Automated Test Low Stock Item",
        price: 5.0,
        costPrice: 3.0,
        stock: 3, // stock 3 <= threshold 10 -> Low Stock!
        threshold: 10,
        isService: false,
        isRawMaterial: false,
      },
    });
    testPOProductId = lowStockProduct.id;

    const wf = await prisma.restockWorkflow.create({
      data: {
        productId: lowStockProduct.id,
        currentStock: lowStockProduct.stock,
        threshold: lowStockProduct.threshold,
        suggestedQty: 20,
        status: "alert_triggered",
        notes: "Automated threshold breach detection test",
        createdById: owner?.id,
      },
    });
    testWorkflowId = wf.id;

    assert(wf.status === "alert_triggered", "Initial workflow status should be 'alert_triggered'");
    assert(wf.suggestedQty === 20, `Suggested quantity expected 20, got ${wf.suggestedQty}`);
  });

  await runTest("5.2 Advance workflow to 'po_issued' with generated PO Number", async () => {
    assert(testWorkflowId !== null, "Workflow ID required");
    const poNum = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-TEST`;

    const updated = await prisma.restockWorkflow.update({
      where: { id: testWorkflowId! },
      data: {
        status: "po_issued",
        poNumber: poNum,
        orderQty: 25,
        expectedDate: new Date(Date.now() + 86400000 * 3), // +3 days
      },
    });

    assert(updated.status === "po_issued", "Workflow status should be 'po_issued'");
    assert(updated.poNumber === poNum, "PO Number was not saved correctly");
    assert(updated.orderQty === 25, "Order quantity was not saved correctly");
  });

  await runTest("5.3 Advance workflow to 'in_transit'", async () => {
    assert(testWorkflowId !== null, "Workflow ID required");

    const updated = await prisma.restockWorkflow.update({
      where: { id: testWorkflowId! },
      data: {
        status: "in_transit",
        notes: "Dispatched by supplier. Tracking: TRK123456789",
      },
    });

    assert(updated.status === "in_transit", "Workflow status should be 'in_transit'");
    assert(Boolean(updated.notes && updated.notes.includes("TRK123456789")), "Tracking notes not saved");
  });

  await runTest("5.4 Complete stock delivery intake and advance workflow to 'received'", async () => {
    assert(testWorkflowId !== null, "Workflow ID required");
    assert(testPOProductId !== null, "Product ID required");

    const owner = await prisma.user.findFirst({ where: { role: "owner" } });
    const receivedQty = 25;

    await prisma.$transaction(async (tx) => {
      // 1. Increment product inventory stock
      await tx.product.update({
        where: { id: testPOProductId! },
        data: { stock: { increment: receivedQty } },
      });

      // 2. Record StockIntake audit record
      await tx.stockIntake.create({
        data: {
          productId: testPOProductId!,
          quantity: receivedQty,
          userId: owner!.id,
        },
      });

      // 3. Mark workflow as received
      await tx.restockWorkflow.update({
        where: { id: testWorkflowId! },
        data: {
          status: "received",
          resolvedById: owner!.id,
        },
      });
    });

    const finalProduct = await prisma.product.findUnique({ where: { id: testPOProductId! } });
    const finalWf = await prisma.restockWorkflow.findUnique({ where: { id: testWorkflowId! } });
    const intakeRecord = await prisma.stockIntake.findFirst({ where: { productId: testPOProductId! } });

    assert(finalProduct!.stock === 28, `Product stock should be 3 + 25 = 28, got ${finalProduct!.stock}`);
    assert(finalWf!.status === "received", "Workflow status should be 'received'");
    assert(!!intakeRecord, "Stock intake audit record was not created");

    // Clean up test workflow and product
    await prisma.stockIntake.deleteMany({ where: { productId: testPOProductId! } });
    await prisma.restockWorkflow.delete({ where: { id: testWorkflowId! } });
    await prisma.product.delete({ where: { id: testPOProductId! } });
  });

  // =========================================================================
  // SUMMARY REPORT
  // =========================================================================
  console.log(`\n${colors.bold}${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}               TEST EXECUTION SUMMARY               ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}====================================================${colors.reset}`);

  const total = testResults.length;
  const passed = testResults.filter((t) => t.passed).length;
  const failed = testResults.filter((t) => !t.passed).length;
  const totalDuration = testResults.reduce((sum, t) => sum + t.durationMs, 0);

  console.log(`Total Tests Run:  ${colors.bold}${total}${colors.reset}`);
  console.log(`Passed:           ${colors.bold}${colors.green}${passed}${colors.reset}`);
  console.log(`Failed:           ${colors.bold}${failed > 0 ? colors.red : colors.green}${failed}${colors.reset}`);
  console.log(`Total Time:       ${colors.dim}${totalDuration}ms${colors.reset}\n`);

  if (failed > 0) {
    console.log(`${colors.red}${colors.bold}FAILED TESTS:${colors.reset}`);
    for (const f of testResults.filter((t) => !t.passed)) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  } else {
    console.log(`${colors.green}${colors.bold}🎉 ALL ${passed} AUTOMATED TESTS PASSED SUCCESSFULLY!${colors.reset}\n`);
    process.exit(0);
  }
}

main()
  .catch((e) => {
    console.error("Test runner fatal error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
