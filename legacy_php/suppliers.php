<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}
if ($_SESSION['role'] === 'cashier') { 
    die("Access Denied: Cashiers do not have access to supplier management."); 
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
        $contact = trim($_POST['contact'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $address = trim($_POST['address'] ?? '');

        if (empty($name)) {
            $error = "Supplier name is required.";
        } else {
            $stmt = $pdo->prepare("INSERT INTO suppliers (name, contact, email, address) VALUES (?, ?, ?, ?)");
            $stmt->execute([$name, $contact, $email, $address]);
            logActivity($pdo, "Supplier Added", "Added new supplier: {$name}");
            $msg = "Supplier '{$name}' created successfully.";
        }
    } elseif ($action === 'update') {
        $id = (int)$_POST['id'];
        $name = trim($_POST['name'] ?? '');
        $contact = trim($_POST['contact'] ?? '');
        $email = trim($_POST['email'] ?? '');
        $address = trim($_POST['address'] ?? '');

        $stmt = $pdo->prepare("UPDATE suppliers SET name = ?, contact = ?, email = ?, address = ? WHERE id = ?");
        $stmt->execute([$name, $contact, $email, $address, $id]);
        logActivity($pdo, "Supplier Updated", "Updated information for supplier #{$id} ({$name})");
        $msg = "Supplier '{$name}' updated successfully.";
    } elseif ($action === 'delete' && $role === 'owner') {
        $id = (int)$_POST['id'];
        $sName = $pdo->query("SELECT name FROM suppliers WHERE id = {$id}")->fetchColumn();
        $stmt = $pdo->prepare("DELETE FROM suppliers WHERE id = ?");
        $stmt->execute([$id]);
        logActivity($pdo, "Supplier Deleted", "Deleted supplier #{$id} ({$sName})");
        $msg = "Supplier deleted successfully.";
    }
}

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$limit = 10;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 's.name';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';

$allowedSort = ['s.id', 's.name', 's.contact', 's.email', 'product_count'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 's.name';
}

$conditions = [];
$params = [];
if (!empty($search)) {
    $conditions[] = "(s.name LIKE ? OR s.contact LIKE ? OR s.email LIKE ? OR s.address LIKE ?)";
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%", "%$search%"]);
}

$whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM suppliers s $whereClause");
$countStmt->execute($params);
$totalSuppliers = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalSuppliers / $limit));

// Fetch suppliers with products supplied count
$query = "SELECT s.*, COUNT(p.id) as product_count 
    FROM suppliers s 
    LEFT JOIN products p ON s.id = p.supplier_id AND p.status = 'active' 
    $whereClause 
    GROUP BY s.id 
    ORDER BY $sortBy $sortOrder 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$suppliers = $stmt->fetchAll();

