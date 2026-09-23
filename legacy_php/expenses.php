<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}
if ($_SESSION['role'] !== 'owner') { 
    die("Access Denied: Owners Only."); 
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
        $description = trim($_POST['description'] ?? '');
        $amount = (float)($_POST['amount'] ?? 0);
        $category = trim($_POST['category'] ?? 'Others');

        if (empty($description) || $amount <= 0) {
            $error = "Please provide a valid description and amount greater than RM 0.00.";
        } else {
            $stmt = $pdo->prepare("INSERT INTO expenses (description, amount, category, user_id) VALUES (?, ?, ?, ?)");
            $stmt->execute([$description, $amount, $category, $_SESSION['user_id']]);
            logActivity($pdo, "Expense Added", "Logged {$category} expense: '{$description}' for RM " . number_format($amount, 2));
            $msg = "Expense of RM " . number_format($amount, 2) . " logged successfully.";
        }
    } elseif ($action === 'delete') {
        $id = (int)$_POST['id'];
        $expInfo = $pdo->query("SELECT description, amount FROM expenses WHERE id = {$id}")->fetch();
        if ($expInfo) {
            $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
            $stmt->execute([$id]);
            logActivity($pdo, "Expense Deleted", "Removed expense record: {$expInfo['description']} (RM {$expInfo['amount']})");
            $msg = "Expense record removed.";
        }
    }
}

// --- Filtering, Pagination & Sorting ---
$filterMonth = $_GET['month'] ?? date('m');
$filterYear = $_GET['year'] ?? date('Y');
$search = trim($_GET['search'] ?? '');
$categoryFilter = $_GET['category'] ?? 'all';

$limit = 12;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 'e.created_at';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$allowedSort = ['e.created_at', 'e.description', 'e.category', 'e.amount'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 'e.created_at';
}

$conditions = ["MONTH(e.created_at) = ?", "YEAR(e.created_at) = ?"];
$params = [$filterMonth, $filterYear];

if (!empty($search)) {
    $conditions[] = "(e.description LIKE ? OR e.category LIKE ?)";
    $params[] = "%$search%";
    $params[] = "%$search%";
}
if ($categoryFilter !== 'all') {
    $conditions[] = "e.category = ?";
    $params[] = $categoryFilter;
}

$whereClause = "WHERE " . implode(" AND ", $conditions);

// Total count
$countStmt = $pdo->prepare("SELECT COUNT(*) FROM expenses e $whereClause");
$countStmt->execute($params);
$totalExpensesCount = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalExpensesCount / $limit));

// Total Amount for filtered month
$sumStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM expenses e WHERE MONTH(created_at) = ? AND YEAR(created_at) = ?");
$sumStmt->execute([$filterMonth, $filterYear]);
$monthTotalExpenses = (float)$sumStmt->fetchColumn();

// Fetch expenses list
$query = "SELECT e.*, u.username 
    FROM expenses e 
    LEFT JOIN users u ON e.user_id = u.id 
    $whereClause 
    ORDER BY $sortBy $sortOrder 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$expenses = $stmt->fetchAll();

// Category breakdown for current month
$catStmt = $pdo->prepare("SELECT category, SUM(amount) as cat_total FROM expenses WHERE MONTH(created_at) = ? AND YEAR(created_at) = ? GROUP BY category ORDER BY cat_total DESC");
$catStmt->execute([$filterMonth, $filterYear]);
$catBreakdown = $catStmt->fetchAll();

