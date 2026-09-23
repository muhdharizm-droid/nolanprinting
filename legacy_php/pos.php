<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}
if ($_SESSION['role'] === 'stock_handler') { 
    die("Access Denied: Stock Handlers do not have access to POS."); 
}

$role = $_SESSION['role'];
$storeProfile = getStoreProfile($pdo);

// Handle AJAX Checkout
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_SERVER['CONTENT_TYPE']) && strpos($_SERVER['CONTENT_TYPE'], 'application/json') !== false) {
    header('Content-Type: application/json');
    $data = json_decode(file_get_contents('php://input'), true);

    if (!isset($data['csrf_token']) || !verifyCsrfToken($data['csrf_token'])) {
        echo json_encode(['success' => false, 'message' => 'Security token mismatch. Please reload the page.']); 
        exit;
    }

    if (isset($data['action']) && $data['action'] === 'checkout') {
        try {
            $pdo->beginTransaction();

            $items = $data['items'] ?? [];
            if (empty($items)) {
                throw new Exception("Cart is empty.");
            }

            $subtotalCalc = 0;
            $itemsToProcess = [];

            foreach ($items as $item) {
                $qty = max(1, (int)$item['quantity']);
                
                if (!empty($item['is_service'])) {
                    // Service Item (Printing, Photocopy, Finishing)
                    $unitPrice = (float)$item['price'];
                    $lineTotal = $unitPrice * $qty;
                    $subtotalCalc += $lineTotal;

                    $itemsToProcess[] = [
                        'product_id'    => (int)$item['service_product_id'],
                        'quantity'      => $qty,
                        'price_at_sale' => $unitPrice,
                        'cost_at_sale'  => 0.00,
                        'details'       => $item['details'] ?? 'Printing Service',
                        'is_service'    => true
                    ];
                } else {
                    // Regular Inventory Product
                    $stmt = $pdo->prepare("SELECT id, name, price, cost_price, stock, threshold FROM products WHERE id = ? FOR UPDATE");
                    $stmt->execute([(int)$item['id']]);
                    $product = $stmt->fetch();

                    if (!$product) {
                        throw new Exception("Product ID #{$item['id']} not found.");
                    }
                    if ($product['stock'] < $qty) {
                        throw new Exception("Insufficient stock for '{$product['name']}'. Only {$product['stock']} units available.");
                    }

                    $unitPrice = (float)$product['price'];
                    $costPrice = (float)$product['cost_price'];
                    $subtotalCalc += ($unitPrice * $qty);

                    $itemsToProcess[] = [
                        'product_id'    => $product['id'],
                        'quantity'      => $qty,
                        'price_at_sale' => $unitPrice,
                        'cost_at_sale'  => $costPrice,
                        'details'       => null,
                        'is_service'    => false
                    ];
                }
            }

            // Financial Calculations
            $discountAmount = max(0, (float)($data['discount_amount'] ?? 0));
            $taxRate = max(0, (float)($data['tax_rate'] ?? $storeProfile['tax_rate']));
            
            $subtotalAfterDiscount = max(0, $subtotalCalc - $discountAmount);
            $taxAmount = round($subtotalAfterDiscount * ($taxRate / 100), 2);
            $grandTotal = round($subtotalAfterDiscount + $taxAmount, 2);

            $paymentMethod = $data['payment_method'] ?? 'Cash';
            $cashReceived = (float)($data['cash_received'] ?? $grandTotal);
            $changeAmount = max(0, round($cashReceived - $grandTotal, 2));

            // Insert Sale Record with accurate subtotal, discount, and tax
            $stmt = $pdo->prepare("INSERT INTO sales (user_id, subtotal, discount_amount, tax_amount, total, payment_method, status) VALUES (?, ?, ?, ?, ?, ?, 'completed')");
            $stmt->execute([$_SESSION['user_id'], $subtotalCalc, $discountAmount, $taxAmount, $grandTotal, $paymentMethod]);
            $saleId = $pdo->lastInsertId();

            // Insert Sale Items and update inventory
            $itemStmt = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, price_at_sale, cost_at_sale, details) VALUES (?, ?, ?, ?, ?, ?)");
            $stockUpdateStmt = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");

            foreach ($itemsToProcess as $pItem) {
                $itemStmt->execute([
                    $saleId,
                    $pItem['product_id'],
                    $pItem['quantity'],
                    $pItem['price_at_sale'],
                    $pItem['cost_at_sale'],
                    $pItem['details']
                ]);

                if (!$pItem['is_service']) {
                    $stockUpdateStmt->execute([$pItem['quantity'], $pItem['product_id']]);
                }
            }

            $pdo->commit();
            logActivity($pdo, "Sale Completed", "Processed Sale #{$saleId} totaling RM " . number_format($grandTotal, 2) . " ({$paymentMethod})");

            echo json_encode([
                'success'      => true,
                'saleId'       => $saleId,
                'grandTotal'   => $grandTotal,
                'cashReceived' => $cashReceived,
                'change'       => $changeAmount
            ]);
        } catch (Exception $e) {
            $pdo->rollBack();
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
        exit;
    }
}

