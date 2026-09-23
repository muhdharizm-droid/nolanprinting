<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    die("Unauthorized access. Please log in."); 
}
if ($_SESSION['role'] === 'stock_handler') { 
    die("Access Denied."); 
}

if (!isset($_GET['id']) || !is_numeric($_GET['id'])) { 
    die("Invalid Sale ID."); 
}

$saleId = (int)$_GET['id'];
$store = getStoreProfile($pdo);

// Fetch Sale info
$stmt = $pdo->prepare("SELECT s.*, u.username, u.full_name FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?");
$stmt->execute([$saleId]);
$sale = $stmt->fetch();

if (!$sale) { 
    die("Sale record not found."); 
}

// Fetch sale items with saved historical sale price and customization details
$itemStmt = $pdo->prepare("SELECT si.*, p.name as product_name, p.barcode 
    FROM sale_items si 
    LEFT JOIN products p ON si.product_id = p.id 
    WHERE si.sale_id = ? 
    ORDER BY si.id ASC");
$itemStmt->execute([$saleId]);
$items = $itemStmt->fetchAll();

$subtotal = (float)$sale['subtotal'];
if ($subtotal <= 0) {
    // Fallback calculation for older records
    foreach ($items as $item) {
        $subtotal += ($item['price_at_sale'] * $item['quantity']);
    }
}
$taxAmount = (float)$sale['tax_amount'];
$discountAmount = (float)$sale['discount_amount'];
$grandTotal = (float)$sale['total'];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Receipt #<?= $saleId ?> - Nolan Printing</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');

        body {
            background-color: #f1f5f9;
            font-family: 'Courier Prime', Courier, monospace;
            color: #000000;
            padding: 20px 10px;
        }

        .receipt-container {
            width: 100%;
            max-width: 380px;
            margin: 0 auto;
            background: #ffffff;
            padding: 24px 20px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
            border-radius: 8px;
            border: 1px solid #e2e8f0;
        }

        .receipt-header {
            text-align: center;
            margin-bottom: 12px;
        }

        .receipt-logo {
            max-height: 45px;
            width: auto;
            margin-bottom: 8px;
            filter: grayscale(100%);
        }

        .store-title {
            font-size: 16px;
            font-weight: 700;
            letter-spacing: 0.5px;
            margin-bottom: 2px;
        }

        .store-info {
            font-size: 11px;
            line-height: 1.4;
            color: #333;
        }

        .receipt-divider {
            border-top: 1px dashed #000;
            margin: 10px 0;
        }

        .receipt-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }

        .receipt-table th {
            text-align: left;
            padding: 4px 0;
            border-bottom: 1px solid #000;
            font-weight: 700;
        }

        .receipt-table td {
            padding: 6px 0 4px;
            vertical-align: top;
        }

        .text-right {
            text-align: right;
        }

        .text-center {
            text-align: center;
        }

        .item-details {
            font-size: 10px;
            color: #444;
            padding-left: 6px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            padding: 2px 0;
        }

        .grand-total-row {
            display: flex;
            justify-content: space-between;
            font-size: 16px;
            font-weight: 700;
            padding: 6px 0;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            margin: 6px 0;
        }

        .receipt-footer {
            text-align: center;
            font-size: 11px;
            margin-top: 15px;
            line-height: 1.4;
        }

        /* Action Buttons Panel */
        .actions-panel {
            max-width: 380px;
            margin: 20px auto 0;
            font-family: 'Plus Jakarta Sans', sans-serif;
        }

        @media print {
            body {
                background: #ffffff !important;
                padding: 0 !important;
                margin: 0 !important;
            }
            .receipt-container {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                max-width: 100% !important;
                width: 100% !important;
            }
            .no-print {
                display: none !important;
            }
        }
    </style>
