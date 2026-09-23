<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}
if ($_SESSION['role'] === 'cashier') { 
    die("Access Denied: Cashiers do not have access to category management."); 
}

$role = $_SESSION['role'];
$msg = '';
$error = '';

// Handle CRUD Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) { 
        die("Security token mismatch."); 
    }

    $action = $_POST['action'];

    if ($action === 'add') {
        $name = trim($_POST['name'] ?? '');
        if (empty($name)) {
            $error = "Category name cannot be blank.";
        } else {
            $stmt = $pdo->prepare("INSERT INTO categories (name) VALUES (?)");
            try {
                $stmt->execute([$name]);
                logActivity($pdo, "Category Added", "Created category: {$name}");
                $msg = "Category '{$name}' created successfully.";
            } catch (PDOException $e) { 
                $error = "Category '{$name}' already exists."; 
            }
        }
    } elseif ($action === 'edit') {
        $id = (int)$_POST['id'];
        $name = trim($_POST['name'] ?? '');
        if (empty($name)) {
            $error = "Category name cannot be blank.";
        } else {
            $stmt = $pdo->prepare("UPDATE categories SET name = ? WHERE id = ?");
            try {
                $stmt->execute([$name, $id]);
                logActivity($pdo, "Category Updated", "Updated category #{$id} to '{$name}'");
                $msg = "Category updated to '{$name}'.";
            } catch (PDOException $e) { 
                $error = "Category name '{$name}' already exists."; 
            }
        }
    } elseif ($action === 'delete' && $role === 'owner') {
        $id = (int)$_POST['id'];
        $check = $pdo->prepare("SELECT COUNT(*) FROM products WHERE category_id = ? AND status = 'active'");
        $check->execute([$id]);
        if ($check->fetchColumn() > 0) {
            $error = "Cannot delete: Active products are currently assigned to this category. Reassign them first.";
        } else {
            $cName = $pdo->query("SELECT name FROM categories WHERE id = {$id}")->fetchColumn();
            $stmt = $pdo->prepare("DELETE FROM categories WHERE id = ?");
            $stmt->execute([$id]);
            logActivity($pdo, "Category Deleted", "Deleted category #{$id} ({$cName})");
            $msg = "Category deleted successfully.";
        }
    }
}

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$limit = 10;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sort = $_GET['sort'] ?? 'c.name';
$order = strtoupper($_GET['order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';

$allowedSort = ['c.id', 'c.name', 'product_count', 'total_value'];
if (!in_array($sort, $allowedSort)) {
    $sort = 'c.name';
}

$conditions = [];
$params = [];
if (!empty($search)) {
    $conditions[] = "c.name LIKE ?";
    $params[] = "%$search%";
}

$whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM categories c $whereClause");
$countStmt->execute($params);
$totalCategories = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalCategories / $limit));

// Fetch categories with product counts and valuation
$query = "SELECT c.*, 
    COUNT(p.id) as product_count, 
    COALESCE(SUM(p.stock * p.price), 0) as total_value,
    COALESCE(SUM(p.stock * p.cost_price), 0) as total_cost 
    FROM categories c 
    LEFT JOIN products p ON c.id = p.category_id AND p.status = 'active' 
    $whereClause 
    GROUP BY c.id 
    ORDER BY $sort $order 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$categories = $stmt->fetchAll();

$totalAllValuation = (float)$pdo->query("SELECT SUM(stock * price) FROM products WHERE status = 'active' AND category_id IS NOT NULL")->fetchColumn();

