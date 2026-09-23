<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Access Denied: Owners Only."); 
}

$role = $_SESSION['role'];

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$actionFilter = $_GET['action_filter'] ?? 'all';

$limit = 15;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 'al.created_at';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'DESC') === 'ASC' ? 'ASC' : 'DESC';

$allowedSort = ['al.id', 'al.created_at', 'u.username', 'al.action', 'al.details'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 'al.created_at';
}

$conditions = [];
$params = [];

if (!empty($search)) {
    $conditions[] = "(al.action LIKE ? OR al.details LIKE ? OR u.username LIKE ?)";
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%"]);
}
if ($actionFilter !== 'all') {
    $conditions[] = "al.action LIKE ?";
    $params[] = "%$actionFilter%";
}

$whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM activity_log al LEFT JOIN users u ON al.user_id = u.id $whereClause");
$countStmt->execute($params);
$totalLogs = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalLogs / $limit));

$query = "SELECT al.*, u.username, u.full_name 
    FROM activity_log al 
    LEFT JOIN users u ON al.user_id = u.id 
    $whereClause 
    ORDER BY $sortBy $sortOrder 
    LIMIT $limit OFFSET $offset";

$stmt = $pdo->prepare($query);
$stmt->execute($params);
$logs = $stmt->fetchAll();

// Helper for Relative Time
function timeAgo($timestamp) {
    $time = strtotime($timestamp);
    $diff = time() - $time;
    if ($diff < 60) return "Just now";
    if ($diff < 3600) return floor($diff / 60) . " mins ago";
    if ($diff < 86400) return floor($diff / 3600) . " hours ago";
    if ($diff < 604800) return floor($diff / 86400) . " days ago";
    return date('d M Y', $time);
}

// Helper for Action Badge Styles
function getActionBadgeClass($action) {
    $act = strtolower($action);
    if (str_contains($act, 'sale') || str_contains($act, 'payment')) return 'badge-soft-success';
    if (str_contains($act, 'void') || str_contains($act, 'delete')) return 'badge-soft-danger';
    if (str_contains($act, 'stock') || str_contains($act, 'intake')) return 'badge-soft-warning';
    if (str_contains($act, 'user') || str_contains($act, 'login')) return 'badge-soft-primary';
    return 'badge-soft-info';
}

$pageTitle = __('audit_log');
$pageSubtitle = 'Security Traceability, Cashier Activity & Stock Adjustments';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('audit_log') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('audit_log') ?></h4>
                        <p class="text-muted small mb-0">Total <?= number_format($totalLogs) ?> system activities logged</p>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-center">
                        <div class="col-md-6">
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search by action, user, or details..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select name="action_filter" class="form-select" onchange="this.form.submit()">
                                <option value="all" <?= $actionFilter === 'all' ? 'selected' : '' ?>>All Action Types</option>
                                <option value="Sale" <?= $actionFilter === 'Sale' ? 'selected' : '' ?>>Sales & Transactions</option>
                                <option value="Void" <?= $actionFilter === 'Void' ? 'selected' : '' ?>>Void Operations</option>
                                <option value="Stock" <?= $actionFilter === 'Stock' ? 'selected' : '' ?>>Stock Adjustments</option>
                                <option value="Product" <?= $actionFilter === 'Product' ? 'selected' : '' ?>>Product Changes</option>
                                <option value="User" <?= $actionFilter === 'User' ? 'selected' : '' ?>>Staff & Login</option>
                                <option value="Expense" <?= $actionFilter === 'Expense' ? 'selected' : '' ?>>Expenses</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Search</button>
                            <?php if (!empty($search) || $actionFilter !== 'all'): ?>
                                <a href="logs.php" class="btn btn-light border"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Audit Log Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th># ID</th>
                                    <th>
                                        <a href="?search=<?= urlencode($search) ?>&action_filter=<?= $actionFilter ?>&sort_by=al.created_at&sort_order=<?= ($sortBy === 'al.created_at' && $sortOrder === 'DESC') ? 'ASC' : 'DESC' ?>">
                                            Timestamp <i class="fas fa-sort small opacity-50"></i>
                                        </a>
                                    </th>
                                    <th>User / Staff</th>
                                    <th>Action</th>
                                    <th>Event Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($logs)): ?>
                                    <tr>
                                        <td colspan="5" class="text-center py-5 text-muted">
                                            <i class="fas fa-shield-halved fa-3x opacity-25 mb-2 d-block"></i>
                                            No system activity logs found.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($logs as $l): ?>
                                        <tr>
                                            <td class="fw-bold text-muted">#<?= $l['id'] ?></td>
                                            <td>
                                                <span class="d-block fw-medium"><?= date('d M Y, h:i A', strtotime($l['created_at'])) ?></span>
                                                <small class="text-muted"><?= timeAgo($l['created_at']) ?></small>
                                            </td>
                                            <td>
                                                <div class="d-flex align-items-center gap-2">
                                                    <div class="user-avatar-sm" style="width: 28px; height: 28px; font-size: 0.75rem;">
                                                        <?= strtoupper(substr($l['username'] ?? 'S', 0, 1)) ?>
                                                    </div>
                                                    <span class="fw-semibold small">
                                                        <?= htmlspecialchars($l['username'] ?? 'System') ?>
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="badge <?= getActionBadgeClass($l['action']) ?>">
                                                    <?= htmlspecialchars($l['action']) ?>
                                                </span>
                                            </td>
                                            <td>
                                                <div class="fw-medium text-body" style="max-width: 450px;">
                                                    <?= htmlspecialchars($l['details']) ?>
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
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>&action_filter=<?= $actionFilter ?>">&laquo; Previous</a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>&action_filter=<?= $actionFilter ?>"><?= $p ?></a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>&action_filter=<?= $actionFilter ?>">Next &raquo;</a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>