</head>
<body>

    <div class="receipt-container">
        <!-- Store Branding Header -->
        <div class="receipt-header">
            <img src="images/logo.jpeg" alt="Logo" class="receipt-logo">
            <div class="store-title"><?= htmlspecialchars($store['shop_name']) ?></div>
            <div class="store-info">
                Reg: <?= htmlspecialchars($store['shop_reg_no']) ?><br>
                <?= htmlspecialchars($store['shop_address']) ?><br>
                Tel: <?= htmlspecialchars($store['shop_phone']) ?>
            </div>
        </div>

        <div class="receipt-divider"></div>

        <!-- Receipt Metadata -->
        <div style="font-size: 11px; line-height: 1.5;">
            <div class="d-flex justify-content-between">
                <span>Receipt: <strong>#<?= sprintf('%06d', $saleId) ?></strong></span>
                <span><?= date('d/m/Y', strtotime($sale['created_at'])) ?></span>
            </div>
            <div class="d-flex justify-content-between">
                <span>Cashier: <?= htmlspecialchars($sale['username'] ?? 'Staff') ?></span>
                <span><?= date('h:i A', strtotime($sale['created_at'])) ?></span>
            </div>
            <div>Payment: <strong><?= htmlspecialchars($sale['payment_method']) ?></strong></div>
        </div>

        <div class="receipt-divider"></div>

        <!-- Purchased Line Items -->
        <table class="receipt-table">
            <thead>
                <tr>
                    <th style="width: 50%;">Item</th>
                    <th class="text-center" style="width: 15%;">Qty</th>
                    <th class="text-right" style="width: 15%;">Price</th>
                    <th class="text-right" style="width: 20%;">Total</th>
                </tr>
            </thead>
            <tbody>
                <?php foreach ($items as $item): 
                    $lineTotal = $item['price_at_sale'] * $item['quantity'];
                ?>
                <tr>
                    <td>
                        <strong><?= htmlspecialchars($item['product_name'] ?? 'Custom Service') ?></strong>
                        <?php if (!empty($item['details'])): ?>
                            <div class="item-details">&bull; <?= htmlspecialchars($item['details']) ?></div>
                        <?php endif; ?>
                    </td>
                    <td class="text-center"><?= $item['quantity'] ?></td>
                    <td class="text-right"><?= number_format($item['price_at_sale'], 2) ?></td>
                    <td class="text-right"><?= number_format($lineTotal, 2) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <div class="receipt-divider"></div>

        <!-- Summary & Totals -->
        <div class="summary-row">
            <span>Subtotal:</span>
            <span>RM <?= number_format($subtotal, 2) ?></span>
        </div>

        <?php if ($discountAmount > 0): ?>
        <div class="summary-row">
            <span>Discount:</span>
            <span>- RM <?= number_format($discountAmount, 2) ?></span>
        </div>
        <?php endif; ?>

        <?php if ($taxAmount > 0): ?>
        <div class="summary-row">
            <span>Tax (<?= $store['tax_rate'] ?>%):</span>
            <span>RM <?= number_format($taxAmount, 2) ?></span>
        </div>
        <?php endif; ?>

        <div class="grand-total-row">
            <span>TOTAL:</span>
            <span>RM <?= number_format($grandTotal, 2) ?></span>
        </div>

        <!-- Footer Message -->
        <div class="receipt-footer">
            <p style="margin-bottom: 4px;"><?= htmlspecialchars($store['receipt_msg']) ?></p>
            <p style="margin-bottom: 0; font-size: 10px; color: #555;">Goods sold are non-refundable.<br>Thank you for your visit!</p>
        </div>
    </div>

    <!-- Screen Buttons & Action Panel (Hidden when printing) -->
    <div class="actions-panel no-print">
        <div class="row g-2 mb-2">
            <div class="col-6">
                <button onclick="window.print()" class="btn btn-primary w-100 py-2 fw-semibold">
                    <i class="fas fa-print me-1"></i> Print Receipt
                </button>
            </div>
            <div class="col-6">
                <?php 
                $waMsg = urlencode("*{$store['shop_name']}*\nReceipt #" . sprintf('%06d', $saleId) . "\nDate: " . date('d/m/Y h:i A', strtotime($sale['created_at'])) . "\nTotal: RM " . number_format($grandTotal, 2) . "\n\nThank you for choosing Nolan Printing!");
                ?>
                <a href="https://wa.me/?text=<?= $waMsg ?>" target="_blank" class="btn btn-success w-100 py-2 fw-semibold">
                    <i class="fab fa-whatsapp me-1"></i> WhatsApp
                </a>
            </div>
        </div>
        <div class="text-center">
            <button onclick="window.close()" class="btn btn-sm btn-link text-muted text-decoration-none">
                <i class="fas fa-times me-1"></i> Close Window
            </button>
        </div>
    </div>

</body>
</html>