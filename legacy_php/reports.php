<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Access Denied: Owners Only."); 
}

$role = $_SESSION['role'];

// Filtering Logic
$filterMode = $_GET['filter_mode'] ?? 'monthly';
$cashierId = $_GET['cashier_id'] ?? 'all';

if ($filterMode === 'yearly') {
    $year = $_GET['year'] ?? date('Y');
    $startDate = "$year-01-01";
    $endDate = "$year-12-31";
} elseif ($filterMode === 'daily') {
    $date = $_GET['day'] ?? date('Y-m-d');
    $startDate = $date;
    $endDate = $date;
} elseif ($filterMode === 'custom') {
    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate = $_GET['end_date'] ?? date('Y-m-d');
} else { // Monthly Default
    $month = $_GET['month'] ?? date('m');
    $year = $_GET['year'] ?? date('Y');
    $startDate = "$year-$month-01";
    $endDate = date("Y-m-t", strtotime($startDate));
}

// Fetch Cashiers for dropdown filter
$cashiers = $pdo->query("SELECT id, username, full_name FROM users ORDER BY username ASC")->fetchAll();

// Build Sales Query
$sql = "SELECT s.*, u.username, u.full_name FROM sales s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?";
$params = [$startDate, $endDate];

if ($cashierId !== 'all') {
    $sql .= " AND s.user_id = ?";
    $params[] = (int)$cashierId;
}
$sql .= " ORDER BY s.created_at DESC";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$sales = $stmt->fetchAll();

// 1. Revenue & Orders
$totalRevenue = array_sum(array_column($sales, 'total'));
$totalOrders = count($sales);

// 2. COGS (Cost of Goods Sold)
$cogsQuery = "SELECT COALESCE(SUM(si.quantity * si.cost_at_sale), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?";
$cogsParams = [$startDate, $endDate];
if ($cashierId !== 'all') {
    $cogsQuery .= " AND s.user_id = ?";
    $cogsParams[] = (int)$cashierId;
}
$cogsStmt = $pdo->prepare($cogsQuery);
$cogsStmt->execute($cogsParams);
$totalCogs = (float)$cogsStmt->fetchColumn();

// 3. Operating Expenses
$expStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE DATE(created_at) BETWEEN ? AND ?");
$expStmt->execute([$startDate, $endDate]);
$totalExpenses = (float)$expStmt->fetchColumn();

// 4. Financial Calculations
$grossProfit = $totalRevenue - $totalCogs;
$netProfit = $grossProfit - $totalExpenses;
$profitMargin = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 1) : 0;

