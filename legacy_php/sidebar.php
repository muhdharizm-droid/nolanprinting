<?php
$currentPage = basename($_SERVER['PHP_SELF']);
$currentRole = $_SESSION['role'] ?? 'cashier';

// Fetch dynamic badge counts
$lowStockCount = 0;
$archivedCount = 0;
try {
    $lowStockCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active' AND stock <= threshold")->fetchColumn();
    $archivedCount = (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'archived'")->fetchColumn();
} catch (Exception $e) {}

$reportsPages = ['dashboard.php', 'reports.php'];
$managementPages = ['users.php', 'expenses.php', 'logs.php', 'transactions.php'];
$inventoryPages = ['inventory.php', 'suppliers.php', 'categories.php', 'archived.php', 'print_barcode.php'];

$parentPage = '';
if (in_array($currentPage, $reportsPages)) $parentPage = 'reports';
if (in_array($currentPage, $managementPages)) $parentPage = 'management';
if (in_array($currentPage, $inventoryPages)) $parentPage = 'inventory';
?>

<aside class="sidebar" id="appSidebar">
    <!-- Brand Header -->
    <a href="index.php" class="sidebar-brand">
        <img src="images/logo.jpeg" alt="Nolan Printing Logo">
        <div>
            <div class="sidebar-brand-title">NOLAN PRINTING</div>
            <div class="sidebar-brand-subtitle">POS & Inventory</div>
        </div>
    </a>

    <!-- Menu Links -->
    <div class="sidebar-menu">
        <div class="sidebar-section-title"><?= __('home') ?></div>
        <a href="index.php" class="sidebar-link <?= $currentPage == 'index.php' ? 'active' : '' ?>">
            <i class="fas fa-th-large"></i>
            <span><?= __('home') ?></span>
        </a>

        <?php if ($currentRole == 'owner' || $currentRole == 'cashier'): ?>
            <div class="sidebar-section-title"><?= __('pos') ?></div>
            <a href="pos.php" class="sidebar-link <?= $currentPage == 'pos.php' ? 'active' : '' ?>">
                <i class="fas fa-cash-register text-success"></i>
                <span class="fw-semibold"><?= __('pos') ?></span>
                <span class="badge bg-success ms-auto rounded-pill small">Active</span>
            </a>
        <?php endif; ?>

        <?php if ($currentRole == 'owner' || $currentRole == 'stock_handler'): ?>
            <div class="sidebar-section-title"><?= __('inventory') ?></div>
            <a class="sidebar-link <?= $parentPage == 'inventory' ? '' : 'collapsed' ?>" data-bs-toggle="collapse" href="#inventorySubmenu" role="button" aria-expanded="<?= $parentPage == 'inventory' ? 'true' : 'false' ?>">
                <i class="fas fa-boxes-stacked text-warning"></i>
                <span><?= __('inventory') ?></span>
                <?php if ($lowStockCount > 0): ?>
                    <span class="badge rounded-pill bg-danger pulse-badge ms-auto"><?= $lowStockCount ?></span>
                <?php endif; ?>
                <i class="fas fa-chevron-down ms-2 small opacity-50"></i>
            </a>
            <div class="collapse sidebar-submenu <?= $parentPage == 'inventory' ? 'show' : '' ?>" id="inventorySubmenu">
                <a href="inventory.php" class="sidebar-link <?= $currentPage == 'inventory.php' ? 'active' : '' ?>">
                    <i class="fas fa-box-open"></i>
                    <span><?= __('inventory') ?></span>
                    <?php if ($lowStockCount > 0): ?>
                        <span class="badge bg-danger rounded-pill ms-auto"><?= $lowStockCount ?></span>
                    <?php endif; ?>
                </a>
                <a href="categories.php" class="sidebar-link <?= $currentPage == 'categories.php' ? 'active' : '' ?>">
                    <i class="fas fa-tags"></i>
                    <span><?= __('manage_categories') ?></span>
                </a>
                <a href="suppliers.php" class="sidebar-link <?= $currentPage == 'suppliers.php' ? 'active' : '' ?>">
                    <i class="fas fa-truck-ramp-box"></i>
                    <span><?= __('suppliers') ?></span>
                </a>
                <a href="print_barcode.php" class="sidebar-link <?= $currentPage == 'print_barcode.php' ? 'active' : '' ?>">
                    <i class="fas fa-barcode"></i>
                    <span><?= __('print_barcodes') ?></span>
                </a>
                <?php if ($currentRole == 'owner'): ?>
                <a href="archived.php" class="sidebar-link <?= $currentPage == 'archived.php' ? 'active' : '' ?>">
                    <i class="fas fa-box-archive"></i>
                    <span><?= __('archived_products') ?></span>
                    <?php if ($archivedCount > 0): ?>
                        <span class="badge bg-secondary rounded-pill ms-auto"><?= $archivedCount ?></span>
                    <?php endif; ?>
                </a>
                <?php endif; ?>
            </div>
        <?php endif; ?>

        <?php if ($currentRole == 'owner'): ?>
            <div class="sidebar-section-title"><?= __('analytics') ?></div>
            <a class="sidebar-link <?= $parentPage == 'reports' ? '' : 'collapsed' ?>" data-bs-toggle="collapse" href="#analyticsSubmenu" role="button" aria-expanded="<?= $parentPage == 'reports' ? 'true' : 'false' ?>">
                <i class="fas fa-chart-pie text-info"></i>
                <span><?= __('analytics') ?></span>
                <i class="fas fa-chevron-down ms-auto small opacity-50"></i>
            </a>
            <div class="collapse sidebar-submenu <?= $parentPage == 'reports' ? 'show' : '' ?>" id="analyticsSubmenu">
                <a href="dashboard.php" class="sidebar-link <?= $currentPage == 'dashboard.php' ? 'active' : '' ?>">
                    <i class="fas fa-gauge-high"></i>
                    <span><?= __('dashboard') ?></span>
                </a>
                <a href="reports.php" class="sidebar-link <?= $currentPage == 'reports.php' ? 'active' : '' ?>">
                    <i class="fas fa-chart-line"></i>
                    <span><?= __('analytics') ?></span>
                </a>
            </div>

            <div class="sidebar-section-title"><?= __('staff') ?></div>
            <a class="sidebar-link <?= $parentPage == 'management' ? '' : 'collapsed' ?>" data-bs-toggle="collapse" href="#managementSubmenu" role="button" aria-expanded="<?= $parentPage == 'management' ? 'true' : 'false' ?>">
                <i class="fas fa-sliders text-primary"></i>
                <span>Management</span>
                <i class="fas fa-chevron-down ms-auto small opacity-50"></i>
            </a>
            <div class="collapse sidebar-submenu <?= $parentPage == 'management' ? 'show' : '' ?>" id="managementSubmenu">
                <a href="users.php" class="sidebar-link <?= $currentPage == 'users.php' ? 'active' : '' ?>">
                    <i class="fas fa-users-gear"></i>
                    <span><?= __('staff') ?></span>
                </a>
                <a href="transactions.php" class="sidebar-link <?= $currentPage == 'transactions.php' ? 'active' : '' ?>">
                    <i class="fas fa-receipt"></i>
                    <span><?= __('transactions') ?></span>
                </a>
                <a href="expenses.php" class="sidebar-link <?= $currentPage == 'expenses.php' ? 'active' : '' ?>">
                    <i class="fas fa-money-bill-wave"></i>
                    <span><?= __('expenses') ?></span>
                </a>
                <a href="logs.php" class="sidebar-link <?= $currentPage == 'logs.php' ? 'active' : '' ?>">
                    <i class="fas fa-shield-halved"></i>
                    <span><?= __('audit_log') ?></span>
                </a>
            </div>

            <div class="sidebar-section-title"><?= __('settings') ?></div>
            <a href="settings.php" class="sidebar-link <?= $currentPage == 'settings.php' ? 'active' : '' ?>">
                <i class="fas fa-gear"></i>
                <span><?= __('settings') ?></span>
            </a>
        <?php endif; ?>
    </div>

    <!-- User Profile Card in Sidebar Footer -->
    <div class="sidebar-user">
        <div class="d-flex align-items-center gap-2">
            <div class="user-avatar-sm">
                <?= strtoupper(substr($_SESSION['username'] ?? 'U', 0, 1)) ?>
            </div>
            <div style="line-height: 1.2;">
                <div class="text-white fw-bold text-truncate" style="max-width: 110px; font-size: 0.85rem;">
                    <?= htmlspecialchars($_SESSION['username'] ?? 'User') ?>
                </div>
                <span class="badge badge-soft-<?= $currentRole == 'owner' ? 'primary' : ($currentRole == 'cashier' ? 'success' : 'warning') ?> p-0 px-1" style="font-size: 0.68rem;">
                    <?= ucfirst(str_replace('_', ' ', $currentRole)) ?>
                </span>
            </div>
        </div>
        <a href="logout.php" class="btn btn-sm btn-outline-danger btn-icon" title="<?= __('sign_out') ?>" onclick="return confirm('Confirm sign out?')">
            <i class="fas fa-power-off"></i>
        </a>
    </div>
</aside>