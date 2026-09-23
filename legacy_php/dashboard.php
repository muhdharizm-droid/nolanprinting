<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    header("Location: login.php"); 
    exit; 
}

// RBAC: Only Owners can access the Executive Dashboard
if ($_SESSION['role'] !== 'owner') {
    if ($_SESSION['role'] === 'stock_handler') {
        header("Location: inventory.php");
    } else {
        header("Location: pos.php");
    }
    exit;
}

$role = $_SESSION['role'];

// Filtering Logic
$filterMode = $_GET['filter_mode'] ?? 'monthly';

if ($filterMode === 'yearly') {
    $year = $_GET['year'] ?? date('Y');
    $startDate = "$year-01-01";
    $endDate = "$year-12-31";
    $groupBy = "%Y-%m"; 
} elseif ($filterMode === 'daily') {
    $date = $_GET['day'] ?? date('Y-m-d');
    $startDate = $date;
    $endDate = $date;
    $groupBy = "%H:00"; 
} elseif ($filterMode === 'custom') {
    $startDate = $_GET['start_date'] ?? date('Y-m-01');
    $endDate = $_GET['end_date'] ?? date('Y-m-d');
    $groupBy = "%Y-%m-%d";
} else { // Monthly Default
    $month = $_GET['month'] ?? date('m');
    $year = $_GET['year'] ?? date('Y');
    $startDate = "$year-$month-01";
    $endDate = date("Y-m-t", strtotime($startDate));
    $groupBy = "%Y-%m-%d";
}

// 1. Total Revenue in Period
$revStmt = $pdo->prepare("SELECT COALESCE(SUM(total), 0) FROM sales WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ?");
$revStmt->execute([$startDate, $endDate]);
$totalRevenue = (float)$revStmt->fetchColumn();

// 2. Total Completed Orders in Period
$ordersStmt = $pdo->prepare("SELECT COUNT(*) FROM sales WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ?");
$ordersStmt->execute([$startDate, $endDate]);
$totalOrders = (int)$ordersStmt->fetchColumn();

// 3. COGS for Period
$cogsStmt = $pdo->prepare("SELECT COALESCE(SUM(si.quantity * si.cost_at_sale), 0) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ?");
$cogsStmt->execute([$startDate, $endDate]);
$totalCogs = (float)$cogsStmt->fetchColumn();

// 4. Expenses for Period
$expStmt = $pdo->prepare("SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE DATE(created_at) BETWEEN ? AND ?");
$expStmt->execute([$startDate, $endDate]);
$totalExpenses = (float)$expStmt->fetchColumn();

// 5. Net Profit
$grossProfit = $totalRevenue - $totalCogs;
$netProfit = $grossProfit - $totalExpenses;
$profitMargin = $totalRevenue > 0 ? round(($netProfit / $totalRevenue) * 100, 1) : 0;

// 6. Active Products & Low Stock Alerts
$activeProducts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active'")->fetchColumn();
$stockAlerts = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active' AND is_service = 0 AND stock <= threshold")->fetchColumn();

// 7. Time-series Data for Charts
$salesData = [];
$timeSeriesStmt = $pdo->prepare("SELECT DATE_FORMAT(created_at, '$groupBy') as period, SUM(total) as total FROM sales WHERE status = 'completed' AND DATE(created_at) BETWEEN ? AND ? GROUP BY period ORDER BY period ASC");
$timeSeriesStmt->execute([$startDate, $endDate]);
foreach ($timeSeriesStmt->fetchAll() as $row) { 
    $salesData[$row['period']] = (float)$row['total']; 
}

$cogsMap = [];
$cogsSeriesStmt = $pdo->prepare("SELECT DATE_FORMAT(s.created_at, '$groupBy') as period, SUM(si.quantity * si.cost_at_sale) as cogs FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ? GROUP BY period");
$cogsSeriesStmt->execute([$startDate, $endDate]);
foreach ($cogsSeriesStmt->fetchAll() as $row) { 
    $cogsMap[$row['period']] = (float)$row['cogs']; 
}

$expMap = [];
$expSeriesStmt = $pdo->prepare("SELECT DATE_FORMAT(created_at, '$groupBy') as period, SUM(amount) as exp FROM expenses WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY period");
$expSeriesStmt->execute([$startDate, $endDate]);
foreach ($expSeriesStmt->fetchAll() as $row) { 
    $expMap[$row['period']] = (float)$row['exp']; 
}

