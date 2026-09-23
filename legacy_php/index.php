<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

$role = $_SESSION['role'] ?? 'cashier';
$username = $_SESSION['username'] ?? 'User';

// Greeting based on time of day
$hour = (int)date('H');
if ($hour < 12) {
    $greeting = "Good morning";
} elseif ($hour < 18) {
    $greeting = "Good afternoon";
} else {
    $greeting = "Good evening";
}

// Fetch Quick Stats
$totalProducts = 0;
$totalStaff = 0;
$todaySales = 0;
$todayRevenue = 0.00;
$lowStockCount = 0;

try {
    $totalProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active'")->fetchColumn();
    $lowStockCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active' AND stock <= threshold")->fetchColumn();
    
    if ($role == 'owner') {
        $totalStaff = (int)$pdo->query("SELECT COUNT(*) FROM users")->fetchColumn();
        $todayStmt = $pdo->query("SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as rev FROM sales WHERE status = 'completed' AND DATE(created_at) = CURDATE()");
        $todayData = $todayStmt->fetch();
        $todaySales = (int)$todayData['count'];
        $todayRevenue = (float)$todayData['rev'];
    }
} catch (Exception $e) {}

// Fetch recent 5 transactions
$recentSales = [];
if ($role == 'owner') {
    try {
        $recentStmt = $pdo->query("SELECT s.*, u.username FROM sales s JOIN users u ON s.user_id = u.id ORDER BY s.created_at DESC LIMIT 5");
        $recentSales = $recentStmt->fetchAll();
    } catch (Exception $e) {}
}