// 5. Cashier Performance (Bar Chart)
$cashierPerf = $pdo->prepare("SELECT u.username, SUM(s.total) as total_sales, COUNT(s.id) as order_count 
    FROM sales s 
    JOIN users u ON s.user_id = u.id 
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ? 
    GROUP BY u.id 
    ORDER BY total_sales DESC");
$cashierPerf->execute([$startDate, $endDate]);
$cashierData = $cashierPerf->fetchAll();

$cashierLabels = json_encode(array_column($cashierData, 'username'));
$cashierTotals = json_encode(array_map('floatval', array_column($cashierData, 'total_sales')));

// 6. Payment Methods Breakdown (Donut Chart)
$paymentPerf = $pdo->prepare("SELECT payment_method, SUM(total) as amount, COUNT(id) as count 
    FROM sales 
    WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ? 
    GROUP BY payment_method");
$paymentPerf->execute([$startDate, $endDate]);
$paymentData = $paymentPerf->fetchAll();

$paymentLabels = json_encode(array_column($paymentData, 'payment_method'));
$paymentAmounts = json_encode(array_map('floatval', array_column($paymentData, 'amount')));

// 7. Stock Intake Timeline in Period
$intakeStmt = $pdo->prepare("SELECT si.quantity, si.created_at, p.name as product_name, COALESCE(c.name, 'General') as category_name 
    FROM stock_intake si 
    JOIN products p ON si.product_id = p.id 
    LEFT JOIN categories c ON p.category_id = c.id 
    WHERE DATE(si.created_at) BETWEEN ? AND ? 
    ORDER BY si.created_at ASC");
$intakeStmt->execute([$startDate, $endDate]);
$intakeData = $intakeStmt->fetchAll();

$intakeLabels = json_encode(array_map(function($r) { 
    return date('d M H:i', strtotime($r['created_at'])) . ' (' . $r['product_name'] . ')'; 
}, $intakeData));
$intakeValues = json_encode(array_map('intval', array_column($intakeData, 'quantity')));

$pageTitle = __('analytics');
$pageSubtitle = 'Financial Statements, Cashier Audits & Inventory Intake Trends';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('analytics') ?> | <?= __('app_name') ?></title>
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
                <!-- Header Actions -->
                <div class="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
                    <div>
                        <h4 class="fw-bold mb-1"><?= __('analytics') ?></h4>
                        <p class="text-muted small mb-0">Period: <strong><?= date('d M Y', strtotime($startDate)) ?> &ndash; <?= date('d M Y', strtotime($endDate)) ?></strong></p>
                    </div>
                    <div class="d-flex gap-2">
                        <a href="export_excel.php?<?= http_build_query($_GET) ?>" class="btn btn-success shadow-sm">
                            <i class="fas fa-file-excel me-1"></i> <?= __('export_excel') ?>
                        </a>
                    </div>
                </div>

                <!-- Filters Card -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-end">
                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted"><?= __('filter_mode') ?></label>
                            <select name="filter_mode" class="form-select" onchange="this.form.submit()">
                                <option value="daily" <?= $filterMode === 'daily' ? 'selected' : '' ?>><?= __('daily') ?></option>
                                <option value="monthly" <?= $filterMode === 'monthly' ? 'selected' : '' ?>><?= __('monthly') ?></option>
                                <option value="yearly" <?= $filterMode === 'yearly' ? 'selected' : '' ?>><?= __('yearly') ?></option>
                                <option value="custom" <?= $filterMode === 'custom' ? 'selected' : '' ?>><?= __('custom_range') ?></option>
                            </select>
                        </div>

                        <?php if ($filterMode === 'monthly'): ?>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-muted">Month</label>
                                <select name="month" class="form-select" onchange="this.form.submit()">
                                    <?php for ($m = 1; $m <= 12; $m++): 
                                        $mVal = sprintf('%02d', $m);
                                    ?>
                                        <option value="<?= $mVal ?>" <?= ($month == $mVal) ? 'selected' : '' ?>><?= date('F', mktime(0, 0, 0, $m, 1)) ?></option>
                                    <?php endfor; ?>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-muted">Year</label>
                                <select name="year" class="form-select" onchange="this.form.submit()">
                                    <?php for ($y = (int)date('Y'); $y >= (int)date('Y') - 4; $y--): ?>
                                        <option value="<?= $y ?>" <?= ($year == $y) ? 'selected' : '' ?>><?= $y ?></option>
                                    <?php endfor; ?>
                                </select>
                            </div>
                        <?php endif; ?>

                        <?php if ($filterMode === 'yearly'): ?>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-muted">Year</label>
                                <select name="year" class="form-select" onchange="this.form.submit()">
                                    <?php for ($y = (int)date('Y'); $y >= (int)date('Y') - 4; $y--): ?>
                                        <option value="<?= $y ?>" <?= ($year == $y) ? 'selected' : '' ?>><?= $y ?></option>
                                    <?php endfor; ?>
                                </select>
                            </div>
                        <?php endif; ?>

                        <?php if ($filterMode === 'daily'): ?>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-muted">Day</label>
                                <input type="date" name="day" class="form-control" value="<?= htmlspecialchars($_GET['day'] ?? date('Y-m-d')) ?>" onchange="this.form.submit()">
                            </div>
                        <?php endif; ?>

                        <?php if ($filterMode === 'custom'): ?>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-muted"><?= __('start_date') ?></label>
                                <input type="date" name="start_date" class="form-control" value="<?= htmlspecialchars($startDate) ?>" onchange="this.form.submit()">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-muted"><?= __('end_date') ?></label>
                                <input type="date" name="end_date" class="form-control" value="<?= htmlspecialchars($endDate) ?>" onchange="this.form.submit()">
                            </div>
                        <?php endif; ?>

                        <div class="col-md-3">
                            <label class="form-label small fw-bold text-muted">Filter Cashier</label>
                            <select name="cashier_id" class="form-select" onchange="this.form.submit()">
                                <option value="all">All Cashiers & Staff</option>
                                <?php foreach ($cashiers as $c): ?>
                                    <option value="<?= $c['id'] ?>" <?= $cashierId == $c['id'] ? 'selected' : '' ?>><?= htmlspecialchars($c['username']) ?> (<?= htmlspecialchars($c['full_name']) ?>)</option>
                                <?php endforeach; ?>
                            </select>
                        </div>

                        <div class="col-md-2">
                            <button type="submit" class="btn btn-primary w-100"><i class="fas fa-filter me-1"></i> Apply</button>
                        </div>
                    </form>
                </div>

                <!-- Financial Statement Summary Cards -->
                <div class="row g-3 mb-4">
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <span class="stat-label"><?= __('revenue') ?></span>
                            <div class="stat-value text-primary mt-1">RM <?= number_format($totalRevenue, 2) ?></div>
                            <small class="text-muted"><?= $totalOrders ?> orders in period</small>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <span class="stat-label"><?= __('cogs') ?></span>
                            <div class="stat-value text-danger mt-1">RM <?= number_format($totalCogs, 2) ?></div>
                            <small class="text-muted">Product purchase cost</small>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <span class="stat-label"><?= __('expenses') ?></span>
                            <div class="stat-value text-warning mt-1">RM <?= number_format($totalExpenses, 2) ?></div>
                            <small class="text-muted">Operating overhead</small>
                        </div>
                    </div>
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <span class="stat-label"><?= __('net_profit') ?></span>
                            <div class="stat-value text-success mt-1">RM <?= number_format($netProfit, 2) ?></div>
                            <small class="text-success fw-bold">Margin: <?= $profitMargin ?>%</small>
                        </div>
                    </div>
                </div>

                <!-- Performance Charts -->
                <div class="row g-4 mb-4">
                    <div class="col-lg-6">
                        <div class="card-modern p-4 h-100">
                            <h5 class="fw-bold mb-1"><i class="fas fa-users-gear text-primary me-2"></i> <?= __('cashier_breakdown') ?></h5>
                            <small class="text-muted d-block mb-3">Revenue processed per staff member</small>
                            <div style="height: 280px; position: relative;">
                                <canvas id="cashierChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-6">
                        <div class="card-modern p-4 h-100">
                            <h5 class="fw-bold mb-1"><i class="fas fa-credit-card text-success me-2"></i> <?= __('payment_breakdown') ?></h5>
                            <small class="text-muted d-block mb-3">Payment method distribution</small>
                            <div style="height: 280px; position: relative;">
                                <canvas id="paymentChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Stock Intake Timeline Chart -->
                <?php if (!empty($intakeData)): ?>
                    <div class="card-modern p-4 mb-4">
                        <h5 class="fw-bold mb-1"><i class="fas fa-truck-loading text-info me-2"></i> <?= __('stock_intake_timeline') ?></h5>
                        <small class="text-muted d-block mb-3">Units of inventory replenished over selected period</small>
                        <div style="height: 260px; position: relative;">
                            <canvas id="intakeChart"></canvas>
                        </div>
                    </div>
                <?php endif; ?>

                <!-- Detailed Sales Table -->
                <div class="table-modern-wrapper">
                    <div class="p-3 border-bottom bg-body d-flex justify-content-between align-items-center">
                        <h6 class="fw-bold mb-0"><i class="fas fa-list text-muted me-2"></i> Sales Transactions for Selected Period</h6>
                        <span class="badge badge-soft-primary"><?= count($sales) ?> transactions</span>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th># ID</th>
                                    <th>Date & Time</th>
                                    <th>Cashier</th>
                                    <th>Payment Method</th>
                                    <th class="text-end">Amount</th>
                                    <th class="text-end">Receipt</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($sales)): ?>
                                    <tr>
                                        <td colspan="6" class="text-center py-5 text-muted">
                                            <i class="fas fa-folder-open fa-3x opacity-25 mb-2 d-block"></i>
                                            No sales found for the selected period and cashier.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($sales as $s): ?>
                                        <tr>
                                            <td class="fw-bold">#<?= sprintf('%06d', $s['id']) ?></td>
                                            <td><?= date('d M Y, h:i A', strtotime($s['created_at'])) ?></td>
                                            <td>
                                                <span class="badge badge-soft-primary">
                                                    <?= htmlspecialchars($s['username']) ?>
                                                </span>
                                            </td>
                                            <td><?= htmlspecialchars($s['payment_method']) ?></td>
                                            <td class="text-end fw-bold text-primary">RM <?= number_format($s['total'], 2) ?></td>
                                            <td class="text-end">
                                                <a href="receipt.php?id=<?= $s['id'] ?>" target="_blank" class="btn btn-sm btn-light border">
                                                    <i class="fas fa-print me-1"></i> Receipt
                                                </a>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        // Cashier Bar Chart
        const cashierCtx = document.getElementById('cashierChart').getContext('2d');
        new Chart(cashierCtx, {
            type: 'bar',
            data: {
                labels: <?= $cashierLabels ?>,
                datasets: [{
                    label: 'Sales (RM)',
                    data: <?= $cashierTotals ?>,
                    backgroundColor: '#4f46e5',
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` RM ${ctx.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2})}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (v) => 'RM ' + v.toLocaleString() }
                    }
                }
            }
        });

        // Payment Method Donut Chart
        const paymentCtx = document.getElementById('paymentChart').getContext('2d');
        new Chart(paymentCtx, {
            type: 'doughnut',
            data: {
                labels: <?= $paymentLabels ?>,
                datasets: [{
                    data: <?= $paymentAmounts ?>,
                    backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` RM ${ctx.parsed.toLocaleString(undefined, {minimumFractionDigits: 2})}`
                        }
                    }
                },
                cutout: '65%'
            }
        });

        <?php if (!empty($intakeData)): ?>
        // Stock Intake Bar Chart
        const intakeCtx = document.getElementById('intakeChart').getContext('2d');
        new Chart(intakeCtx, {
            type: 'bar',
            data: {
                labels: <?= $intakeLabels ?>,
                datasets: [{
                    label: 'Units Restocked',
                    data: <?= $intakeValues ?>,
                    backgroundColor: '#06b6d4',
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { beginAtZero: true },
                    x: { ticks: { maxRotation: 45, minRotation: 0 } }
                }
            }
        });
        <?php endif; ?>
    </script>
</body>
</html>