// Fetch Active Products & Categories
$products = $pdo->query("SELECT p.*, c.name as category_name, s.name as supplier_name 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    WHERE p.status = 'active' AND p.is_service = 0 AND p.stock > 0 
    ORDER BY p.name ASC")->fetchAll();

$services = $pdo->query("SELECT * FROM products WHERE status = 'active' AND is_service = 1 ORDER BY id ASC")->fetchAll();
$categories = $pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll();

$pageTitle = __('pos');
$pageSubtitle = 'Fast Checkout & Print Billing';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('pos') ?> | <?= __('app_name') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/app.css">
    <style>
        .pos-grid-container {
            display: grid;
            grid-template-columns: 1fr 440px;
            gap: 1.5rem;
            height: calc(100vh - var(--topbar-height) - 4rem);
        }
        @media (max-width: 1100px) {
            .pos-grid-container {
                grid-template-columns: 1fr;
                height: auto;
            }
        }
    </style>
</head>
<body>
    <div class="app-wrapper">
        <?php include 'sidebar.php'; ?>

        <div class="main-content-wrapper">
            <?php include 'header.php'; ?>

            <main class="content-body pb-2">
                <div class="pos-grid-container">
                    <!-- LEFT COLUMN: Product & Service Catalog -->
                    <div class="pos-catalog">
                        <!-- Search & Barcode Scan Bar -->
                        <div class="row g-2 mb-3">
                            <div class="col-md-7">
                                <div class="input-group shadow-sm">
                                    <span class="input-group-text bg-body border-end-0 text-muted">
                                        <i class="fas fa-barcode text-primary"></i>
                                    </span>
                                    <input type="text" id="barcodeInput" class="form-control border-start-0" placeholder="<?= __('scan_barcode') ?>" autofocus autocomplete="off">
                                </div>
                            </div>
                            <div class="col-md-5">
                                <div class="input-group shadow-sm">
                                    <span class="input-group-text bg-body border-end-0 text-muted">
                                        <i class="fas fa-search"></i>
                                    </span>
                                    <input type="text" id="searchInput" class="form-control border-start-0" placeholder="<?= __('search_by_name') ?>">
                                </div>
                            </div>
                        </div>

                        <!-- Category Filter Chips -->
                        <div class="category-chips" id="categoryChips">
                            <button class="category-chip active" data-category="all">
                                <i class="fas fa-border-all me-1"></i> <?= __('all_categories') ?> (<?= count($products) + count($services) ?>)
                            </button>
                            <button class="category-chip" data-category="__service__">
                                <i class="fas fa-print text-primary me-1"></i> Printing & Services
                            </button>
                            <?php foreach ($categories as $cat): ?>
                                <button class="category-chip" data-category="<?= htmlspecialchars($cat['name']) ?>">
                                    <?= htmlspecialchars($cat['name']) ?>
                                </button>
                            <?php endforeach; ?>
                        </div>

                        <!-- Product Grid -->
                        <div class="pos-product-grid" id="productGrid">
                            <!-- Service Buttons (Printing / Photocopy) -->
                            <?php foreach ($services as $srv): ?>
                                <div class="product-pos-card service-card" data-category="__service__" data-name="<?= strtolower(htmlspecialchars($srv['name'])) ?>" onclick="openServiceCalculator(<?= $srv['id'] ?>, '<?= htmlspecialchars($srv['name']) ?>')">
                                    <div class="mb-2">
                                        <div class="stat-icon bg-primary bg-opacity-10 text-primary mx-auto mb-2" style="width: 44px; height: 44px;">
                                            <i class="fas fa-print fa-lg"></i>
                                        </div>
                                        <span class="badge badge-soft-primary small mb-1">Service Calculator</span>
                                        <h6 class="fw-bold mb-1 text-truncate"><?= htmlspecialchars($srv['name']) ?></h6>
                                        <small class="text-muted d-block">Custom options & binding</small>
                                    </div>
                                    <button class="btn btn-sm btn-primary w-100 mt-2">
                                        <i class="fas fa-calculator me-1"></i> Calculate Price
                                    </button>
                                </div>
                            <?php endforeach; ?>

                            <!-- Standard Inventory Items -->
                            <?php foreach ($products as $prod): ?>
                                <div class="product-pos-card product-item" 
                                     data-id="<?= $prod['id'] ?>"
                                     data-name="<?= strtolower(htmlspecialchars($prod['name'])) ?>" 
                                     data-barcode="<?= htmlspecialchars($prod['barcode'] ?? '') ?>"
                                     data-category="<?= htmlspecialchars($prod['category_name'] ?? 'General') ?>"
                                     data-price="<?= $prod['price'] ?>"
                                     data-stock="<?= $prod['stock'] ?>"
                                     data-supplier="<?= htmlspecialchars($prod['supplier_name'] ?? '') ?>"
                                     onclick="addToCart(<?= $prod['id'] ?>, '<?= htmlspecialchars(addslashes($prod['name'])) ?>', <?= $prod['price'] ?>, <?= $prod['stock'] ?>, '<?= htmlspecialchars(addslashes($prod['supplier_name'] ?? '')) ?>')">
                                    <div>
                                        <div class="d-flex justify-content-between align-items-center mb-1">
                                            <span class="badge badge-soft-info" style="font-size: 0.68rem;"><?= htmlspecialchars($prod['category_name'] ?? 'General') ?></span>
                                            <span class="badge badge-soft-<?= $prod['stock'] <= $prod['threshold'] ? 'danger' : 'success' ?>" style="font-size: 0.68rem;">
                                                <?= $prod['stock'] ?> left
                                            </span>
                                        </div>
                                        <h6 class="fw-bold mb-1 text-truncate" title="<?= htmlspecialchars($prod['name']) ?>"><?= htmlspecialchars($prod['name']) ?></h6>
                                        <small class="text-muted text-truncate d-block mb-2" style="font-size: 0.75rem;"><?= htmlspecialchars($prod['supplier_name'] ?? 'In Stock') ?></small>
                                    </div>
                                    <div>
                                        <div class="fw-bold text-primary fs-5 mb-2">RM <?= number_format($prod['price'], 2) ?></div>
                                        <button class="btn btn-sm btn-outline-primary w-100">
                                            <i class="fas fa-plus me-1"></i> Add to Bill
                                        </button>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- RIGHT COLUMN: Current Bill Cart & Checkout Panel -->
                    <div class="pos-cart-panel">
                        <div class="pos-cart-header">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <h6 class="fw-bold mb-0"><i class="fas fa-receipt text-primary me-2"></i> <?= __('current_bill') ?></h6>
                                <div class="btn-group btn-group-sm">
                                    <button class="btn btn-outline-danger btn-sm" onclick="clearCurrentCart()" title="Clear bill">
                                        <i class="fas fa-trash-alt me-1"></i> <?= __('clear_bill') ?>
                                    </button>
                                </div>
                            </div>
                            <!-- Multi-cart Draft Tabs -->
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn btn-sm btn-primary cart-tab-btn active" data-tab="1" onclick="switchCartTab(1)">
                                    <i class="fas fa-user me-1"></i> Customer 1 <span class="badge bg-white text-dark ms-1" id="tab1Count">0</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-light border cart-tab-btn" data-tab="2" onclick="switchCartTab(2)">
                                    <i class="fas fa-user me-1"></i> Customer 2 <span class="badge bg-secondary ms-1" id="tab2Count">0</span>
                                </button>
                                <button type="button" class="btn btn-sm btn-light border cart-tab-btn" data-tab="3" onclick="switchCartTab(3)">
                                    <i class="fas fa-user me-1"></i> Customer 3 <span class="badge bg-secondary ms-1" id="tab3Count">0</span>
                                </button>
                            </div>
                        </div>

                        <!-- Cart Items List Container -->
                        <div class="pos-cart-items" id="cartContainer">
                            <div class="text-center py-5 text-muted">
                                <i class="fas fa-cart-shopping fa-3x opacity-25 mb-3 d-block"></i>
                                <p class="mb-0 fw-medium"><?= __('no_items') ?></p>
                                <small>Scan barcode or click items to add</small>
                            </div>
                        </div>

                        <!-- Pricing Summary & Checkout -->
                        <div class="pos-cart-summary">
                            <div class="d-flex justify-content-between align-items-center mb-1 small text-muted">
                                <span><?= __('subtotal') ?></span>
                                <span id="subtotalDisplay" class="fw-semibold">RM 0.00</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-1 small text-muted">
                                <span>Tax (<?= $storeProfile['tax_rate'] ?>%)</span>
                                <span id="taxDisplay" class="fw-semibold">RM 0.00</span>
                            </div>
                            <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
                                <span class="fw-bold fs-5"><?= __('total') ?></span>
                                <span class="fw-extrabold text-primary fs-4" id="grandTotalDisplay">RM 0.00</span>
                            </div>

                            <!-- Payment Method Selector -->
                            <div class="row g-2 mb-2">
                                <div class="col-6">
                                    <label class="form-label small fw-bold text-muted mb-1"><?= __('payment_method') ?></label>
                                    <select id="paymentMethodSelect" class="form-select form-select-sm" onchange="handlePaymentMethodChange()">
                                        <option value="Cash">Cash (Tunai)</option>
                                        <option value="Card">Credit / Debit Card</option>
                                        <option value="DuitNow QR">DuitNow QR Pay</option>
                                        <option value="E-Wallet">Touch 'n Go / E-Wallet</option>
                                    </select>
                                </div>
                                <div class="col-6" id="cashInputContainer">
                                    <label class="form-label small fw-bold text-muted mb-1">Cash Received (RM)</label>
                                    <input type="number" id="cashReceivedInput" class="form-control form-control-sm text-end fw-bold" placeholder="0.00" step="0.05" oninput="calculateChange()">
                                </div>
                            </div>

                            <!-- Quick Cash Denomination Buttons -->
                            <div class="d-flex gap-1 mb-2" id="quickCashButtons">
                                <button type="button" class="btn btn-sm btn-light border flex-grow-1 p-1 small" onclick="setCashReceived('exact')">Exact</button>
                                <button type="button" class="btn btn-sm btn-light border flex-grow-1 p-1 small" onclick="setCashReceived(5)">RM5</button>
                                <button type="button" class="btn btn-sm btn-light border flex-grow-1 p-1 small" onclick="setCashReceived(10)">RM10</button>
                                <button type="button" class="btn btn-sm btn-light border flex-grow-1 p-1 small" onclick="setCashReceived(20)">RM20</button>
                                <button type="button" class="btn btn-sm btn-light border flex-grow-1 p-1 small" onclick="setCashReceived(50)">RM50</button>
                                <button type="button" class="btn btn-sm btn-light border flex-grow-1 p-1 small" onclick="setCashReceived(100)">RM100</button>
                            </div>

                            <!-- Change Display Box -->
                            <div id="changeContainer" class="p-2 mb-3 bg-body rounded-3 border d-flex justify-content-between align-items-center">
                                <span class="fw-bold small text-muted">Change to Return:</span>
                                <span id="changeDisplay" class="fw-bold text-success fs-5">RM 0.00</span>
                            </div>

                            <!-- Pay Now Button -->
                            <button type="button" id="payNowBtn" class="btn btn-success w-100 py-2 fw-bold shadow" onclick="submitCheckout()">
                                <i class="fas fa-check-circle me-2"></i> <?= __('complete_payment') ?>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <!-- Print & Photocopy Service Calculation Modal -->
    <div class="modal fade" id="serviceModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <div class="modal-header border-bottom pb-3">
                    <h5 class="modal-title fw-bold" id="serviceModalTitle">
                        <i class="fas fa-print text-primary me-2"></i> Print / Photocopy Calculator
                    </h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body py-3">
                    <input type="hidden" id="serviceProductId">
                    
                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted"><?= __('print_type') ?></label>
                        <select id="servicePrintType" class="form-select" onchange="calculateServicePrice()">
                            <option value="Black & White" data-multiplier="1.0">Black & White (Hitam Putih)</option>
                            <option value="Color" data-multiplier="2.0">Full Color (Berwarna) (2x)</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted"><?= __('paper_type') ?></label>
                        <select id="servicePaperType" class="form-select" onchange="calculateServicePrice()">
                            <option value="A4 70gsm" data-price="0.10">A4 70gsm Standard Paper (RM 0.10 / pg)</option>
                            <option value="A4 80gsm" data-price="0.15" selected>A4 80gsm Premium Paper (RM 0.15 / pg)</option>
                            <option value="A3 80gsm" data-price="0.30">A3 80gsm Large Paper (RM 0.30 / pg)</option>
                            <option value="Glossy / Photo Paper" data-price="1.00">Glossy / Photo Paper (RM 1.00 / pg)</option>
                            <option value="Art Card 260gsm" data-price="1.50">Art Card 260gsm (RM 1.50 / pg)</option>
                        </select>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted"><?= __('finishing') ?></label>
                        <select id="serviceFinishing" class="form-select" onchange="calculateServicePrice()">
                            <option value="None" data-price="0.00">No Binding / Loose Pages (RM 0.00)</option>
                            <option value="Corner Staple" data-price="0.20">Corner Staple (RM 0.20)</option>
                            <option value="Comb Binding" data-price="2.50">Comb Binding with Plastic Cover (RM 2.50)</option>
                            <option value="Wire Binding" data-price="4.00">Wire-O Binding (RM 4.00)</option>
                            <option value="Thermal Lamination" data-price="1.50">Thermal Lamination (RM 1.50 / copy)</option>
                        </select>
                    </div>

                    <div class="row g-2 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted"><?= __('pages_count') ?></label>
                            <input type="number" id="servicePages" class="form-control text-center fw-bold" value="1" min="1" oninput="calculateServicePrice()">
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted"><?= __('copies_count') ?></label>
                            <input type="number" id="serviceCopies" class="form-control text-center fw-bold" value="1" min="1" oninput="calculateServicePrice()">
                        </div>
                    </div>

                    <div class="p-3 bg-body rounded-3 border text-center">
                        <span class="text-muted small">Estimated Service Total:</span>
                        <div class="text-primary fw-extrabold fs-3 mt-1" id="serviceTotalDisplay">RM 0.15</div>
                    </div>
                </div>
                <div class="modal-footer border-top pt-2">
                    <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                    <button type="button" class="btn btn-primary fw-bold" onclick="addServiceToCart()">
                        <i class="fas fa-plus me-1"></i> <?= __('add_to_bill') ?>
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- DuitNow QR Pay Modal -->
    <div class="modal fade" id="qrModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern text-center p-3">
                <h6 class="fw-bold mb-2">Scan DuitNow QR Code</h6>
                <div class="p-3 bg-white rounded-3 border d-inline-block mx-auto mb-2">
                    <!-- SVG QR Code Icon Placeholder / Real QR Representation -->
                    <div style="width: 180px; height: 180px; background: #f1f5f9; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 8px;">
                        <i class="fas fa-qrcode fa-5x text-dark mb-2"></i>
                        <span class="fw-bold small text-danger">DuitNow QR</span>
                        <span class="text-muted" style="font-size: 0.65rem;">Nolan Printing Services</span>
                    </div>
                </div>
                <div class="fw-bold fs-5 text-primary mb-3" id="qrAmountDisplay">RM 0.00</div>
                <button type="button" class="btn btn-success w-100 fw-bold" data-bs-dismiss="modal" onclick="processCheckoutAfterQR()">
                    <i class="fas fa-check me-1"></i> Payment Received
                </button>
            </div>
        </div>
    </div>

    <!-- Post-Payment Receipt & Success Modal -->
    <div class="modal fade" id="successModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0 text-center p-4">
                <div class="stat-icon bg-success bg-opacity-10 text-success mx-auto mb-3" style="width: 64px; height: 64px; font-size: 2rem;">
                    <i class="fas fa-check"></i>
                </div>
                <h4 class="fw-bold mb-1">Payment Successful!</h4>
                <p class="text-muted small mb-3">Transaction <span class="fw-bold text-dark" id="successSaleId">#0</span> has been recorded.</p>
                
                <div class="p-3 bg-body rounded-3 border mb-4 text-start">
                    <div class="d-flex justify-content-between mb-1 small">
                        <span class="text-muted">Total Paid:</span>
                        <span class="fw-bold" id="successTotal">RM 0.00</span>
                    </div>
                    <div class="d-flex justify-content-between mb-1 small">
                        <span class="text-muted">Cash Received:</span>
                        <span class="fw-bold" id="successCash">RM 0.00</span>
                    </div>
                    <div class="d-flex justify-content-between pt-1 border-top">
                        <span class="fw-bold text-muted">Change Given:</span>
                        <span class="fw-bold text-success fs-5" id="successChange">RM 0.00</span>
                    </div>
                </div>

                <div class="row g-2">
                    <div class="col-6">
                        <a href="#" id="receiptBtn" target="_blank" class="btn btn-primary w-100 py-2 fw-bold">
                            <i class="fas fa-print me-1"></i> <?= __('print_receipt') ?>
                        </a>
                    </div>
                    <div class="col-6">
                        <a href="#" id="whatsappBtn" target="_blank" class="btn btn-success w-100 py-2 fw-bold">
                            <i class="fab fa-whatsapp me-1"></i> WhatsApp
                        </a>
                    </div>
                    <div class="col-12 mt-2">
                        <button type="button" class="btn btn-light w-100 py-2" data-bs-dismiss="modal" onclick="resetPOS()">
                            <i class="fas fa-arrow-rotate-right me-1"></i> <?= __('new_sale') ?>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>

    <script>
        // Multi-Cart State Storage (Cart 1, Cart 2, Cart 3)
        let activeTab = 1;
        const carts = { 1: [], 2: [], 3: [] };

        const allProducts = <?= json_encode($products) ?>;
        const taxRate = <?= (float)$storeProfile['tax_rate'] ?>;
        const csrfToken = '<?= getCsrfToken() ?>';

        // Cart Item Structure:
        // { id, name, price, stock, quantity, supplier, is_service, service_product_id, details }

        function getCurrentCart() {
            return carts[activeTab];
        }

        function switchCartTab(tab) {
            activeTab = tab;
            document.querySelectorAll('.cart-tab-btn').forEach(btn => {
                const isCur = parseInt(btn.dataset.tab) === tab;
                btn.className = `btn btn-sm ${isCur ? 'btn-primary active' : 'btn-light border'} cart-tab-btn`;
            });
            renderCart();
        }

        function updateTabBadges() {
            document.getElementById('tab1Count').innerText = carts[1].reduce((sum, i) => sum + i.quantity, 0);
            document.getElementById('tab2Count').innerText = carts[2].reduce((sum, i) => sum + i.quantity, 0);
            document.getElementById('tab3Count').innerText = carts[3].reduce((sum, i) => sum + i.quantity, 0);
        }

        function addToCart(id, name, price, stock, supplier) {
            const cart = getCurrentCart();
            const existing = cart.find(item => !item.is_service && item.id === id);

            if (existing) {
                if (existing.quantity + 1 > stock) {
                    showToast(`Cannot add more. Maximum available stock is ${stock}.`, 'warning');
                    if (window.AudioEffects) AudioEffects.beepError();
                    return;
                }
                existing.quantity++;
            } else {
                if (stock < 1) {
                    showToast('Item is out of stock.', 'danger');
                    if (window.AudioEffects) AudioEffects.beepError();
                    return;
                }
                cart.push({
                    id: id,
                    name: name,
                    price: parseFloat(price),
                    stock: parseInt(stock),
                    quantity: 1,
                    supplier: supplier,
                    is_service: false
                });
            }

            if (window.AudioEffects) AudioEffects.beepScan();
            renderCart();
        }

        function updateCartItemQty(index, delta) {
            const cart = getCurrentCart();
            if (!cart[index]) return;

            const item = cart[index];
            const newQty = item.quantity + delta;

            if (newQty <= 0) {
                cart.splice(index, 1);
            } else {
                if (!item.is_service && newQty > item.stock) {
                    showToast(`Stock limit reached (${item.stock} units available).`, 'warning');
                    return;
                }
                item.quantity = newQty;
            }
            renderCart();
        }

        function removeCartItem(index) {
            const cart = getCurrentCart();
            if (cart[index]) {
                cart.splice(index, 1);
                renderCart();
            }
        }

        function clearCurrentCart() {
            const cart = getCurrentCart();
            if (cart.length === 0) return;
            if (confirm('<?= addslashes(__("confirm_clear_cart")) ?>')) {
                carts[activeTab] = [];
                renderCart();
            }
        }

        function renderCart() {
            updateTabBadges();
            const cart = getCurrentCart();
            const container = document.getElementById('cartContainer');

            if (cart.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-5 text-muted">
                        <i class="fas fa-cart-shopping fa-3x opacity-25 mb-3 d-block"></i>
                        <p class="mb-0 fw-medium"><?= addslashes(__('no_items')) ?></p>
                        <small>Scan barcode or click items to add</small>
                    </div>`;
                updateSummary(0);
                return;
            }

            let html = '<div class="list-group list-group-flush">';
            let subtotal = 0;

            cart.forEach((item, idx) => {
                const itemTotal = item.price * item.quantity;
                subtotal += itemTotal;

                const detailBadge = item.is_service 
                    ? `<div class="small text-muted fst-italic">${item.details}</div>`
                    : `<div class="small text-muted">${item.supplier || 'Standard Item'} &bull; RM ${item.price.toFixed(2)}/ea</div>`;

                html += `
                    <div class="list-group-item px-2 py-2 d-flex align-items-center justify-content-between border-bottom">
                        <div class="text-truncate me-2" style="max-width: 200px;">
                            <div class="fw-bold text-truncate" style="font-size: 0.88rem;">${item.name}</div>
                            ${detailBadge}
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="fw-bold text-primary small" style="min-width: 65px; text-align: right;">RM ${itemTotal.toFixed(2)}</span>
                            <div class="btn-group btn-group-sm">
                                <button type="button" class="btn btn-light border px-2 py-0" onclick="updateCartItemQty(${idx}, -1)">-</button>
                                <span class="btn btn-light border px-2 py-0 fw-bold disabled" style="color: var(--text-main);">${item.quantity}</span>
                                <button type="button" class="btn btn-light border px-2 py-0" onclick="updateCartItemQty(${idx}, 1)">+</button>
                            </div>
                            <button type="button" class="btn btn-sm btn-link text-danger p-0 ms-1" onclick="removeCartItem(${idx})" title="Remove">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>`;
            });

            html += '</div>';
            container.innerHTML = html;
            updateSummary(subtotal);
        }

        function updateSummary(subtotal) {
            const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
            const grandTotal = subtotal + tax;

            document.getElementById('subtotalDisplay').innerText = `RM ${subtotal.toFixed(2)}`;
            document.getElementById('taxDisplay').innerText = `RM ${tax.toFixed(2)}`;
            document.getElementById('grandTotalDisplay').innerText = `RM ${grandTotal.toFixed(2)}`;

            calculateChange();
        }

        // Cash & Change Calculations
        function handlePaymentMethodChange() {
            const method = document.getElementById('paymentMethodSelect').value;
            const cashBox = document.getElementById('cashInputContainer');
            const quickCash = document.getElementById('quickCashButtons');
            const changeBox = document.getElementById('changeContainer');

            const isCash = method === 'Cash';
            cashBox.style.display = isCash ? 'block' : 'none';
            quickCash.style.display = isCash ? 'flex' : 'none';
            changeBox.style.display = isCash ? 'flex' : 'none';
        }

        function setCashReceived(val) {
            const grandTotalStr = document.getElementById('grandTotalDisplay').innerText.replace('RM ', '');
            const grandTotal = parseFloat(grandTotalStr) || 0;

            const input = document.getElementById('cashReceivedInput');
            if (val === 'exact') {
                input.value = grandTotal.toFixed(2);
            } else {
                input.value = parseFloat(val).toFixed(2);
            }
            calculateChange();
        }

        function calculateChange() {
            const grandTotalStr = document.getElementById('grandTotalDisplay').innerText.replace('RM ', '');
            const grandTotal = parseFloat(grandTotalStr) || 0;

            const cashInput = document.getElementById('cashReceivedInput');
            const cashReceived = parseFloat(cashInput.value) || 0;

            const change = Math.max(0, cashReceived - grandTotal);
            document.getElementById('changeDisplay').innerText = `RM ${change.toFixed(2)}`;
        }

        // Barcode Scanner Listener
        document.getElementById('barcodeInput').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const code = this.value.trim();
                if (!code) return;

                const product = allProducts.find(p => p.barcode === code);
                if (product) {
                    addToCart(product.id, product.name, product.price, product.stock, product.supplier_name);
                    this.value = '';
                } else {
                    showToast(`Barcode '${code}' not found in catalog.`, 'warning');
                    if (window.AudioEffects) AudioEffects.beepError();
                    this.select();
                }
            }
        });

        // Search & Filter Listeners
        const searchInput = document.getElementById('searchInput');
        let selectedCategory = 'all';

        function filterProducts() {
            const term = searchInput.value.toLowerCase().trim();

            document.querySelectorAll('.product-pos-card').forEach(card => {
                const name = card.dataset.name || '';
                const category = card.dataset.category || '';
                const barcode = card.dataset.barcode || '';

                const matchesSearch = !term || name.includes(term) || barcode.includes(term);
                const matchesCategory = selectedCategory === 'all' || category === selectedCategory;

                card.style.display = (matchesSearch && matchesCategory) ? 'flex' : 'none';
            });
        }

        searchInput.addEventListener('input', filterProducts);

        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', function() {
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                selectedCategory = this.dataset.category;
                filterProducts();
            });
        });

        // Service Calculator Modal Logic
        const serviceModal = new bootstrap.Modal(document.getElementById('serviceModal'));

        function openServiceCalculator(productId, serviceName) {
            document.getElementById('serviceProductId').value = productId;
            document.getElementById('serviceModalTitle').innerHTML = `<i class="fas fa-print text-primary me-2"></i> ${serviceName}`;
            calculateServicePrice();
            serviceModal.show();
        }

        function calculateServicePrice() {
            const printType = document.getElementById('servicePrintType');
            const multiplier = parseFloat(printType.options[printType.selectedIndex].dataset.multiplier) || 1.0;

            const paperType = document.getElementById('servicePaperType');
            const paperPrice = parseFloat(paperType.options[paperType.selectedIndex].dataset.price) || 0.15;

            const finishing = document.getElementById('serviceFinishing');
            const finishPrice = parseFloat(finishing.options[finishing.selectedIndex].dataset.price) || 0.00;

            const pages = Math.max(1, parseInt(document.getElementById('servicePages').value) || 1);
            const copies = Math.max(1, parseInt(document.getElementById('serviceCopies').value) || 1);

            const printCostPerPage = paperPrice * multiplier;
            const totalForOneCopy = (printCostPerPage * pages) + finishPrice;
            const grandTotal = totalForOneCopy * copies;

            document.getElementById('serviceTotalDisplay').innerText = `RM ${grandTotal.toFixed(2)}`;
            return { printCostPerPage, finishPrice, grandTotal, pages, copies, printType: printType.value, paperType: paperType.value, finishing: finishing.value };
        }

        function addServiceToCart() {
            const calc = calculateServicePrice();
            const serviceId = document.getElementById('serviceProductId').value;
            const serviceName = document.getElementById('serviceModalTitle').innerText.trim();

            const cart = getCurrentCart();
            cart.push({
                id: `srv_${Date.now()}`,
                service_product_id: serviceId,
                name: serviceName,
                price: calc.grandTotal / calc.copies,
                quantity: calc.copies,
                is_service: true,
                details: `${calc.pages} pg (${calc.printType}, ${calc.paperType}${calc.finishing !== 'None' ? ', ' + calc.finishing : ''})`
            });

            serviceModal.hide();
            if (window.AudioEffects) AudioEffects.beepScan();
            renderCart();
        }

        // Checkout & Payment Processing
        function submitCheckout() {
            const cart = getCurrentCart();
            if (cart.length === 0) {
                showToast('<?= addslashes(__("no_items")) ?>', 'warning');
                return;
            }

            const paymentMethod = document.getElementById('paymentMethodSelect').value;
            const grandTotalStr = document.getElementById('grandTotalDisplay').innerText.replace('RM ', '');
            const grandTotal = parseFloat(grandTotalStr) || 0;

            if (paymentMethod === 'Cash') {
                const cashInput = document.getElementById('cashReceivedInput');
                const cashReceived = parseFloat(cashInput.value) || 0;

                if (cashReceived < grandTotal) {
                    showToast('Cash received is less than total amount.', 'danger');
                    cashInput.focus();
                    return;
                }
                executeCheckout();
            } else if (paymentMethod === 'DuitNow QR') {
                document.getElementById('qrAmountDisplay').innerText = `RM ${grandTotal.toFixed(2)}`;
                const qrModal = new bootstrap.Modal(document.getElementById('qrModal'));
                qrModal.show();
            } else {
                executeCheckout();
            }
        }

        function processCheckoutAfterQR() {
            executeCheckout();
        }

        function executeCheckout() {
            const cart = getCurrentCart();
            const paymentMethod = document.getElementById('paymentMethodSelect').value;
            const grandTotalStr = document.getElementById('grandTotalDisplay').innerText.replace('RM ', '');
            const grandTotal = parseFloat(grandTotalStr) || 0;

            const cashInput = document.getElementById('cashReceivedInput');
            const cashReceived = paymentMethod === 'Cash' ? (parseFloat(cashInput.value) || grandTotal) : grandTotal;

            const payBtn = document.getElementById('payNowBtn');
            payBtn.disabled = true;
            payBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Processing Sale...`;

            const payload = {
                action: 'checkout',
                csrf_token: csrfToken,
                items: cart,
                payment_method: paymentMethod,
                cash_received: cashReceived,
                tax_rate: taxRate,
                discount_amount: 0
            };

            fetch('pos.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(data => {
                payBtn.disabled = false;
                payBtn.innerHTML = `<i class="fas fa-check-circle me-2"></i> <?= addslashes(__('complete_payment')) ?>`;

                if (data.success) {
                    if (window.AudioEffects) AudioEffects.beepSuccess();
                    
                    // Populate and trigger Success Modal
                    document.getElementById('successSaleId').innerText = `#${data.saleId}`;
                    document.getElementById('successTotal').innerText = `RM ${parseFloat(data.grandTotal).toFixed(2)}`;
                    document.getElementById('successCash').innerText = `RM ${parseFloat(data.cashReceived).toFixed(2)}`;
                    document.getElementById('successChange').innerText = `RM ${parseFloat(data.change).toFixed(2)}`;
                    
                    document.getElementById('receiptBtn').href = `receipt.php?id=${data.saleId}`;
                    const waText = encodeURIComponent(`*Nolan Printing Services*\nReceipt #${data.saleId}\nTotal: RM ${parseFloat(data.grandTotal).toFixed(2)}\nThank you for your business!`);
                    document.getElementById('whatsappBtn').href = `https://wa.me/?text=${waText}`;

                    // Clear current cart tab
                    carts[activeTab] = [];
                    renderCart();

                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                } else {
                    if (window.AudioEffects) AudioEffects.beepError();
                    showToast(data.message || 'Checkout failed. Please try again.', 'danger');
                }
            })
            .catch(err => {
                payBtn.disabled = false;
                payBtn.innerHTML = `<i class="fas fa-check-circle me-2"></i> <?= addslashes(__('complete_payment')) ?>`;
                showToast('Network error during checkout.', 'danger');
            });
        }

        function resetPOS() {
            document.getElementById('barcodeInput').value = '';
            document.getElementById('cashReceivedInput').value = '';
            document.getElementById('barcodeInput').focus();
        }
    </script>
</body>
</html>