$profitData = [];
foreach ($salesData as $period => $val) {
    $profitData[$period] = $val - ($cogsMap[$period] ?? 0) - ($expMap[$period] ?? 0);
}

if (empty($salesData)) {
    $salesData[date('Y-m-d')] = 0;
    $profitData[date('Y-m-d')] = 0;
}

$chartLabels = json_encode(array_keys($salesData));
$revChartData = json_encode(array_values($salesData));
$profChartData = json_encode(array_values($profitData));

// 8. Category Sales Distribution (Donut Chart)
$catPerf = $pdo->prepare("SELECT COALESCE(c.name, 'Printing Services') as category, SUM(si.quantity * si.price_at_sale) as total_sold 
    FROM sale_items si 
    JOIN products p ON si.product_id = p.id 
    LEFT JOIN categories c ON p.category_id = c.id 
    JOIN sales s ON si.sale_id = s.id 
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ? 
    GROUP BY category 
    ORDER BY total_sold DESC LIMIT 6");
$catPerf->execute([$startDate, $endDate]);
$catData = $catPerf->fetchAll();

$pieLabels = json_encode(array_column($catData, 'category'));
$pieData = json_encode(array_map('floatval', array_column($catData, 'total_sold')));

// 9. Top Selling Products
$topProductsStmt = $pdo->prepare("SELECT p.name, COALESCE(c.name, 'Service') as category, SUM(si.quantity) as total_qty, SUM(si.quantity * si.price_at_sale) as total_rev 
    FROM sale_items si 
    JOIN products p ON si.product_id = p.id 
    LEFT JOIN categories c ON p.category_id = c.id 
    JOIN sales s ON si.sale_id = s.id 
    WHERE s.status = 'completed' AND DATE(s.created_at) BETWEEN ? AND ? 
    GROUP BY p.id 
    ORDER BY total_qty DESC LIMIT 5");
$topProductsStmt->execute([$startDate, $endDate]);
$topProducts = $topProductsStmt->fetchAll();

// 10. Low Stock Alert Items for Widget
$lowStockItems = $pdo->query("SELECT id, name, stock, threshold FROM products WHERE status = 'active' AND is_service = 0 AND stock <= threshold ORDER BY stock ASC LIMIT 4")->fetchAll();

$pageTitle = __('dashboard');
$pageSubtitle = 'Real-Time Financial Analytics & Sales Performance';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('dashboard') ?> | <?= __('app_name') ?></title>
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
                <!-- Date Period Filter Bar -->
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
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-muted">Select Month</label>
                                <select name="month" class="form-select" onchange="this.form.submit()">
                                    <?php for ($m = 1; $m <= 12; $m++): 
                                        $mVal = sprintf('%02d', $m);
                                        $mSelected = ($month == $mVal) ? 'selected' : '';
                                    ?>
                                        <option value="<?= $mVal ?>" <?= $mSelected ?>><?= date('F', mktime(0, 0, 0, $m, 1)) ?></option>
                                    <?php endfor; ?>
                                </select>
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small fw-bold text-muted">Select Year</label>
                                <select name="year" class="form-select" onchange="this.form.submit()">
                                    <?php for ($y = (int)date('Y'); $y >= (int)date('Y') - 4; $y--): ?>
                                        <option value="<?= $y ?>" <?= ($year == $y) ? 'selected' : '' ?>><?= $y ?></option>
                                    <?php endfor; ?>
                                </select>
                            </div>
                        <?php endif; ?>

                        <?php if ($filterMode === 'yearly'): ?>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-muted">Select Year</label>
                                <select name="year" class="form-select" onchange="this.form.submit()">
                                    <?php for ($y = (int)date('Y'); $y >= (int)date('Y') - 4; $y--): ?>
                                        <option value="<?= $y ?>" <?= ($year == $y) ? 'selected' : '' ?>><?= $y ?></option>
                                    <?php endfor; ?>
                                </select>
                            </div>
                        <?php endif; ?>

                        <?php if ($filterMode === 'daily'): ?>
                            <div class="col-md-4">
                                <label class="form-label small fw-bold text-muted">Select Date</label>
                                <input type="date" name="day" class="form-control" value="<?= htmlspecialchars($_GET['day'] ?? date('Y-m-d')) ?>" onchange="this.form.submit()">
                            </div>
                        <?php endif; ?>

                        <?php if ($filterMode === 'custom'): ?>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-muted">From Date</label>
                                <input type="date" name="start_date" class="form-control" value="<?= htmlspecialchars($startDate) ?>" onchange="this.form.submit()">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small fw-bold text-muted">To Date</label>
                                <input type="date" name="end_date" class="form-control" value="<?= htmlspecialchars($endDate) ?>" onchange="this.form.submit()">
                            </div>
                        <?php endif; ?>

                        <div class="col-md-3 ms-auto text-md-end">
                            <span class="badge badge-soft-primary px-3 py-2">
                                <i class="far fa-calendar-alt me-1"></i> <?= date('d M Y', strtotime($startDate)) ?> &ndash; <?= date('d M Y', strtotime($endDate)) ?>
                            </span>
                        </div>
                    </form>
                </div>

                <!-- KPI Metric Cards -->
                <div class="row g-3 mb-4">
                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label"><?= __('revenue') ?></span>
                                <div class="stat-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-wallet"></i></div>
                            </div>
                            <div class="stat-value text-primary">RM <?= number_format($totalRevenue, 2) ?></div>
                            <small class="text-muted"><i class="fas fa-receipt me-1"></i> <?= $totalOrders ?> orders completed</small>
                        </div>
                    </div>

                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label"><?= __('net_profit') ?></span>
                                <div class="stat-icon bg-success bg-opacity-10 text-success"><i class="fas fa-sack-dollar"></i></div>
                            </div>
                            <div class="stat-value <?= $netProfit >= 0 ? 'text-success' : 'text-danger' ?>">
                                RM <?= number_format($netProfit, 2) ?>
                            </div>
                            <small class="text-muted">Margin: <strong class="text-success"><?= $profitMargin ?>%</strong></small>
                        </div>
                    </div>

                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label"><?= __('cogs') ?></span>
                                <div class="stat-icon bg-danger bg-opacity-10 text-danger"><i class="fas fa-boxes-packing"></i></div>
                            </div>
                            <div class="stat-value text-danger">RM <?= number_format($totalCogs, 2) ?></div>
                            <small class="text-muted">Expenses: RM <?= number_format($totalExpenses, 2) ?></small>
                        </div>
                    </div>

                    <div class="col-sm-6 col-xl-3">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label"><?= __('stock_alerts') ?></span>
                                <div class="stat-icon bg-warning bg-opacity-10 text-warning"><i class="fas fa-triangle-exclamation"></i></div>
                            </div>
                            <div class="stat-value <?= $stockAlerts > 0 ? 'text-warning' : 'text-success' ?>">
                                <?= $stockAlerts ?>
                            </div>
                            <small class="text-muted">Catalog items: <?= $activeProducts ?></small>
                        </div>
                    </div>
                </div>

                <!-- Charts Row -->
                <div class="row g-4 mb-4">
                    <div class="col-lg-8">
                        <div class="card-modern p-4 h-100">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <div>
                                    <h5 class="fw-bold mb-0"><?= __('revenue_trend') ?></h5>
                                    <small class="text-muted">Revenue & Net Profit comparison</small>
                                </div>
                                <span class="badge badge-soft-primary"><?= ucfirst($filterMode) ?></span>
                            </div>
                            <div style="height: 320px; position: relative;">
                                <canvas id="revenueProfitChart"></canvas>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-4">
                        <div class="card-modern p-4 h-100">
                            <h5 class="fw-bold mb-1"><?= __('category_share') ?></h5>
                            <small class="text-muted d-block mb-3">Sales volume distribution</small>
                            <div style="height: 280px; position: relative;">
                                <canvas id="categoryDonutChart"></canvas>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Widgets Row -->
                <div class="row g-4">
                    <!-- Top Selling Products -->
                    <div class="col-lg-7">
                        <div class="table-modern-wrapper h-100">
                            <div class="p-3 border-bottom d-flex justify-content-between align-items-center bg-body">
                                <h6 class="fw-bold mb-0"><i class="fas fa-fire text-danger me-2"></i> Top Performing Products & Services</h6>
                                <a href="reports.php" class="btn btn-sm btn-link text-primary text-decoration-none p-0">Full Report &rarr;</a>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-modern mb-0">
                                    <thead>
                                        <tr>
                                            <th>Product / Service</th>
                                            <th>Category</th>
                                            <th class="text-center">Units Sold</th>
                                            <th class="text-end">Revenue Generated</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php if (empty($topProducts)): ?>
                                            <tr>
                                                <td colspan="4" class="text-center py-4 text-muted">No sales records in this timeframe.</td>
                                            </tr>
                                        <?php else: ?>
                                            <?php foreach ($topProducts as $tp): ?>
                                                <tr>
                                                    <td class="fw-bold"><?= htmlspecialchars($tp['name']) ?></td>
                                                    <td><span class="badge badge-soft-info"><?= htmlspecialchars($tp['category']) ?></span></td>
                                                    <td class="text-center fw-bold"><?= number_format($tp['total_qty']) ?></td>
                                                    <td class="text-end fw-bold text-primary">RM <?= number_format($tp['total_rev'], 2) ?></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        <?php endif; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <!-- Low Stock Alerts Quick Widget -->
                    <div class="col-lg-5">
                        <div class="card-modern p-4 h-100">
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <h6 class="fw-bold mb-0 text-danger"><i class="fas fa-bell me-2"></i> Low Stock Action List</h6>
                                <a href="inventory.php" class="btn btn-sm btn-outline-danger">Manage All</a>
                            </div>
                            <?php if (empty($lowStockItems)): ?>
                                <div class="text-center py-5 text-muted">
                                    <i class="fas fa-circle-check text-success fa-3x mb-2 d-block"></i>
                                    <p class="mb-0 fw-semibold text-success">All inventory levels healthy!</p>
                                    <small>No stock is currently at or below minimum threshold.</small>
                                </div>
                            <?php else: ?>
                                <div class="list-group list-group-flush">
                                    <?php foreach ($lowStockItems as $item): ?>
                                        <div class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center border-bottom">
                                            <div>
                                                <div class="fw-bold small"><?= htmlspecialchars($item['name']) ?></div>
                                                <small class="text-danger fw-semibold">Only <?= $item['stock'] ?> left (Min: <?= $item['threshold'] ?>)</small>
                                            </div>
                                            <a href="inventory.php?search=<?= urlencode($item['name']) ?>" class="btn btn-sm btn-primary">
                                                <i class="fas fa-plus me-1"></i> Restock
                                            </a>
                                        </div>
                                    <?php endforeach; ?>
                                </div>
                            <?php endif; ?>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        // Line Area Chart: Revenue & Profit
        const revCtx = document.getElementById('revenueProfitChart').getContext('2d');
        const revGrad = revCtx.createLinearGradient(0, 0, 0, 300);
        revGrad.addColorStop(0, 'rgba(79, 70, 229, 0.25)');
        revGrad.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

        const profGrad = revCtx.createLinearGradient(0, 0, 0, 300);
        profGrad.addColorStop(0, 'rgba(16, 185, 129, 0.25)');
        profGrad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        new Chart(revCtx, {
            type: 'line',
            data: {
                labels: <?= $chartLabels ?>,
                datasets: [
                    {
                        label: 'Revenue (RM)',
                        data: <?= $revChartData ?>,
                        borderColor: '#4f46e5',
                        backgroundColor: revGrad,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Net Profit (RM)',
                        data: <?= $profChartData ?>,
                        borderColor: '#10b981',
                        backgroundColor: profGrad,
                        tension: 0.35,
                        fill: true,
                        pointRadius: 3,
                        pointHoverRadius: 6
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.dataset.label}: RM ${ctx.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2})}`
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

        // Donut Chart: Category Share
        const catCtx = document.getElementById('categoryDonutChart').getContext('2d');
        new Chart(catCtx, {
            type: 'doughnut',
            data: {
                labels: <?= $pieLabels ?>,
                datasets: [{
                    data: <?= $pieData ?>,
                    backgroundColor: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12 } },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` RM ${ctx.parsed.toLocaleString(undefined, {minimumFractionDigits: 2})}`
                        }
                    }
                },
                cutout: '68%'
            }
        });
    </script>
</body>
</html>