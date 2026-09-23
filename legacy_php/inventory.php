<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}
if ($_SESSION['role'] === 'cashier') { 
    die("Access Denied: Cashiers do not have access to inventory management."); 
}

$role = $_SESSION['role'];
$msg = '';
$error = '';

// Handle POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) { 
        die("Security token mismatch."); 
    }

    $action = $_POST['action'];

    if ($action === 'add') {
        $barcode = trim($_POST['barcode'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $price = (float)($_POST['price'] ?? 0);
        $costPrice = (float)($_POST['cost_price'] ?? 0);
        $stock = max(0, (int)($_POST['stock'] ?? 0));
        $threshold = max(1, (int)($_POST['threshold'] ?? 10));
        $categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
        $supplierId = !empty($_POST['supplier_id']) ? (int)$_POST['supplier_id'] : null;

        if (empty($name)) {
            $error = "Product name is required.";
        } else {
            try {
                // Auto generate random 6-digit barcode if blank
                if (empty($barcode)) {
                    $barcode = sprintf('%06d', mt_rand(100000, 999999));
                }

                $stmt = $pdo->prepare("INSERT INTO products (barcode, name, price, cost_price, category_id, stock, threshold, supplier_id, status, is_service) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)");
                $stmt->execute([$barcode, $name, $price, $costPrice, $categoryId, $stock, $threshold, $supplierId]);
                $productId = $pdo->lastInsertId();

                if ($stock > 0) {
                    $intakeStmt = $pdo->prepare("INSERT INTO stock_intake (product_id, quantity, user_id) VALUES (?, ?, ?)");
                    $intakeStmt->execute([$productId, $stock, $_SESSION['user_id']]);
                }

                logActivity($pdo, "Product Added", "Created new product: {$name} (Barcode: {$barcode})");
                $msg = "Product '{$name}' created successfully.";
            } catch (PDOException $e) {
                $error = "Failed to add product: " . (str_contains($e->getMessage(), 'Duplicate') ? "Barcode '{$barcode}' is already in use." : $e->getMessage());
            }
        }
    } elseif ($action === 'update') {
        $id = (int)$_POST['id'];
        $barcode = trim($_POST['barcode'] ?? '');
        $name = trim($_POST['name'] ?? '');
        $price = (float)($_POST['price'] ?? 0);
        $costPrice = (float)($_POST['cost_price'] ?? 0);
        $threshold = max(1, (int)($_POST['threshold'] ?? 10));
        $categoryId = !empty($_POST['category_id']) ? (int)$_POST['category_id'] : null;
        $supplierId = !empty($_POST['supplier_id']) ? (int)$_POST['supplier_id'] : null;

        try {
            $stmt = $pdo->prepare("UPDATE products SET barcode = ?, name = ?, price = ?, cost_price = ?, category_id = ?, threshold = ?, supplier_id = ? WHERE id = ?");
            $stmt->execute([$barcode, $name, $price, $costPrice, $categoryId, $threshold, $supplierId, $id]);

            logActivity($pdo, "Product Updated", "Modified details for product #{$id} ({$name})");
            $msg = "Product '{$name}' updated successfully.";
        } catch (PDOException $e) {
            $error = "Failed to update product: " . $e->getMessage();
        }
    } elseif ($action === 'add_stock') {
        $id = (int)$_POST['id'];
        $qty = (int)$_POST['quantity'];

        if ($qty > 0) {
            try {
                $pdo->beginTransaction();
                $pName = $pdo->query("SELECT name FROM products WHERE id = {$id}")->fetchColumn();

                $stmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
                $stmt->execute([$qty, $id]);

                $intakeStmt = $pdo->prepare("INSERT INTO stock_intake (product_id, quantity, user_id) VALUES (?, ?, ?)");
                $intakeStmt->execute([$id, $qty, $_SESSION['user_id']]);

                $pdo->commit();
                logActivity($pdo, "Stock Added", "Restocked {$qty} units for: {$pName}");
                $msg = "Added {$qty} units to '{$pName}'.";
            } catch (Exception $e) {
                $pdo->rollBack();
                $error = "Failed to add stock: " . $e->getMessage();
            }
        }
    } elseif ($action === 'archive' && $role === 'owner') {
        $id = (int)$_POST['id'];
        $stmt = $pdo->prepare("UPDATE products SET status = 'archived' WHERE id = ?");
        $stmt->execute([$id]);
        logActivity($pdo, "Product Archived", "Archived product ID #{$id}");
        $msg = "Product has been moved to Archived Items.";
    } elseif ($action === 'import_csv') {
        if (isset($_FILES['csv_file']) && $_FILES['csv_file']['error'] === 0) {
            $handle = fopen($_FILES['csv_file']['tmp_name'], "r");
            fgetcsv($handle); // Skip header row
            $imported = 0;

            while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                if (count($data) < 4) continue;
                $barcode = trim($data[0] ?? '');
                $name = trim($data[1] ?? '');
                $catName = trim($data[2] ?? '');
                $price = (float)($data[3] ?? 0);
                $cost = (float)($data[4] ?? 0);
                $stock = (int)($data[5] ?? 0);
                $threshold = (int)($data[6] ?? 10);
                $supName = trim($data[7] ?? '');

                if (empty($name)) continue;

                $catId = null;
                if (!empty($catName)) {
                    $cStmt = $pdo->prepare("INSERT IGNORE INTO categories (name) VALUES (?)");
                    $cStmt->execute([$catName]);
                    $catId = $pdo->query("SELECT id FROM categories WHERE name = " . $pdo->quote($catName))->fetchColumn();
                }

                $supId = null;
                if (!empty($supName)) {
                    $sStmt = $pdo->prepare("INSERT IGNORE INTO suppliers (name) VALUES (?)");
                    $sStmt->execute([$supName]);
                    $supId = $pdo->query("SELECT id FROM suppliers WHERE name = " . $pdo->quote($supName))->fetchColumn();
                }

                if (empty($barcode)) {
                    $barcode = sprintf('%06d', mt_rand(100000, 999999));
                }

                $stmt = $pdo->prepare("INSERT INTO products (barcode, name, price, cost_price, category_id, stock, threshold, supplier_id, status, is_service) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', 0) 
                    ON DUPLICATE KEY UPDATE name=VALUES(name), price=VALUES(price), cost_price=VALUES(cost_price), category_id=VALUES(category_id), stock=VALUES(stock), threshold=VALUES(threshold), supplier_id=VALUES(supplier_id)");
                $stmt->execute([$barcode, $name, $price, $cost, $catId, $stock, $threshold, $supId]);
                $imported++;
            }
            fclose($handle);
            logActivity($pdo, "Inventory Import", "Imported {$imported} products via CSV");
            $msg = "Successfully synced {$imported} products from CSV.";
        }
    }
}

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$categoryFilter = $_GET['category'] ?? 'all';
$supplierFilter = $_GET['supplier'] ?? 'all';
$stockHealthFilter = $_GET['stock_health'] ?? 'all';

$limit = 15;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 'p.id';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$allowedSort = ['p.id', 'p.barcode', 'p.name', 'c.name', 'p.price', 'p.cost_price', 'p.stock', 'margin'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 'p.id';
}

$conditions = ["p.status = 'active'", "p.is_service = 0"];
$params = [];

if (!empty($search)) {
    $conditions[] = "(p.name LIKE ? OR p.barcode LIKE ? OR c.name LIKE ? OR s.name LIKE ?)";
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%", "%$search%"]);
}
if ($categoryFilter !== 'all') {
    $conditions[] = "p.category_id = ?";
    $params[] = (int)$categoryFilter;
}
if ($supplierFilter !== 'all') {
    $conditions[] = "p.supplier_id = ?";
    $params[] = (int)$supplierFilter;
}
if ($stockHealthFilter === 'low') {
    $conditions[] = "p.stock <= p.threshold AND p.stock > 0";
} elseif ($stockHealthFilter === 'out') {
    $conditions[] = "p.stock = 0";
} elseif ($stockHealthFilter === 'healthy') {
    $conditions[] = "p.stock > p.threshold";
}

$whereClause = "WHERE " . implode(" AND ", $conditions);

// Count Total
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id LEFT JOIN suppliers s ON p.supplier_id = s.id $whereClause");
$countStmt->execute($params);
$totalProducts = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalProducts / $limit));

