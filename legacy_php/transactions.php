<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Unauthorized access. Owners only."); 
}

$role = $_SESSION['role'];
$msg = '';
$error = '';

// Handle Void Sale Action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['void_id'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) { 
        die("Security token mismatch."); 
    }

    $saleId = (int)$_POST['void_id'];
    
    try {
        $pdo->beginTransaction();

        // Check current status
        $checkStmt = $pdo->prepare("SELECT status FROM sales WHERE id = ? FOR UPDATE");
        $checkStmt->execute([$saleId]);
        $currentStatus = $checkStmt->fetchColumn();

        if ($currentStatus !== 'completed') {
            throw new Exception("Sale #{$saleId} is already {$currentStatus}.");
        }

        // 1. Get items to restore stock
        $stmt = $pdo->prepare("SELECT si.product_id, si.quantity, p.is_service, p.name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?");
        $stmt->execute([$saleId]);
        $items = $stmt->fetchAll();

        foreach ($items as $item) {
            if (!$item['is_service']) {
                $restoreStmt = $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
                $restoreStmt->execute([$item['quantity'], $item['product_id']]);
            }
        }

        // 2. Mark sale as voided
        $updateSale = $pdo->prepare("UPDATE sales SET status = 'voided' WHERE id = ?");
        $updateSale->execute([$saleId]);

        logActivity($pdo, "Sale Voided", "Voided transaction #{$saleId} and restored product inventory levels.");
        $pdo->commit();
        $msg = "Transaction #{$saleId} was voided successfully. Stock has been restored.";
    } catch (Exception $e) {
        $pdo->rollBack();
        $error = "Failed to void transaction: " . $e->getMessage();
    }
}

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$statusFilter = $_GET['status'] ?? 'all';
$limit = 15;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 's.id';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$allowedSort = ['s.id', 's.created_at', 'u.username', 's.total', 's.status', 's.payment_method'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 's.id';
}

$conditions = [];
$params = [];

if (!empty($search)) {
    $conditions[] = "(s.id LIKE ? OR u.username LIKE ? OR s.payment_method LIKE ?)";
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%"]);
}
if ($statusFilter !== 'all') {
    $conditions[] = "s.status = ?";
    $params[] = $statusFilter;
}

$whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

// Total count for pagination
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM sales s JOIN users u ON s.user_id = u.id $whereClause");
$countStmt->execute($params);
$totalSales = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalSales / $limit));

// Fetch sales records
$query = "SELECT s.*, u.username, 
    (SELECT COUNT(*) FROM sale_items WHERE sale_id = s.id) as item_count 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    $whereClause 
    ORDER BY $sortBy $sortOrder 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$sales = $stmt->fetchAll();