$pageTitle = __('home');
$pageSubtitle = __('overview');
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('home') ?> | <?= __('app_name') ?></title>
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
                <!-- Welcome Hero Banner -->
                <div class="card-modern p-4 mb-4" style="background: linear-gradient(135deg, rgba(79, 70, 229, 0.08) 0%, rgba(14, 165, 233, 0.12) 100%); border-left: 5px solid var(--brand-primary);">
                    <div class="row align-items-center">
                        <div class="col-lg-8">
                            <span class="badge badge-soft-primary mb-2 text-uppercase fw-bold"><?= date('l, d F Y') ?></span>
                            <h2 class="fw-bold mb-1"><?= $greeting ?>, <?= htmlspecialchars($username) ?>!</h2>
                            <p class="text-muted mb-0">Welcome to the <strong>Nolan Printing</strong> POS & Management Hub. Everything is running smoothly today.</p>
                        </div>
                        <div class="col-lg-4 text-lg-end mt-3 mt-lg-0">
                            <?php if ($role == 'owner' || $role == 'cashier'): ?>
                                <a href="pos.php" class="btn btn-primary px-4 py-2 shadow-sm me-2">
                                    <i class="fas fa-cash-register me-2"></i> Open POS
                                </a>
                            <?php endif; ?>
                            <?php if ($role == 'owner' || $role == 'stock_handler'): ?>
                                <a href="inventory.php" class="btn btn-outline-secondary px-3 py-2">
                                    <i class="fas fa-boxes-stacked me-2"></i> Inventory
                                </a>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>

                <!-- Stats Overview Row -->
                <div class="row g-3 mb-4">
                    <?php if ($role == 'owner'): ?>
                        <div class="col-sm-6 col-xl-3">
                            <div class="card-modern card-stat">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="stat-label">Today's Revenue</span>
                                    <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                                        <i class="fas fa-wallet"></i>
                                    </div>
                                </div>
                                <div class="stat-value text-primary">RM <?= number_format($todayRevenue, 2) ?></div>
                                <div class="d-flex align-items-center gap-1 text-muted small">
                                    <i class="fas fa-receipt me-1"></i> <?= $todaySales ?> orders completed today
                                </div>
                            </div>
                        </div>
                    <?php endif; ?>

                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="stat-label"><?= __('total_products') ?></span>
                                <div class="stat-icon bg-info bg-opacity-10 text-info">
                                    <i class="fas fa-box-open"></i>
                                </div>
                            </div>
                            <div class="stat-value"><?= $totalProducts ?></div>
                            <div class="d-flex align-items-center gap-1 text-muted small">
                                <span class="text-success fw-bold"><i class="fas fa-check-circle"></i> Active</span> in system
                            </div>
                        </div>
                    </div>

                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex align-items-center justify-content-between mb-2">
                                <span class="stat-label"><?= __('stock_alerts') ?></span>
                                <div class="stat-icon bg-danger bg-opacity-10 text-danger">
                                    <i class="fas fa-triangle-exclamation"></i>
                                </div>
                            </div>
                            <div class="stat-value <?= $lowStockCount > 0 ? 'text-danger' : 'text-success' ?>">
                                <?= $lowStockCount ?>
                            </div>
                            <div class="d-flex align-items-center gap-1 text-muted small">
                                <?php if ($lowStockCount > 0): ?>
                                    <a href="inventory.php" class="text-danger fw-semibold text-decoration-none">Items need restock &rarr;</a>
                                <?php else: ?>
                                    <span class="text-success fw-bold">Stock levels healthy</span>
                                <?php endif; ?>
                            </div>
                        </div>
                    </div>

                    <?php if ($role == 'owner'): ?>
                        <div class="col-sm-6 col-xl-3">
                            <div class="card-modern card-stat">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <span class="stat-label"><?= __('staff_accounts') ?></span>
                                    <div class="stat-icon bg-success bg-opacity-10 text-success">
                                        <i class="fas fa-users-gear"></i>
                                    </div>
                                </div>
                                <div class="stat-value"><?= $totalStaff ?></div>
                                <div class="d-flex align-items-center gap-1 text-muted small">
                                    <a href="users.php" class="text-decoration-none text-muted">Manage staff &rarr;</a>
                                </div>
                            </div>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Quick Action Hub -->
                <h5 class="fw-bold mb-3"><i class="fas fa-rocket text-primary me-2"></i> Quick Actions</h5>
                <div class="row g-3 mb-4">
                    <?php if ($role == 'owner' || $role == 'cashier'): ?>
                        <div class="col-md-4 col-xl-3">
                            <a href="pos.php" class="card-modern p-3 d-flex align-items-center gap-3 text-decoration-none text-body">
                                <div class="stat-icon bg-success bg-opacity-10 text-success">
                                    <i class="fas fa-cash-register fa-lg"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">POS Register</h6>
                                    <small class="text-muted">Start a checkout transaction</small>
                                </div>
                            </a>
                        </div>
                    <?php endif; ?>

                    <?php if ($role == 'owner' || $role == 'stock_handler'): ?>
                        <div class="col-md-4 col-xl-3">
                            <a href="inventory.php" class="card-modern p-3 d-flex align-items-center gap-3 text-decoration-none text-body">
                                <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                                    <i class="fas fa-box-open fa-lg"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Inventory Catalog</h6>
                                    <small class="text-muted">Manage items & stock levels</small>
                                </div>
                            </a>
                        </div>
                        <div class="col-md-4 col-xl-3">
                            <a href="print_barcode.php" class="card-modern p-3 d-flex align-items-center gap-3 text-decoration-none text-body">
                                <div class="stat-icon bg-secondary bg-opacity-10 text-secondary">
                                    <i class="fas fa-barcode fa-lg"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Print Barcodes</h6>
                                    <small class="text-muted">Generate product label sheets</small>
                                </div>
                            </a>
                        </div>
                    <?php endif; ?>

                    <?php if ($role == 'owner'): ?>
                        <div class="col-md-4 col-xl-3">
                            <a href="dashboard.php" class="card-modern p-3 d-flex align-items-center gap-3 text-decoration-none text-body">
                                <div class="stat-icon bg-info bg-opacity-10 text-info">
                                    <i class="fas fa-chart-pie fa-lg"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Dashboard Analytics</h6>
                                    <small class="text-muted">Real-time revenue & charts</small>
                                </div>
                            </a>
                        </div>
                        <div class="col-md-4 col-xl-3">
                            <a href="expenses.php" class="card-modern p-3 d-flex align-items-center gap-3 text-decoration-none text-body">
                                <div class="stat-icon bg-danger bg-opacity-10 text-danger">
                                    <i class="fas fa-receipt fa-lg"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Log Expense</h6>
                                    <small class="text-muted">Track store operational costs</small>
                                </div>
                            </a>
                        </div>
                        <div class="col-md-4 col-xl-3">
                            <a href="settings.php" class="card-modern p-3 d-flex align-items-center gap-3 text-decoration-none text-body">
                                <div class="stat-icon bg-warning bg-opacity-10 text-warning">
                                    <i class="fas fa-gear fa-lg"></i>
                                </div>
                                <div>
                                    <h6 class="fw-bold mb-0">Store Settings</h6>
                                    <small class="text-muted">Profile, tax & backups</small>
                                </div>
                            </a>
                        </div>
                    <?php endif; ?>
                </div>

                <!-- Recent Transactions Table for Owner -->
                <?php if ($role == 'owner' && !empty($recentSales)): ?>
                    <div class="table-modern-wrapper mt-4">
                        <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-body">
                            <h6 class="fw-bold mb-0"><i class="fas fa-clock-rotate-left text-muted me-2"></i> Recent Completed Sales</h6>
                            <a href="transactions.php" class="btn btn-sm btn-outline-primary">View All &rarr;</a>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-modern">
                                <thead>
                                    <tr>
                                        <th># ID</th>
                                        <th>Date & Time</th>
                                        <th>Cashier</th>
                                        <th>Payment</th>
                                        <th class="text-end">Amount</th>
                                        <th class="text-end">Receipt</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($recentSales as $sale): ?>
                                        <tr>
                                            <td class="fw-bold">#<?= $sale['id'] ?></td>
                                            <td><?= date('d M Y, h:i A', strtotime($sale['created_at'])) ?></td>
                                            <td><span class="badge badge-soft-primary"><?= htmlspecialchars($sale['username']) ?></span></td>
                                            <td><?= htmlspecialchars($sale['payment_method']) ?></td>
                                            <td class="text-end fw-bold text-primary">RM <?= number_format($sale['total'], 2) ?></td>
                                            <td class="text-end">
                                                <a href="receipt.php?id=<?= $sale['id'] ?>" target="_blank" class="btn btn-sm btn-light border">
                                                    <i class="fas fa-print me-1"></i> Receipt
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </div>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>