$pageTitle = __('suppliers');
$pageSubtitle = 'Manage Vendors, Print Media Suppliers & Contacts';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('suppliers') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('suppliers') ?></h4>
                        <p class="text-muted small mb-0">Total <?= $totalSuppliers ?> registered business suppliers</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addSupplierModal">
                            <i class="fas fa-plus me-1"></i> Add Supplier
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

                <!-- Search & Filters -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-center">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search suppliers by name, email, phone, or address..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-4 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Search</button>
                            <?php if (!empty($search)): ?>
                                <a href="suppliers.php" class="btn btn-light border"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Suppliers Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th># ID</th>
                                    <th>
                                        <a href="?search=<?= urlencode($search) ?>&sort_by=s.name&sort_order=<?= ($sortBy === 's.name' && $sortOrder === 'ASC') ? 'DESC' : 'ASC' ?>">
                                            Supplier Name <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>Contact & Phone</th>
                                    <th>Email Address</th>
                                    <th>Address</th>
                                    <th>Supplied Items</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($suppliers)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center py-5 text-muted">
                                            <i class="fas fa-truck-ramp-box fa-3x opacity-25 mb-2 d-block"></i>
                                            No suppliers found matching your query.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($suppliers as $s): ?>
                                        <tr>
                                            <td class="fw-bold text-muted">#<?= $s['id'] ?></td>
                                            <td>
                                                <div class="fw-bold fs-6 text-primary"><?= htmlspecialchars($s['name']) ?></div>
                                            </td>
                                            <td>
                                                <?php if (!empty($s['contact'])): ?>
                                                    <a href="tel:<?= htmlspecialchars($s['contact']) ?>" class="text-decoration-none fw-medium text-body">
                                                        <i class="fas fa-phone-alt text-success me-1"></i> <?= htmlspecialchars($s['contact']) ?>
                                                    </a>
                                                <?php else: ?>
                                                    <span class="text-muted small">N/A</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?php if (!empty($s['email'])): ?>
                                                    <a href="mailto:<?= htmlspecialchars($s['email']) ?>" class="text-decoration-none text-primary small">
                                                        <i class="fas fa-envelope me-1"></i> <?= htmlspecialchars($s['email']) ?>
                                                    </a>
                                                <?php else: ?>
                                                    <span class="text-muted small">N/A</span>
                                                <?php endif; ?>
                                            </td>
                                            <td class="small text-muted" style="max-width: 250px;">
                                                <?= htmlspecialchars($s['address'] ?? 'N/A') ?>
                                            </td>
                                            <td>
                                                <a href="inventory.php?supplier=<?= $s['id'] ?>" class="badge badge-soft-info text-decoration-none">
                                                    <i class="fas fa-box-open me-1"></i> <?= $s['product_count'] ?> products
                                                </a>
                                            </td>
                                            <td class="text-end">
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-light border text-primary" title="Edit Supplier" onclick='openEditSupplier(<?= json_encode($s) ?>)'>
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <?php if ($role === 'owner'): ?>
                                                        <button type="button" class="btn btn-light border text-danger" title="Delete Supplier" onclick="confirmDeleteSupplier(<?= $s['id'] ?>, '<?= htmlspecialchars(addslashes($s['name'])) ?>')">
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
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>&sort_by=<?= $sortBy ?>&sort_order=<?= $sortOrder ?>">&laquo; Previous</a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>&sort_by=<?= $sortBy ?>&sort_order=<?= $sortOrder ?>"><?= $p ?></a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>&sort_by=<?= $sortBy ?>&sort_order=<?= $sortOrder ?>">Next &raquo;</a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Add Supplier Modal -->
    <div class="modal fade" id="addSupplierModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-plus text-primary me-2"></i> Add New Supplier</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted">Supplier / Company Name *</label>
                            <input type="text" name="name" class="form-control" required placeholder="e.g., Stabilo Malaysia Sdn Bhd" autofocus>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Contact / Phone Number</label>
                                <input type="text" name="contact" class="form-control" placeholder="e.g., 03-8945 1234">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Email Address</label>
                                <input type="email" name="email" class="form-control" placeholder="e.g., orders@vendor.com">
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold text-muted">Business / Warehouse Address</label>
                            <textarea name="address" class="form-control" rows="3" placeholder="Full address"></textarea>
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

    <!-- Edit Supplier Modal -->
    <div class="modal fade" id="editSupplierModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="update">
                    <input type="hidden" name="id" id="editSupId">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-edit text-primary me-2"></i> Edit Supplier</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted">Supplier Name *</label>
                            <input type="text" name="name" id="editSupName" class="form-control" required>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Contact Number</label>
                                <input type="text" name="contact" id="editSupContact" class="form-control">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Email Address</label>
                                <input type="email" name="email" id="editSupEmail" class="form-control">
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold text-muted">Address</label>
                            <textarea name="address" id="editSupAddress" class="form-control" rows="3"></textarea>
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

    <!-- Delete Supplier Modal -->
    <div class="modal fade" id="deleteSupplierModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" id="deleteSupId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-danger"><i class="fas fa-trash-alt me-2"></i> Delete Supplier</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small mb-2">Delete supplier <strong id="deleteSupName">Supplier</strong>?</p>
                        <small class="text-muted">Associated products will remain active with unassigned supplier.</small>
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
        const editModal = new bootstrap.Modal(document.getElementById('editSupplierModal'));
        const deleteModal = new bootstrap.Modal(document.getElementById('deleteSupplierModal'));

        function openEditSupplier(sup) {
            document.getElementById('editSupId').value = sup.id;
            document.getElementById('editSupName').value = sup.name;
            document.getElementById('editSupContact').value = sup.contact || '';
            document.getElementById('editSupEmail').value = sup.email || '';
            document.getElementById('editSupAddress').value = sup.address || '';
            editModal.show();
        }

        function confirmDeleteSupplier(id, name) {
            document.getElementById('deleteSupId').value = id;
            document.getElementById('deleteSupName').innerText = name;
            deleteModal.show();
        }
    </script>
</body>
</html>