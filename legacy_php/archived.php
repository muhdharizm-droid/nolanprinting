<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Unauthorized access. Owners only."); 
}

$role = $_SESSION['role'];
$msg = '';
$error = '';

// Handle Restore Action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) { 
        die("Security token mismatch."); 
    }

    $action = $_POST['action'];
    $productId = (int)$_POST['id'];

    if ($action === 'restore') {
        $stmt = $pdo->prepare("UPDATE products SET status = 'active' WHERE id = ?");
        $stmt->execute([$productId]);

        $productName = $pdo->query("SELECT name FROM products WHERE id = {$productId}")->fetchColumn();
        logActivity($pdo, "Product Restored", "Restored product '{$productName}' (ID: #{$productId}) back to active catalog.");
        $msg = "Product '{$productName}' has been restored to active inventory.";
    } elseif ($action === 'permanently_delete') {
        // Protect data integrity: check if product was ever sold
        $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM sale_items WHERE product_id = ?");
        $checkStmt->execute([$productId]);

        if ($checkStmt->fetchColumn() > 0) {
            $error = "Cannot permanently delete this product because it has past sales records. Keep it archived to preserve reporting accuracy.";
        } else {
            $productName = $pdo->query("SELECT name FROM products WHERE id = {$productId}")->fetchColumn();
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$productId]);

            logActivity($pdo, "Product Deleted", "Permanently deleted archived product #{$productId} ({$productName})");
            $msg = "Product permanently deleted from database.";
        }
    }
}

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$limit = 15;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 'p.id';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$allowedSort = ['p.id', 'p.barcode', 'p.name', 'c.name', 'p.price'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 'p.id';
}

$conditions = ["p.status = 'archived'"];
$params = [];
if (!empty($search)) {
    $conditions[] = "(p.name LIKE ? OR p.barcode LIKE ? OR c.name LIKE ?)";
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%"]);
}

$whereClause = "WHERE " . implode(" AND ", $conditions);

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM products p LEFT JOIN categories c ON p.category_id = c.id $whereClause");
$countStmt->execute($params);
$totalProducts = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalProducts / $limit));

$query = "SELECT p.*, c.name as category_name, 
    (SELECT COUNT(*) FROM sale_items WHERE product_id = p.id) as sales_history_count 
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    $whereClause 
    ORDER BY $sortBy $sortOrder 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$products = $stmt->fetchAll();

$pageTitle = __('archived_products');
$pageSubtitle = 'Decommissioned Catalog Items & Deletion Controls';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('archived_products') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('archived_products') ?></h4>
                        <p class="text-muted small mb-0">Total <?= $totalProducts ?> archived products in archive vault</p>
                    </div>
                    <div>
                        <a href="inventory.php" class="btn btn-outline-secondary">
                            &larr; Back to Active Inventory
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

                <!-- Search -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-center">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search archived products by name, barcode..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-4 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Search</button>
                            <?php if (!empty($search)): ?>
                                <a href="archived.php" class="btn btn-light border"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th># ID</th>
                                    <th>Barcode</th>
                                    <th>Product Name</th>
                                    <th>Category</th>
                                    <th class="text-end">Selling Price</th>
                                    <th>Sales Records</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($products)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center py-5 text-muted">
                                            <i class="fas fa-box-archive fa-3x opacity-25 mb-2 d-block"></i>
                                            Archive vault is empty. No archived products found.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($products as $p): ?>
                                        <tr>
                                            <td class="fw-bold text-muted">#<?= $p['id'] ?></td>
                                            <td>
                                                <code class="text-muted"><?= htmlspecialchars($p['barcode'] ?? 'N/A') ?></code>
                                            </td>
                                            <td>
                                                <div class="fw-bold text-muted text-decoration-line-through"><?= htmlspecialchars($p['name']) ?></div>
                                            </td>
                                            <td>
                                                <span class="badge badge-soft-info"><?= htmlspecialchars($p['category_name'] ?? 'General') ?></span>
                                            </td>
                                            <td class="text-end text-muted">
                                                RM <?= number_format((float)$p['price'], 2) ?>
                                            </td>
                                            <td>
                                                <?php if ($p['sales_history_count'] > 0): ?>
                                                    <span class="badge badge-soft-primary" title="Cannot permanently delete to protect transaction history">
                                                        <i class="fas fa-receipt me-1"></i> <?= $p['sales_history_count'] ?> sales history
                                                    </span>
                                                <?php else: ?>
                                                    <span class="badge bg-light text-muted border">No sales (Safe to delete)</span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="text-end">
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-light border text-success" title="Restore Product" onclick="confirmRestore(<?= $p['id'] ?>, '<?= htmlspecialchars(addslashes($p['name'])) ?>')">
                                                        <i class="fas fa-arrow-rotate-left me-1"></i> <?= __('restore') ?>
                                                    </button>
                                                    <?php if ($p['sales_history_count'] == 0): ?>
                                                        <button type="button" class="btn btn-light border text-danger" title="Delete Permanently" onclick="confirmPermDelete(<?= $p['id'] ?>, '<?= htmlspecialchars(addslashes($p['name'])) ?>')">
                                                            <i class="fas fa-trash-alt"></i>
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
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>">&laquo; Previous</a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>"><?= $p ?></a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>">Next &raquo;</a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Restore Modal -->
    <div class="modal fade" id="restoreModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="restore">
                    <input type="hidden" name="id" id="restoreProdId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-success"><i class="fas fa-arrow-rotate-left me-2"></i> Restore Product</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small mb-0">Restore <strong id="restoreProdName">Product</strong> back to active inventory catalog?</p>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-success fw-bold"><?= __('restore') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Permanent Delete Modal -->
    <div class="modal fade" id="permDeleteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="permanently_delete">
                    <input type="hidden" name="id" id="deleteProdId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-danger"><i class="fas fa-trash-alt me-2"></i> Permanent Deletion</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small text-danger fw-bold mb-1">Warning: Irreversible action!</p>
                        <p class="small mb-0">Permanently delete <strong id="deleteProdName">Product</strong> from database?</p>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-danger fw-bold"><?= __('delete') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        const restoreModal = new bootstrap.Modal(document.getElementById('restoreModal'));
        const permDeleteModal = new bootstrap.Modal(document.getElementById('permDeleteModal'));

        function confirmRestore(id, name) {
            document.getElementById('restoreProdId').value = id;
            document.getElementById('restoreProdName').innerText = name;
            restoreModal.show();
        }

        function confirmPermDelete(id, name) {
            document.getElementById('deleteProdId').value = id;
            document.getElementById('deleteProdName').innerText = name;
            permDeleteModal.show();
        }
    </script>
</body>
</html>