// Fetch Inventory Overview Metrics
$totalStockValueCost = (float)$pdo->query("SELECT SUM(stock * cost_price) FROM products WHERE status = 'active' AND is_service = 0")->fetchColumn();
$totalStockValueRetail = (float)$pdo->query("SELECT SUM(stock * price) FROM products WHERE status = 'active' AND is_service = 0")->fetchColumn();
$lowStockCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active' AND is_service = 0 AND stock <= threshold AND stock > 0")->fetchColumn();
$outOfStockCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active' AND is_service = 0 AND stock = 0")->fetchColumn();

// Fetch products for table
$query = "SELECT p.*, s.name as supplier_name, c.name as category_name,
    (SELECT SUM(si.quantity)/30 FROM sale_items si JOIN sales sl ON si.sale_id = sl.id 
     WHERE si.product_id = p.id AND sl.status = 'completed' AND sl.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as daily_velocity 
    FROM products p 
    LEFT JOIN suppliers s ON p.supplier_id = s.id 
    LEFT JOIN categories c ON p.category_id = c.id 
    $whereClause 
    ORDER BY $sortBy $sortOrder 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$products = $stmt->fetchAll();

$categories = $pdo->query("SELECT * FROM categories ORDER BY name ASC")->fetchAll();
$suppliers = $pdo->query("SELECT * FROM suppliers ORDER BY name ASC")->fetchAll();

$pageTitle = __('inventory');
$pageSubtitle = 'Catalog, Stock Levels & Restock Management';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('inventory') ?> | <?= __('app_name') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/app.css">
</head>
<body>
    <div class="app-wrapper">
        <?php include 'sidebar.php'; ?>

        <div class="main-content-wrapper">
            <?php include 'header.php'; ?>

            <main class="content-body">
                <!-- Top Actions & Header -->
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 class="fw-bold mb-1"><?= __('inventory') ?></h4>
                        <p class="text-muted small mb-0">Manage products, pricing, stock levels, and suppliers</p>
                    </div>
                    <div class="d-flex flex-wrap gap-2">
                        <button type="button" class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addProductModal">
                            <i class="fas fa-plus me-1"></i> <?= __('add_product') ?>
                        </button>
                        <a href="print_barcode.php" class="btn btn-outline-secondary">
                            <i class="fas fa-barcode me-1"></i> <?= __('print_barcodes') ?>
                        </a>
                        <button type="button" class="btn btn-outline-secondary" data-bs-toggle="modal" data-bs-target="#importModal">
                            <i class="fas fa-file-import me-1"></i> <?= __('import_csv') ?>
                        </button>
                        <a href="export_inventory.php" class="btn btn-outline-success">
                            <i class="fas fa-file-excel me-1"></i> <?= __('export_csv') ?>
                        </a>
                    </div>
                </div>

                <?php if (!empty($msg)): ?>
                    <div class="alert alert-success alert-dismissible fade show d-flex align-items-center gap-2" role="alert">
                        <i class="fas fa-check-circle"></i>
                        <div><?= htmlspecialchars($msg) ?></div>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <?php if (!empty($error)): ?>
                    <div class="alert alert-danger alert-dismissible fade show d-flex align-items-center gap-2" role="alert">
                        <i class="fas fa-exclamation-circle"></i>
                        <div><?= htmlspecialchars($error) ?></div>
                        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                    </div>
                <?php endif; ?>

                <!-- Metrics Row -->
                <div class="row g-3 mb-4">
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Total Active Products</span>
                                <div class="stat-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-box"></i></div>
                            </div>
                            <div class="stat-value"><?= number_format($totalProducts) ?></div>
                            <small class="text-muted">In stock catalog</small>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Inventory Valuation</span>
                                <div class="stat-icon bg-success bg-opacity-10 text-success"><i class="fas fa-coins"></i></div>
                            </div>
                            <div class="stat-value text-success">RM <?= number_format($totalStockValueRetail, 2) ?></div>
                            <small class="text-muted">Cost value: RM <?= number_format($totalStockValueCost, 2) ?></small>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Low Stock Warnings</span>
                                <div class="stat-icon bg-warning bg-opacity-10 text-warning"><i class="fas fa-triangle-exclamation"></i></div>
                            </div>
                            <div class="stat-value text-warning"><?= $lowStockCount ?></div>
                            <small class="text-muted">At or below threshold</small>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Out of Stock</span>
                                <div class="stat-icon bg-danger bg-opacity-10 text-danger"><i class="fas fa-circle-xmark"></i></div>
                            </div>
                            <div class="stat-value text-danger"><?= $outOfStockCount ?></div>
                            <small class="text-muted">Needs immediate replenishment</small>
                        </div>
                    </div>
                </div>

                <!-- Filters Card -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-end">
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted">Search Catalog</label>
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search by name, barcode, supplier..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">Category</label>
                            <select name="category" class="form-select" onchange="this.form.submit()">
                                <option value="all">All Categories</option>
                                <?php foreach ($categories as $cat): ?>
                                    <option value="<?= $cat['id'] ?>" <?= $categoryFilter == $cat['id'] ? 'selected' : '' ?>><?= htmlspecialchars($cat['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">Stock Health</label>
                            <select name="stock_health" class="form-select" onchange="this.form.submit()">
                                <option value="all" <?= $stockHealthFilter === 'all' ? 'selected' : '' ?>>All Stock Statuses</option>
                                <option value="low" <?= $stockHealthFilter === 'low' ? 'selected' : '' ?>>Low Stock (Alerts)</option>
                                <option value="out" <?= $stockHealthFilter === 'out' ? 'selected' : '' ?>>Out of Stock (0)</option>
                                <option value="healthy" <?= $stockHealthFilter === 'healthy' ? 'selected' : '' ?>>Healthy Stock</option>
                            </select>
                        </div>
                        <div class="col-md-2 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Filter</button>
                            <?php if (!empty($search) || $categoryFilter !== 'all' || $stockHealthFilter !== 'all'): ?>
                                <a href="inventory.php" class="btn btn-light border" title="Reset"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Inventory Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th>Barcode</th>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th>Supplier</th>
                                    <th class="text-end">Cost Price</th>
                                    <th class="text-end">Selling Price</th>
                                    <th class="text-center">Margin %</th>
                                    <th>Stock Level</th>
                                    <th>Velocity</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($products)): ?>
                                    <tr>
                                        <td colspan="10" class="text-center py-5 text-muted">
                                            <i class="fas fa-box-open fa-3x opacity-25 mb-2 d-block"></i>
                                            No inventory items found matching your filters.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($products as $p): 
                                        $cost = (float)$p['cost_price'];
                                        $price = (float)$p['price'];
                                        $margin = $price > 0 ? round((($price - $cost) / $price) * 100, 1) : 0;
                                        $stockPct = min(100, max(0, round(($p['stock'] / max(1, $p['threshold'] * 2)) * 100)));
                                        $isLow = $p['stock'] <= $p['threshold'];
                                    ?>
                                        <tr>
                                            <td>
                                                <code class="fw-bold text-primary bg-body px-2 py-1 rounded border">
                                                    <?= htmlspecialchars($p['barcode'] ?? 'N/A') ?>
                                                </code>
                                            </td>
                                            <td>
                                                <div class="fw-bold"><?= htmlspecialchars($p['name']) ?></div>
                                            </td>
                                            <td>
                                                <span class="badge badge-soft-info"><?= htmlspecialchars($p['category_name'] ?? 'General') ?></span>
                                            </td>
                                            <td class="small text-muted">
                                                <?= htmlspecialchars($p['supplier_name'] ?? 'None') ?>
                                            </td>
                                            <td class="text-end text-muted small">
                                                RM <?= number_format($cost, 2) ?>
                                            </td>
                                            <td class="text-end fw-bold text-primary">
                                                RM <?= number_format($price, 2) ?>
                                            </td>
                                            <td class="text-center">
                                                <span class="badge badge-soft-<?= $margin >= 40 ? 'success' : ($margin >= 20 ? 'primary' : 'warning') ?>">
                                                    <?= $margin ?>%
                                                </span>
                                            </td>
                                            <td style="min-width: 140px;">
                                                <div class="d-flex justify-content-between align-items-center mb-1">
                                                    <span class="fw-bold <?= $p['stock'] == 0 ? 'text-danger' : ($isLow ? 'text-warning' : 'text-success') ?>">
                                                        <?= $p['stock'] ?> units
                                                    </span>
                                                    <small class="text-muted" style="font-size: 0.7rem;">Limit: <?= $p['threshold'] ?></small>
                                                </div>
                                                <div class="progress" style="height: 5px;">
                                                    <div class="progress-bar bg-<?= $p['stock'] == 0 ? 'danger' : ($isLow ? 'warning' : 'success') ?>" style="width: <?= $stockPct ?>%;"></div>
                                                </div>
                                            </td>
                                            <td class="small text-muted">
                                                <?= number_format((float)$p['daily_velocity'], 1) ?>/day
                                            </td>
                                            <td class="text-end">
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-light border text-success" title="Quick Stock Intake (+)" onclick="openStockModal(<?= $p['id'] ?>, '<?= htmlspecialchars(addslashes($p['name'])) ?>', <?= $p['stock'] ?>)">
                                                        <i class="fas fa-plus"></i>
                                                    </button>
                                                    <button type="button" class="btn btn-light border text-primary" title="Edit Product" onclick='openEditModal(<?= json_encode($p) ?>)'>
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <?php if ($role === 'owner'): ?>
                                                        <button type="button" class="btn btn-light border text-danger" title="Archive Product" onclick="confirmArchive(<?= $p['id'] ?>, '<?= htmlspecialchars(addslashes($p['name'])) ?>')">
                                                            <i class="fas fa-box-archive"></i>
                                                        </button>
                                                    <?php endif; ?>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pagination -->
                <?php if ($totalPages > 1): ?>
                    <nav class="mt-4">
                        <ul class="pagination justify-content-center">
                            <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>&category=<?= $categoryFilter ?>&stock_health=<?= $stockHealthFilter ?>">
                                    &laquo; Previous
                                </a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>&category=<?= $categoryFilter ?>&stock_health=<?= $stockHealthFilter ?>">
                                        <?= $p ?>
                                    </a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>&category=<?= $categoryFilter ?>&stock_health=<?= $stockHealthFilter ?>">
                                    Next &raquo;
                                </a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Add Product Modal -->
    <div class="modal fade" id="addProductModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-box-open text-primary me-2"></i> <?= __('add_product') ?></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted"><?= __('product_name') ?> *</label>
                            <input type="text" name="name" class="form-control" required placeholder="e.g., Faber-Castell Blue Pen">
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('barcode') ?></label>
                                <input type="text" name="barcode" class="form-control" placeholder="Leave blank to auto-gen">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('category') ?></label>
                                <select name="category_id" class="form-select">
                                    <option value="">Select Category</option>
                                    <?php foreach ($categories as $c): ?>
                                        <option value="<?= $c['id'] ?>"><?= htmlspecialchars($c['name']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('cost_price') ?></label>
                                <input type="number" name="cost_price" id="addCost" class="form-control" step="0.01" value="0.00" oninput="calcMargin('add')">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('selling_price') ?> *</label>
                                <input type="number" name="price" id="addPrice" class="form-control" step="0.01" required value="0.00" oninput="calcMargin('add')">
                            </div>
                        </div>
                        <div class="p-2 bg-body rounded border mb-3 text-center small" id="addMarginDisplay">
                            Estimated Profit Margin: <strong class="text-primary">0%</strong> (RM 0.00 profit)
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Initial Stock</label>
                                <input type="number" name="stock" class="form-control" value="0" min="0">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Restock Threshold</label>
                                <input type="number" name="threshold" class="form-control" value="10" min="1">
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold text-muted"><?= __('supplier') ?></label>
                            <select name="supplier_id" class="form-select">
                                <option value="">Select Supplier</option>
                                <?php foreach ($suppliers as $s): ?>
                                    <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['name']) ?></option>
                                <?php endforeach; ?>
                            </select>
                        </div>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-primary fw-bold"><?= __('save') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Edit Product Modal -->
    <div class="modal fade" id="editProductModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="update">
                    <input type="hidden" name="id" id="editId">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-edit text-primary me-2"></i> <?= __('edit_product') ?></h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted"><?= __('product_name') ?> *</label>
                            <input type="text" name="name" id="editName" class="form-control" required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('barcode') ?></label>
                                <input type="text" name="barcode" id="editBarcode" class="form-control" required>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('category') ?></label>
                                <select name="category_id" id="editCategory" class="form-select">
                                    <option value="">Select Category</option>
                                    <?php foreach ($categories as $c): ?>
                                        <option value="<?= $c['id'] ?>"><?= htmlspecialchars($c['name']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('cost_price') ?></label>
                                <input type="number" name="cost_price" id="editCost" class="form-control" step="0.01" oninput="calcMargin('edit')">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('selling_price') ?> *</label>
                                <input type="number" name="price" id="editPrice" class="form-control" step="0.01" required oninput="calcMargin('edit')">
                            </div>
                        </div>
                        <div class="p-2 bg-body rounded border mb-3 text-center small" id="editMarginDisplay">
                            Estimated Profit Margin: <strong class="text-primary">0%</strong>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Restock Threshold</label>
                                <input type="number" name="threshold" id="editThreshold" class="form-control" min="1">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted"><?= __('supplier') ?></label>
                                <select name="supplier_id" id="editSupplier" class="form-select">
                                    <option value="">Select Supplier</option>
                                    <?php foreach ($suppliers as $s): ?>
                                        <option value="<?= $s['id'] ?>"><?= htmlspecialchars($s['name']) ?></option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-primary fw-bold"><?= __('update') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Quick Stock Intake Modal -->
    <div class="modal fade" id="stockModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="add_stock">
                    <input type="hidden" name="id" id="stockProdId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold"><i class="fas fa-boxes-packing text-success me-2"></i> <?= __('add_stock') ?></h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <div class="fw-bold mb-1" id="stockProdName">Product</div>
                        <small class="text-muted d-block mb-3">Current Stock: <strong id="stockCurrent">0</strong></small>
                        
                        <label class="form-label small fw-bold text-muted">Quantity to Add (+)</label>
                        <input type="number" name="quantity" class="form-control text-center fs-4 fw-bold mb-2" value="10" min="1" required autofocus>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-success fw-bold">Confirm Intake</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Archive Confirmation Modal -->
    <div class="modal fade" id="archiveModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="archive">
                    <input type="hidden" name="id" id="archiveProdId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-warning"><i class="fas fa-box-archive me-2"></i> Archive Product</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small mb-2">Move <strong id="archiveProdName">Product</strong> to archived items?</p>
                        <small class="text-muted">It will be hidden from POS catalog but preserved for sales records.</small>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-warning fw-bold">Archive</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- CSV Import Modal -->
    <div class="modal fade" id="importModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST" enctype="multipart/form-data">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="import_csv">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-file-csv text-success me-2"></i> Import Products from CSV</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted">Select CSV File</label>
                            <input type="file" name="csv_file" class="form-control" accept=".csv" required>
                        </div>
                        <div class="p-3 bg-body rounded border small text-muted">
                            <strong>Expected Column Format:</strong><br>
                            <code>Barcode, Product Name, Category, Price, Cost, Stock, Threshold, Supplier</code>
                        </div>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-success fw-bold">Upload & Sync</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        const editModal = new bootstrap.Modal(document.getElementById('editProductModal'));
        const stockModal = new bootstrap.Modal(document.getElementById('stockModal'));
        const archiveModal = new bootstrap.Modal(document.getElementById('archiveModal'));

        function openEditModal(prod) {
            document.getElementById('editId').value = prod.id;
            document.getElementById('editName').value = prod.name;
            document.getElementById('editBarcode').value = prod.barcode || '';
            document.getElementById('editCategory').value = prod.category_id || '';
            document.getElementById('editCost').value = parseFloat(prod.cost_price).toFixed(2);
            document.getElementById('editPrice').value = parseFloat(prod.price).toFixed(2);
            document.getElementById('editThreshold').value = prod.threshold;
            document.getElementById('editSupplier').value = prod.supplier_id || '';
            calcMargin('edit');
            editModal.show();
        }

        function openStockModal(id, name, currentStock) {
            document.getElementById('stockProdId').value = id;
            document.getElementById('stockProdName').innerText = name;
            document.getElementById('stockCurrent').innerText = currentStock;
            stockModal.show();
        }

        function confirmArchive(id, name) {
            document.getElementById('archiveProdId').value = id;
            document.getElementById('archiveProdName').innerText = name;
            archiveModal.show();
        }

        function calcMargin(type) {
            const cost = parseFloat(document.getElementById(`${type}Cost`).value) || 0;
            const price = parseFloat(document.getElementById(`${type}Price`).value) || 0;
            const profit = price - cost;
            const margin = price > 0 ? ((profit / price) * 100).toFixed(1) : 0;
            document.getElementById(`${type}MarginDisplay`).innerHTML = `Estimated Profit Margin: <strong class="text-primary">${margin}%</strong> (RM ${profit.toFixed(2)} profit per unit)`;
        }
    </script>
</body>
</html>