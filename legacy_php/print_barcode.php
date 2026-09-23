<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}
if ($_SESSION['role'] === 'cashier') { 
    die("Access Denied: Cashiers do not have access."); 
}

$store = getStoreProfile($pdo);

// Fetch products with barcodes
$products = $pdo->query("SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.status = 'active' AND p.is_service = 0 ORDER BY p.name ASC")->fetchAll();

$selectedIds = $_GET['items'] ?? [];
if (!is_array($selectedIds)) {
    $selectedIds = !empty($selectedIds) ? explode(',', $selectedIds) : [];
}

$pageTitle = __('print_barcodes');
$pageSubtitle = 'Generate & Print Product Barcode Labels';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('print_barcodes') ?> | <?= __('app_name') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/app.css">
    <style>
        .barcode-sheet {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
            gap: 12px;
            padding: 10px;
        }

        .barcode-label {
            background: #ffffff;
            color: #000000;
            border: 1px dashed #cbd5e1;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
            font-family: 'Plus Jakarta Sans', sans-serif;
            page-break-inside: avoid;
        }

        .label-store {
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin-bottom: 2px;
        }

        .label-name {
            font-size: 11px;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 4px;
            height: 26px;
            overflow: hidden;
        }

        .label-price {
            font-size: 13px;
            font-weight: 800;
            color: #000000;
            margin-top: 2px;
        }

        .barcode-svg {
            max-width: 100%;
            height: 38px;
        }

        @media print {
            body {
                background: #ffffff !important;
                padding: 0 !important;
            }
            .sidebar, .topbar, .no-print {
                display: none !important;
            }
            .main-content-wrapper {
                margin-left: 0 !important;
            }
            .content-body {
                padding: 0 !important;
            }
            .barcode-sheet {
                grid-template-columns: repeat(3, 1fr) !important;
                gap: 8px !important;
                padding: 0 !important;
            }
            .barcode-label {
                border: 1px solid #000000 !important;
            }
        }
    </style>
</head>
<body>
    <div class="app-wrapper">
        <?php include 'sidebar.php'; ?>

        <div class="main-content-wrapper">
            <?php include 'header.php'; ?>

            <main class="content-body">
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4 no-print">
                    <div>
                        <h4 class="fw-bold mb-1"><?= __('print_barcodes') ?></h4>
                        <p class="text-muted small mb-0">Generate sticker price tags with scannable barcodes</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary shadow-sm" onclick="window.print()">
                            <i class="fas fa-print me-1"></i> Print Labels
                        </button>
                        <a href="inventory.php" class="btn btn-outline-secondary">
                            &larr; Back to Inventory
                        </a>
                    </div>
                </div>

                <!-- Product Selector & Controls (Screen only) -->
                <div class="card-modern p-3 mb-4 no-print">
                    <div class="row g-3 align-items-center">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">Filter Products for Label Sheet</label>
                            <input type="text" id="labelSearch" class="form-control" placeholder="Type to filter products...">
                        </div>
                        <div class="col-md-6 text-md-end">
                            <span class="text-muted small me-3">Showing <strong id="visibleCount"><?= count($products) ?></strong> label(s)</span>
                            <button class="btn btn-sm btn-outline-primary" onclick="setLabelsPerRow(3)">3 per row</button>
                            <button class="btn btn-sm btn-outline-primary" onclick="setLabelsPerRow(4)">4 per row</button>
                        </div>
                    </div>
                </div>

                <!-- Printable Labels Sheet -->
                <div class="barcode-sheet" id="labelContainer">
                    <?php foreach ($products as $p): ?>
                        <div class="barcode-label label-item" data-name="<?= strtolower(htmlspecialchars($p['name'])) ?>" data-barcode="<?= htmlspecialchars($p['barcode'] ?? '') ?>">
                            <div class="label-store"><?= htmlspecialchars($store['shop_name']) ?></div>
                            <div class="label-name"><?= htmlspecialchars($p['name']) ?></div>
                            <svg class="barcode-svg" data-barcode="<?= htmlspecialchars($p['barcode'] ?? '123456') ?>"></svg>
                            <div class="label-price">RM <?= number_format($p['price'], 2) ?></div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            // Render all SVG Barcodes using JsBarcode
            document.querySelectorAll('.barcode-svg').forEach(svg => {
                const code = svg.dataset.barcode;
                if (code) {
                    try {
                        JsBarcode(svg, code, {
                            format: "CODE128",
                            width: 1.5,
                            height: 32,
                            displayValue: true,
                            fontSize: 10,
                            margin: 2
                        });
                    } catch (e) {
                        console.error("Barcode generation error", e);
                    }
                }
            });

            // Filter products
            document.getElementById('labelSearch').addEventListener('input', function() {
                const term = this.value.toLowerCase().trim();
                let count = 0;
                document.querySelectorAll('.label-item').forEach(item => {
                    const name = item.dataset.name;
                    const code = item.dataset.barcode;
                    if (!term || name.includes(term) || code.includes(term)) {
                        item.style.display = 'block';
                        count++;
                    } else {
                        item.style.display = 'none';
                    }
                });
                document.getElementById('visibleCount').innerText = count;
            });
        });

        function setLabelsPerRow(num) {
            document.getElementById('labelContainer').style.gridTemplateColumns = `repeat(${num}, 1fr)`;
        }
    </script>
</body>
</html>
