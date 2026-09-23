<?php
if (!isset($pageTitle)) {
    $pageTitle = 'Nolan Printing';
}
if (!isset($pageSubtitle)) {
    $pageSubtitle = '';
}

// Low stock items preview for notification bell
$lowStockAlerts = [];
try {
    $lowStockStmt = $pdo->query("SELECT id, name, stock, threshold FROM products WHERE status = 'active' AND stock <= threshold ORDER BY stock ASC LIMIT 5");
    $lowStockAlerts = $lowStockStmt->fetchAll();
} catch (Exception $e) {}
?>

<header class="topbar">
    <div class="d-flex align-items-center gap-3">
        <button class="btn btn-icon btn-light border sidebar-toggler" type="button" aria-label="Toggle navigation">
            <i class="fas fa-bars"></i>
        </button>
        <div>
            <h5 class="fw-bold mb-0 text-truncate" style="letter-spacing: -0.01em;"><?= htmlspecialchars($pageTitle) ?></h5>
            <?php if (!empty($pageSubtitle)): ?>
                <span class="text-muted small"><?= htmlspecialchars($pageSubtitle) ?></span>
            <?php endif; ?>
        </div>
    </div>

    <div class="d-flex align-items-center gap-2">
        <!-- Live Real-Time Clock -->
        <div class="d-none d-md-flex align-items-center gap-2 px-3 py-1 bg-body rounded-pill border small fw-medium text-muted">
            <i class="far fa-clock text-primary"></i>
            <span class="live-clock">--:--:--</span>
        </div>

        <!-- Low Stock Notification Bell Dropdown -->
        <?php if (in_array($_SESSION['role'] ?? '', ['owner', 'stock_handler'])): ?>
        <div class="dropdown">
            <button class="btn btn-icon btn-light border position-relative" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Stock Alerts" title="Stock Alerts">
                <i class="fas fa-bell <?= count($lowStockAlerts) > 0 ? 'text-danger' : 'text-secondary' ?>"></i>
                <?php if (count($lowStockAlerts) > 0): ?>
                    <span class="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle pulse-badge">
                        <span class="visually-hidden">New alerts</span>
                    </span>
                <?php endif; ?>
            </button>
            <div class="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2" style="width: 300px; border-radius: 14px;">
                <div class="d-flex justify-content-between align-items-center px-2 py-1 mb-1 border-bottom">
                    <span class="fw-bold small text-uppercase text-muted"><?= __('stock_alerts') ?></span>
                    <span class="badge bg-danger rounded-pill"><?= count($lowStockAlerts) ?></span>
                </div>
                <?php if (empty($lowStockAlerts)): ?>
                    <div class="text-center py-3 text-muted small">
                        <i class="fas fa-check-circle text-success fa-2x mb-2 d-block"></i>
                        All stock levels are healthy!
                    </div>
                <?php else: ?>
                    <div class="list-group list-group-flush">
                        <?php foreach($lowStockAlerts as $alert): ?>
                            <a href="inventory.php?search=<?= urlencode($alert['name']) ?>" class="list-group-item list-group-item-action px-2 py-2 border-0 rounded d-flex justify-content-between align-items-center">
                                <div class="text-truncate me-2">
                                    <div class="fw-semibold small text-truncate"><?= htmlspecialchars($alert['name']) ?></div>
                                    <small class="text-danger fw-bold">Left: <?= $alert['stock'] ?> (Limit: <?= $alert['threshold'] ?>)</small>
                                </div>
                                <span class="badge bg-danger-subtle text-danger small">Restock</span>
                            </a>
                        <?php endforeach; ?>
                    </div>
                    <div class="border-top pt-2 mt-1 text-center">
                        <a href="inventory.php" class="btn btn-sm btn-light w-100 fw-semibold text-primary">Manage Inventory</a>
                    </div>
                <?php endif; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Language Switcher -->
        <div class="dropdown">
            <button class="btn btn-icon btn-light border" data-bs-toggle="dropdown" aria-expanded="false" aria-label="Change Language" title="Language / Bahasa">
                <i class="fas fa-globe text-primary"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0" style="border-radius: 12px;">
                <li>
                    <a class="dropdown-item <?= ($_SESSION['lang'] ?? 'en') == 'en' ? 'active fw-bold' : '' ?>" href="?lang=en">
                        <i class="fas fa-check me-2 <?= ($_SESSION['lang'] ?? 'en') == 'en' ? '' : 'opacity-0' ?>"></i> English
                    </a>
                </li>
                <li>
                    <a class="dropdown-item <?= ($_SESSION['lang'] ?? 'en') == 'ms' ? 'active fw-bold' : '' ?>" href="?lang=ms">
                        <i class="fas fa-check me-2 <?= ($_SESSION['lang'] ?? 'en') == 'ms' ? '' : 'opacity-0' ?>"></i> Bahasa Melayu
                    </a>
                </li>
            </ul>
        </div>

        <!-- Dark / Light Mode Toggle Button -->
        <button class="btn btn-icon btn-light border theme-toggle-btn" onclick="toggleTheme()" aria-label="Toggle Theme" title="Toggle Theme">
            <i class="fas fa-moon text-secondary"></i>
        </button>

        <!-- User Quick Dropdown -->
        <div class="dropdown">
            <button class="btn btn-light border d-flex align-items-center gap-2 py-1 px-2 rounded-pill" data-bs-toggle="dropdown" aria-expanded="false" aria-label="User Account Menu">
                <div class="user-avatar-sm" style="width: 28px; height: 28px; font-size: 0.75rem;">
                    <?= strtoupper(substr($_SESSION['username'] ?? 'U', 0, 1)) ?>
                </div>
                <span class="d-none d-lg-inline fw-semibold small pe-1">
                    <?= htmlspecialchars($_SESSION['username'] ?? 'User') ?>
                </span>
                <i class="fas fa-chevron-down small opacity-50 pe-1"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 p-2" style="border-radius: 12px; min-width: 180px;">
                <li class="px-2 py-1 mb-1 border-bottom">
                    <div class="fw-bold text-truncate"><?= htmlspecialchars($_SESSION['username'] ?? 'User') ?></div>
                    <small class="text-muted text-capitalize"><?= str_replace('_', ' ', $_SESSION['role'] ?? '') ?></small>
                </li>
                <?php if (($_SESSION['role'] ?? '') == 'owner'): ?>
                    <li><a class="dropdown-item rounded" href="settings.php"><i class="fas fa-gear me-2 text-muted"></i> <?= __('settings') ?></a></li>
                    <li><a class="dropdown-item rounded" href="logs.php"><i class="fas fa-shield-halved me-2 text-muted"></i> <?= __('audit_log') ?></a></li>
                <?php endif; ?>
                <li><hr class="dropdown-divider my-1"></li>
                <li>
                    <a class="dropdown-item rounded text-danger" href="logout.php" onclick="return confirm('Confirm sign out?')">
                        <i class="fas fa-sign-out-alt me-2"></i> <?= __('sign_out') ?>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</header>