$pageTitle = __('expenses');
$pageSubtitle = 'Track Operating Expenses, Rent, Utilities & Material Costs';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('expenses') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('expenses') ?></h4>
                        <p class="text-muted small mb-0">Total recorded expenses for <?= date('F Y', mktime(0, 0, 0, (int)$filterMonth, 1, (int)$filterYear)) ?>: <strong class="text-danger">RM <?= number_format($monthTotalExpenses, 2) ?></strong></p>
                    </div>
                    <div>
                        <button type="button" class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addExpenseModal">
                            <i class="fas fa-plus me-1"></i> Log Expense
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

                <!-- Filters Card -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">Select Month</label>
                            <select name="month" class="form-select" onchange="this.form.submit()">
                                <?php for ($m = 1; $m <= 12; $m++): 
                                    $mVal = sprintf('%02d', $m);
                                ?>
                                    <option value="<?= $mVal ?>" <?= ($filterMonth == $mVal) ? 'selected' : '' ?>><?= date('F', mktime(0, 0, 0, $m, 1)) ?></option>
                                <?php endfor; ?>
                            </select>
                        </div>
                        <div class="col-md-2">
                            <label class="form-label small fw-bold text-muted">Select Year</label>
                            <select name="year" class="form-select" onchange="this.form.submit()">
                                <?php for ($y = (int)date('Y'); $y >= (int)date('Y') - 4; $y--): ?>
                                    <option value="<?= $y ?>" <?= ($filterYear == $y) ? 'selected' : '' ?>><?= $y ?></option>
                                <?php endfor; ?>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label small fw-bold text-muted">Search Description</label>
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search expense description..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-3 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Filter</button>
                            <?php if (!empty($search) || $categoryFilter !== 'all'): ?>
                                <a href="expenses.php" class="btn btn-light border" title="Reset"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Category Breakdown Pills -->
                <?php if (!empty($catBreakdown)): ?>
                    <div class="row g-2 mb-4">
                        <?php foreach ($catBreakdown as $cat): ?>
                            <div class="col-sm-6 col-md-4 col-xl-2">
                                <div class="card-modern p-2 px-3">
                                    <span class="text-muted small text-truncate d-block" style="font-size: 0.75rem;"><?= htmlspecialchars($cat['category']) ?></span>
                                    <span class="fw-bold text-danger">RM <?= number_format((float)$cat['cat_total'], 2) ?></span>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    </div>
                <?php endif; ?>

                <!-- Expenses Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th># ID</th>
                                    <th>
                                        <a href="?month=<?= $filterMonth ?>&year=<?= $filterYear ?>&search=<?= urlencode($search) ?>&sort_by=e.created_at&sort_order=<?= ($sortBy === 'e.created_at' && $sortOrder === 'DESC') ? 'ASC' : 'DESC' ?>">
                                            Date & Time <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>Description</th>
                                    <th>Category</th>
                                    <th>Logged By</th>
                                    <th class="text-end">
                                        <a href="?month=<?= $filterMonth ?>&year=<?= $filterYear ?>&search=<?= urlencode($search) ?>&sort_by=e.amount&sort_order=<?= ($sortBy === 'e.amount' && $sortOrder === 'DESC') ? 'ASC' : 'DESC' ?>">
                                            Amount <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($expenses)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center py-5 text-muted">
                                            <i class="fas fa-receipt fa-3x opacity-25 mb-2 d-block"></i>
                                            No expenses logged for <?= date('F Y', mktime(0, 0, 0, (int)$filterMonth, 1, (int)$filterYear)) ?>.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($expenses as $exp): ?>
                                        <tr>
                                            <td class="fw-bold text-muted">#<?= $exp['id'] ?></td>
                                            <td>
                                                <span class="d-block fw-medium"><?= date('d M Y', strtotime($exp['created_at'])) ?></span>
                                                <small class="text-muted"><?= date('h:i A', strtotime($exp['created_at'])) ?></small>
                                            </td>
                                            <td>
                                                <div class="fw-bold"><?= htmlspecialchars($exp['description']) ?></div>
                                            </td>
                                            <td>
                                                <span class="badge badge-soft-warning">
                                                    <?= htmlspecialchars($exp['category']) ?>
                                                </span>
                                            </td>
                                            <td>
                                                <span class="badge bg-light text-dark border">
                                                    <i class="fas fa-user me-1"></i> <?= htmlspecialchars($exp['username'] ?? 'Admin') ?>
                                                </span>
                                            </td>
                                            <td class="text-end fw-bold fs-6 text-danger">
                                                RM <?= number_format((float)$exp['amount'], 2) ?>
                                            </td>
                                            <td class="text-end">
                                                <button type="button" class="btn btn-sm btn-light border text-danger" title="Delete Record" onclick="confirmDeleteExpense(<?= $exp['id'] ?>, '<?= htmlspecialchars(addslashes($exp['description'])) ?>', 'RM <?= number_format($exp['amount'], 2) ?>')">
                                                    <i class="fas fa-trash-alt"></i>
                                                </button>
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
                                <a class="page-link" href="?page=<?= $page - 1 ?>&month=<?= $filterMonth ?>&year=<?= $filterYear ?>&search=<?= urlencode($search) ?>">&laquo; Previous</a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&month=<?= $filterMonth ?>&year=<?= $filterYear ?>&search=<?= urlencode($search) ?>"><?= $p ?></a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&month=<?= $filterMonth ?>&year=<?= $filterYear ?>&search=<?= urlencode($search) ?>">Next &raquo;</a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Add Expense Modal -->
    <div class="modal fade" id="addExpenseModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-receipt text-danger me-2"></i> Log New Expense</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted">Expense Description *</label>
                            <input type="text" name="description" class="form-control" required placeholder="e.g., TNB Electricity Bill, A4 Paper Boxes" autofocus>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Amount (RM) *</label>
                                <input type="number" name="amount" class="form-control" required step="0.01" min="0.01" placeholder="0.00">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Category</label>
                                <select name="category" class="form-select">
                                    <option value="Utilities">Utilities (TNB, Water, Internet)</option>
                                    <option value="Supplies & Paper">Supplies & Paper</option>
                                    <option value="Machine Maintenance">Machine Maintenance & Ink</option>
                                    <option value="Rent">Shop Rent</option>
                                    <option value="Salaries">Salaries & Wages</option>
                                    <option value="Delivery / Transport">Delivery / Transport</option>
                                    <option value="Others">Others</option>
                                </select>
                            </div>
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

    <!-- Delete Expense Modal -->
    <div class="modal fade" id="deleteExpenseModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" id="deleteExpId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-danger"><i class="fas fa-trash-alt me-2"></i> Delete Expense</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small mb-1">Delete expense record for <strong id="deleteExpName">Expense</strong>?</p>
                        <div class="fw-bold text-danger fs-5" id="deleteExpAmt">RM 0.00</div>
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
        const deleteExpModal = new bootstrap.Modal(document.getElementById('deleteExpenseModal'));

        function confirmDeleteExpense(id, desc, amt) {
            document.getElementById('deleteExpId').value = id;
            document.getElementById('deleteExpName').innerText = desc;
            document.getElementById('deleteExpAmt').innerText = amt;
            deleteExpModal.show();
        }
    </script>
</body>
</html>