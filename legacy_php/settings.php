<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Access Denied: Owners Only."); 
}

$role = $_SESSION['role'];
$msg = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) { 
        die("Security token mismatch."); 
    }

    if (isset($_POST['save_store_profile'])) {
        setSetting($pdo, 'shop_name', trim($_POST['shop_name'] ?? 'NOLAN PRINTING SERVICES'));
        setSetting($pdo, 'shop_reg_no', trim($_POST['shop_reg_no'] ?? '003563612-M'));
        setSetting($pdo, 'shop_phone', trim($_POST['shop_phone'] ?? ''));
        setSetting($pdo, 'shop_email', trim($_POST['shop_email'] ?? ''));
        setSetting($pdo, 'shop_address', trim($_POST['shop_address'] ?? ''));
        setSetting($pdo, 'receipt_msg', trim($_POST['receipt_msg'] ?? ''));

        logActivity($pdo, "Settings Updated", "Updated store profile and business info.");
        $msg = "Store profile settings updated successfully.";
    } elseif (isset($_POST['save_financials'])) {
        setSetting($pdo, 'tax_rate', (string)max(0, (float)($_POST['tax_rate'] ?? 6)));
        setSetting($pdo, 'discount_type', $_POST['discount_type'] ?? 'fixed');
        setSetting($pdo, 'discount_amount', (string)max(0, (float)($_POST['discount_amount'] ?? 0)));

        logActivity($pdo, "Settings Updated", "Updated financial and tax calculation rules.");
        $msg = "Financial & tax settings updated successfully.";
    }
}

$store = getStoreProfile($pdo);

$pageTitle = __('settings');
$pageSubtitle = 'Store Profile, Tax Rules, Language & Database Backup';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('settings') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('settings') ?></h4>
                        <p class="text-muted small mb-0">Configure store metadata, receipts, taxes, and system backups</p>
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

                <div class="row g-4">
                    <!-- Store Profile & Receipt Settings -->
                    <div class="col-lg-6">
                        <div class="card-modern p-4 h-100">
                            <h5 class="fw-bold mb-1"><i class="fas fa-store text-primary me-2"></i> <?= __('store_profile') ?></h5>
                            <p class="text-muted small mb-4">Printed on thermal receipts and report headers</p>

                            <form method="POST">
                                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-muted">Shop / Brand Name *</label>
                                    <input type="text" name="shop_name" class="form-control" required value="<?= htmlspecialchars($store['shop_name']) ?>">
                                </div>
                                <div class="row g-2 mb-3">
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted">Business Reg. No (SSM)</label>
                                        <input type="text" name="shop_reg_no" class="form-control" value="<?= htmlspecialchars($store['shop_reg_no']) ?>">
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted">Contact Phone</label>
                                        <input type="text" name="shop_phone" class="form-control" value="<?= htmlspecialchars($store['shop_phone']) ?>">
                                    </div>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-muted">Email Address</label>
                                    <input type="email" name="shop_email" class="form-control" value="<?= htmlspecialchars($store['shop_email']) ?>">
                                </div>
                                <div class="mb-3">
                                    <label class="form-label small fw-bold text-muted">Physical Store Address</label>
                                    <textarea name="shop_address" class="form-control" rows="2"><?= htmlspecialchars($store['shop_address']) ?></textarea>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label small fw-bold text-muted">Receipt Footer Message</label>
                                    <input type="text" name="receipt_msg" class="form-control" value="<?= htmlspecialchars($store['receipt_msg']) ?>">
                                </div>
                                <button type="submit" name="save_store_profile" class="btn btn-primary fw-bold">
                                    <i class="fas fa-save me-1"></i> Save Store Profile
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- Tax & Financial Settings -->
                    <div class="col-lg-6">
                        <div class="card-modern p-4 mb-4">
                            <h5 class="fw-bold mb-1"><i class="fas fa-calculator text-success me-2"></i> <?= __('financial_settings') ?></h5>
                            <p class="text-muted small mb-4">Default tax rates and discount rules applied in POS</p>

                            <form method="POST">
                                <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                                <div class="row g-2 mb-3">
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted">Sales Tax Rate (%)</label>
                                        <div class="input-group">
                                            <input type="number" name="tax_rate" class="form-control" step="0.1" min="0" value="<?= htmlspecialchars($store['tax_rate']) ?>">
                                            <span class="input-group-text bg-body">%</span>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <label class="form-label small fw-bold text-muted">Default Discount Type</label>
                                        <select name="discount_type" class="form-select">
                                            <option value="fixed" <?= $store['discount_type'] === 'fixed' ? 'selected' : '' ?>>Fixed (RM)</option>
                                            <option value="percentage" <?= $store['discount_type'] === 'percentage' ? 'selected' : '' ?>>Percentage (%)</option>
                                        </select>
                                    </div>
                                </div>
                                <div class="mb-4">
                                    <label class="form-label small fw-bold text-muted">Default Discount Value</label>
                                    <input type="number" name="discount_amount" class="form-control" step="0.1" min="0" value="<?= htmlspecialchars($store['discount_val']) ?>">
                                </div>
                                <button type="submit" name="save_financials" class="btn btn-success fw-bold">
                                    <i class="fas fa-save me-1"></i> Save Financial Rules
                                </button>
                            </form>
                        </div>

                        <!-- Appearance & Language Card -->
                        <div class="card-modern p-4 mb-4">
                            <h5 class="fw-bold mb-1"><i class="fas fa-palette text-info me-2"></i> <?= __('appearance_language') ?></h5>
                            <p class="text-muted small mb-3">Personalize UI theme and active display language</p>

                            <div class="list-group list-group-flush">
                                <div class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center border-bottom">
                                    <div>
                                        <div class="fw-bold small">Theme Appearance</div>
                                        <small class="text-muted">Switch between dark and light modes</small>
                                    </div>
                                    <button type="button" class="btn btn-sm btn-outline-primary" onclick="toggleTheme()">
                                        <i class="fas fa-circle-half-stroke me-1"></i> Toggle Dark / Light
                                    </button>
                                </div>
                                <div class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                                    <div>
                                        <div class="fw-bold small">System Language</div>
                                        <small class="text-muted">Bahasa Melayu / English</small>
                                    </div>
                                    <div class="btn-group btn-group-sm">
                                        <a href="?lang=en" class="btn <?= ($_SESSION['lang'] ?? 'en') === 'en' ? 'btn-primary' : 'btn-light border' ?>">English</a>
                                        <a href="?lang=ms" class="btn <?= ($_SESSION['lang'] ?? 'en') === 'ms' ? 'btn-primary' : 'btn-light border' ?>">Bahasa Melayu</a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Database Backup & Safety -->
                        <div class="card-modern p-4">
                            <h5 class="fw-bold mb-1"><i class="fas fa-database text-warning me-2"></i> <?= __('database_tools') ?></h5>
                            <p class="text-muted small mb-3">Download a full SQL database backup for safekeeping</p>

                            <div class="d-flex justify-content-between align-items-center p-3 bg-body rounded border">
                                <div>
                                    <div class="fw-bold small">Export Full SQL Database</div>
                                    <small class="text-muted">Includes all tables, sales, products & users</small>
                                </div>
                                <a href="backup_db.php" class="btn btn-warning fw-bold">
                                    <i class="fas fa-download me-1"></i> Download .SQL Dump
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>