$pageTitle = __('manage_categories');
$pageSubtitle = 'Organize Product Classifications & Stock Groups';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('manage_categories') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('manage_categories') ?></h4>
                        <p class="text-muted small mb-0">Total <?= $totalCategories ?> product categories configured</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addCategoryModal">
                            <i class="fas fa-plus me-1"></i> Add Category
                        </button>
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
                    <div class="col-md-4">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Total Categories</span>
                                <div class="stat-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-tags"></i></div>
                            </div>
                            <div class="stat-value"><?= $totalCategories ?></div>
                            <small class="text-muted">Active groupings</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Categorized Stock Value</span>
                                <div class="stat-icon bg-success bg-opacity-10 text-success"><i class="fas fa-wallet"></i></div>
                            </div>
                            <div class="stat-value text-success">RM <?= number_format($totalAllValuation, 2) ?></div>
                            <small class="text-muted">Retail inventory value</small>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Inventory Shortcut</span>
                                <div class="stat-icon bg-info bg-opacity-10 text-info"><i class="fas fa-boxes-stacked"></i></div>
                            </div>
                            <div class="mt-2">
                                <a href="inventory.php" class="btn btn-sm btn-outline-primary fw-semibold">View Products &rarr;</a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-center">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search categories by name..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-4 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Search</button>
                            <?php if (!empty($search)): ?>
                                <a href="categories.php" class="btn btn-light border"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Categories Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th># ID</th>
                                    <th>
                                        <a href="?search=<?= urlencode($search) ?>&sort=c.name&order=<?= ($sort === 'c.name' && $order === 'ASC') ? 'DESC' : 'ASC' ?>">
                                            Category Name <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>
                                        <a href="?search=<?= urlencode($search) ?>&sort=product_count&order=<?= ($sort === 'product_count' && $order === 'ASC') ? 'DESC' : 'ASC' ?>">
                                            Assigned Products <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th class="text-end">
                                        <a href="?search=<?= urlencode($search) ?>&sort=total_value&order=<?= ($sort === 'total_value' && $order === 'ASC') ? 'DESC' : 'ASC' ?>">
                                            Retail Value <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($categories)): ?>
                                    <tr>
                                        <td colspan="5" class="text-center py-5 text-muted">
                                            <i class="fas fa-tags fa-3x opacity-25 mb-2 d-block"></i>
                                            No categories found. Click "Add Category" to create one.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($categories as $c): ?>
                                        <tr>
                                            <td class="fw-bold text-muted">#<?= $c['id'] ?></td>
                                            <td>
                                                <div class="fw-bold fs-6 text-primary">
                                                    <?= htmlspecialchars($c['name']) ?>
                                                </div>
                                            </td>
                                            <td>
                                                <a href="inventory.php?category=<?= $c['id'] ?>" class="badge badge-soft-info text-decoration-none">
                                                    <i class="fas fa-box me-1"></i> <?= $c['product_count'] ?> products
                                                </a>
                                            </td>
                                            <td class="text-end fw-bold text-success">
                                                RM <?= number_format((float)$c['total_value'], 2) ?>
                                            </td>
                                            <td class="text-end">
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-light border text-primary" title="Edit Category" onclick="openEditCategory(<?= $c['id'] ?>, '<?= htmlspecialchars(addslashes($c['name'])) ?>')">
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <?php if ($role === 'owner'): ?>
                                                        <button type="button" class="btn btn-light border text-danger" title="Delete Category" onclick="confirmDeleteCategory(<?= $c['id'] ?>, '<?= htmlspecialchars(addslashes($c['name'])) ?>')">
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
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>&sort=<?= $sort ?>&order=<?= $order ?>">&laquo; Previous</a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>&sort=<?= $sort ?>&order=<?= $order ?>"><?= $p ?></a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>&sort=<?= $sort ?>&order=<?= $order ?>">Next &raquo;</a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Add Category Modal -->
    <div class="modal fade" id="addCategoryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold"><i class="fas fa-plus text-primary me-2"></i> Add New Category</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <label class="form-label small fw-bold text-muted">Category Name *</label>
                        <input type="text" name="name" class="form-control" required placeholder="e.g., Stationery, Binding..." autofocus>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-primary fw-bold"><?= __('save') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Edit Category Modal -->
    <div class="modal fade" id="editCategoryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="edit">
                    <input type="hidden" name="id" id="editCatId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold"><i class="fas fa-edit text-primary me-2"></i> Edit Category</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <label class="form-label small fw-bold text-muted">Category Name *</label>
                        <input type="text" name="name" id="editCatName" class="form-control" required autofocus>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-primary fw-bold"><?= __('update') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Delete Category Modal -->
    <div class="modal fade" id="deleteCategoryModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" id="deleteCatId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-danger"><i class="fas fa-trash-alt me-2"></i> Delete Category</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small mb-2">Delete category <strong id="deleteCatName">Category</strong>?</p>
                        <small class="text-muted">You can only delete categories that have 0 products assigned.</small>
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
        const editModal = new bootstrap.Modal(document.getElementById('editCategoryModal'));
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteCategoryModal'));

        function openEditCategory(id, name) {
            document.getElementById('editCatId').value = id;
            document.getElementById('editCatName').value = name;
            editModal.show();
        }

        function confirmDeleteCategory(id, name) {
            document.getElementById('deleteCatId').value = id;
            document.getElementById('deleteCatName').innerText = name;
            deleteModal.show();
        }
    </script>
</body>
</html>