$pageTitle = __('transactions');
$pageSubtitle = 'Audit, Inspect & Manage Completed Bills';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('transactions') ?> | <?= __('app_name') ?></title>
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
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 class="fw-bold mb-1"><?= __('transactions') ?></h4>
                        <p class="text-muted small mb-0">Total <?= number_format($totalSales) ?> transactions recorded</p>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="pos.php" class="btn btn-primary shadow-sm">
                            <i class="fas fa-plus me-1"></i> New Transaction
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

                <!-- Filter Bar -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-end">
                        <div class="col-md-5">
                            <label class="form-label small fw-bold text-muted">Search Transactions</label>
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search by ID, Cashier, or Payment..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">Filter Status</label>
                            <select name="status" class="form-select" onchange="this.form.submit()">
                                <option value="all" <?= $statusFilter === 'all' ? 'selected' : '' ?>>All Statuses</option>
                                <option value="completed" <?= $statusFilter === 'completed' ? 'selected' : '' ?>>Completed Only</option>
                                <option value="voided" <?= $statusFilter === 'voided' ? 'selected' : '' ?>>Voided Only</option>
                            </select>
                        </div>
                        <div class="col-md-4 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">
                                <i class="fas fa-filter me-1"></i> Apply Filter
                            </button>
                            <?php if (!empty($search) || $statusFilter !== 'all'): ?>
                                <a href="transactions.php" class="btn btn-light border" title="Reset Filters"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Transactions Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th>
                                        <a href="?search=<?= urlencode($search) ?>&status=<?= $statusFilter ?>&sort_by=s.id&sort_order=<?= ($sortBy === 's.id' && $sortOrder === 'DESC') ? 'ASC' : 'DESC' ?>">
                                            # Sale ID <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>
                                        <a href="?search=<?= urlencode($search) ?>&status=<?= $statusFilter ?>&sort_by=s.created_at&sort_order=<?= ($sortBy === 's.created_at' && $sortOrder === 'DESC') ? 'ASC' : 'DESC' ?>">
                                            Date & Time <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>Cashier</th>
                                    <th>Payment</th>
                                    <th>Items</th>
                                    <th class="text-end">
                                        <a href="?search=<?= urlencode($search) ?>&status=<?= $statusFilter ?>&sort_by=s.total&sort_order=<?= ($sortBy === 's.total' && $sortOrder === 'DESC') ? 'ASC' : 'DESC' ?>">
                                            Total <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>Status</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($sales)): ?>
                                    <tr>
                                        <td colspan="8" class="text-center py-5 text-muted">
                                            <i class="fas fa-inbox fa-3x opacity-25 mb-2 d-block"></i>
                                            No transactions found matching your criteria.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($sales as $s): ?>
                                        <tr>
                                            <td class="fw-bold">
                                                <a href="receipt.php?id=<?= $s['id'] ?>" target="_blank" class="text-decoration-none text-primary">
                                                    #<?= sprintf('%06d', $s['id']) ?>
                                                </a>
                                            </td>
                                            <td>
                                                <span class="d-block fw-medium"><?= date('d M Y', strtotime($s['created_at'])) ?></span>
                                                <small class="text-muted"><?= date('h:i A', strtotime($s['created_at'])) ?></small>
                                            </td>
                                            <td>
                                                <span class="badge badge-soft-primary">
                                                    <i class="fas fa-user-circle me-1"></i> <?= htmlspecialchars($s['username']) ?>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">
                                                    <?= htmlspecialchars($s['payment_method']) ?>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge badge-soft-info"><?= $s['item_count'] ?> item(s)</span>
                                            </td>
                                            <td class="text-end fw-bold fs-6 text-primary">
                                                RM <?= number_format($s['total'], 2) ?>
                                            </td>
                                            <td>
                                                <?php if ($s['status'] === 'completed'): ?>
                                                    <span class="badge badge-soft-success">Completed</span>
                                                <?php else: ?>
                                                    <span class="badge badge-soft-danger">Voided</span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="text-end">
                                                <div class="btn-group btn-group-sm">
                                                    <a href="receipt.php?id=<?= $s['id'] ?>" target="_blank" class="btn btn-light border" title="View Thermal Receipt">
                                                        <i class="fas fa-print"></i>
                                                    </a>
                                                    <?php if ($s['status'] === 'completed'): ?>
                                                        <button type="button" class="btn btn-outline-danger" title="Void Sale" onclick="confirmVoid(<?= $s['id'] ?>, 'RM <?= number_format($s['total'], 2) ?>')">
                                                            <i class="fas fa-ban"></i>
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
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>&status=<?= $statusFilter ?>&sort_by=<?= $sortBy ?>&sort_order=<?= $sortOrder ?>">
                                    &laquo; Previous
                                </a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>&status=<?= $statusFilter ?>&sort_by=<?= $sortBy ?>&sort_order=<?= $sortOrder ?>">
                                        <?= $p ?>
                                    </a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>&status=<?= $statusFilter ?>&sort_by=<?= $sortBy ?>&sort_order=<?= $sortOrder ?>">
                                    Next &raquo;
                                </a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Void Confirmation Modal -->
    <div class="modal fade" id="voidModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST" id="voidForm">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="void_id" id="voidSaleId">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold text-danger">
                            <i class="fas fa-triangle-exclamation me-2"></i> Confirm Void Sale
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-4">
                        <p class="mb-2">Are you sure you want to void transaction <strong id="voidSaleText">#0</strong>?</p>
                        <div class="alert alert-warning small mb-0">
                            <i class="fas fa-info-circle me-1"></i> Stock levels for inventory items included in this bill will be automatically restored. This action cannot be undone.
                        </div>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button>
                        <button type="submit" class="btn btn-danger fw-bold">
                            <i class="fas fa-ban me-1"></i> Void Transaction
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        const voidModal = new bootstrap.Modal(document.getElementById('voidModal'));
        function confirmVoid(saleId, total) {
            document.getElementById('voidSaleId').value = saleId;
            document.getElementById('voidSaleText').innerText = `#${saleId} (${total})`;
            voidModal.show();
        }
    </script>
</body>
</html>