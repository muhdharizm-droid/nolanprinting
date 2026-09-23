<?php
// Nolan Printing Services - Core Database & Helper Utilities
// Timezone: Asia/Kuala_Lumpur (+08:00)

date_default_timezone_set('Asia/Kuala_Lumpur');

$host = 'localhost';
$db   = 'nolanprinting_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    $pdo->exec("SET time_zone = '+08:00'");
} catch (PDOException $e) {
    die("Critical Error: Unable to connect to the database. Please ensure MySQL is running in XAMPP.");
}

// Start session if not started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// --- LANGUAGE & TRANSLATION SYSTEM ---
if (isset($_GET['lang'])) {
    $_SESSION['lang'] = in_array($_GET['lang'], ['ms', 'en']) ? $_GET['lang'] : 'en';
    $redirectUrl = strtok($_SERVER["REQUEST_URI"], '?');
    $queryParams = $_GET;
    unset($queryParams['lang']);
    if (!empty($queryParams)) {
        $redirectUrl .= '?' . http_build_query($queryParams);
    }
    header("Location: " . $redirectUrl);
    exit;
}

$translations = [
    'en' => [
        // Navigation & General
        'app_name' => 'Nolan Printing Services',
        'home' => 'Home',
        'dashboard' => 'Dashboard',
        'staff' => 'Staff Management',
        'transactions' => 'Transactions',
        'expenses' => 'Expense Management',
        'analytics' => 'Analytics & Reports',
        'audit_log' => 'System Audit Log',
        'inventory' => 'Inventory',
        'suppliers' => 'Suppliers',
        'pos' => 'Point of Sale (POS)',
        'settings' => 'System Settings',
        'archived_products' => 'Archived Items',
        'sign_out' => 'Sign Out',
        'overview' => 'Overview',
        'revenue' => 'Revenue',
        'cogs' => 'Cost of Goods (COGS)',
        'net_profit' => 'Net Profit',
        'gross_profit' => 'Gross Profit',
        'profit_margin' => 'Profit Margin',
        'active_items' => 'Active Items',
        'stock_alerts' => 'Stock Alerts',
        'out_of_stock' => 'Out of Stock',
        'healthy_stock' => 'Healthy Stock',
        'total_products' => 'Total Products',
        'staff_accounts' => 'Staff Accounts',
        
        // POS System
        'product_catalog' => 'Product Catalog',
        'search_by_name' => 'Search product name or SKU...',
        'scan_barcode' => 'Scan Barcode / Enter SKU...',
        'all_categories' => 'All Categories',
        'current_bill' => 'Current Bill',
        'no_items' => 'No items added to current bill',
        'payment_method' => 'Payment Method',
        'subtotal' => 'Subtotal',
        'discount' => 'Discount',
        'tax' => 'Tax (6%)',
        'total' => 'Grand Total',
        'cash_received' => 'Cash Received (RM)',
        'change' => 'Change',
        'complete_payment' => 'PAY NOW & COMPLETE',
        'hold_bill' => 'Hold Bill',
        'clear_bill' => 'Clear Bill',
        'print_service_calc' => 'Custom Print / Photocopy Calculator',
        'print_type' => 'Print Type',
        'paper_type' => 'Paper Type',
        'finishing' => 'Finishing / Binding',
        'pages_count' => 'Pages per Copy',
        'copies_count' => 'Number of Copies',
        'add_to_bill' => 'Add to Current Bill',
        'receipt_prompt' => 'Payment Completed! Print thermal receipt?',
        'print_receipt' => 'Print Thermal Receipt',
        'share_whatsapp' => 'Share via WhatsApp',
        'new_sale' => 'Start New Sale',
        
        // Inventory & Management
        'add_product' => 'Add New Product',
        'edit_product' => 'Edit Product',
        'add_stock' => 'Quick Stock Intake',
        'manage_categories' => 'Categories',
        'import_csv' => 'Import CSV',
        'export_csv' => 'Export Inventory',
        'print_barcodes' => 'Print Barcode Labels',
        'barcode' => 'Barcode / SKU',
        'product_name' => 'Product Name',
        'selling_price' => 'Selling Price (RM)',
        'cost_price' => 'Cost Price (RM)',
        'stock_level' => 'Stock Level',
        'threshold' => 'Low Stock Threshold',
        'supplier' => 'Supplier',
        'category' => 'Category',
        'profit_markup' => 'Markup / Margin',
        'velocity' => '30D Velocity',
        'status' => 'Status',
        'actions' => 'Actions',
        'restore' => 'Restore Product',
        'permanent_delete' => 'Delete Permanently',
        
        // Analytics & Reports
        'filter_mode' => 'Filter Period',
        'daily' => 'Daily',
        'monthly' => 'Monthly',
        'yearly' => 'Yearly',
        'custom_range' => 'Custom Date Range',
        'start_date' => 'Start Date',
        'end_date' => 'End Date',
        'revenue_trend' => 'Revenue & Profit Growth Trend',
        'category_share' => 'Sales Share by Category',
        'cashier_breakdown' => 'Staff Sales Performance',
        'payment_breakdown' => 'Payment Channel Distribution',
        'stock_intake_timeline' => 'Stock Intake Timeline',
        'export_excel' => 'Export Excel / CSV',
        
        // Settings & System
        'store_profile' => 'Store & Business Profile',
        'financial_settings' => 'Tax & Financial Rules',
        'appearance_language' => 'Appearance & Language',
        'database_tools' => 'Database Backup & Safety',
        'download_backup' => 'Download SQL Database Dump',
        'dark_mode' => 'Dark Mode Theme',
        'light_mode' => 'Light Mode Theme',
        'save_changes' => 'Save Changes',
        
        // Generic Actions & Alerts
        'cancel' => 'Cancel',
        'save' => 'Save',
        'update' => 'Update',
        'delete' => 'Delete',
        'confirm' => 'Confirm',
        'success' => 'Success',
        'error' => 'Error',
        'warning' => 'Warning',
        'view' => 'View',
        'edit' => 'Edit'
    ],
    'ms' => [
        // Navigation & General
        'app_name' => 'Perkhidmatan Percetakan Nolan',
        'home' => 'Utama',
        'dashboard' => 'Papan Pemuka',
        'staff' => 'Pengurusan Staf',
        'transactions' => 'Transaksi',
        'expenses' => 'Pengurusan Perbelanjaan',
        'analytics' => 'Analitik & Laporan',
        'audit_log' => 'Log Audit Sistem',
        'inventory' => 'Inventori',
        'suppliers' => 'Pembekal',
        'pos' => 'Sistem POS (Jualan)',
        'settings' => 'Tetapan Sistem',
        'archived_products' => 'Item Arkib',
        'sign_out' => 'Log Keluar',
        'overview' => 'Gambaran Keseluruhan',
        'revenue' => 'Hasil Jualan',
        'cogs' => 'Kos Barangan Jualan (COGS)',
        'net_profit' => 'Untung Bersih',
        'gross_profit' => 'Untung Kasar',
        'profit_margin' => 'Margin Keuntungan',
        'active_items' => 'Item Aktif',
        'stock_alerts' => 'Amaran Stok Rendah',
        'out_of_stock' => 'Kehabisan Stok',
        'healthy_stock' => 'Stok Mencukupi',
        'total_products' => 'Jumlah Produk',
        'staff_accounts' => 'Akaun Staf',
        
        // POS System
        'product_catalog' => 'Katalog Produk',
        'search_by_name' => 'Cari nama produk atau SKU...',
        'scan_barcode' => 'Imbas Kod Bar / Masukkan SKU...',
        'all_categories' => 'Semua Kategori',
        'current_bill' => 'Bil Semasa',
        'no_items' => 'Tiada item dalam bil semasa',
        'payment_method' => 'Kaedah Pembayaran',
        'subtotal' => 'Subjumlah',
        'discount' => 'Diskaun',
        'tax' => 'Cukai (6%)',
        'total' => 'Jumlah Keseluruhan',
        'cash_received' => 'Tunai Diterima (RM)',
        'change' => 'Baki Tunai',
        'complete_payment' => 'BAYAR SEKARANG & SELESAI',
        'hold_bill' => 'Tahan Bil',
        'clear_bill' => 'Kosongkan Bil',
        'print_service_calc' => 'Kalkulator Cetakan / Fotostat Khas',
        'print_type' => 'Jenis Cetakan',
        'paper_type' => 'Jenis Kertas',
        'finishing' => 'Kemasan / Jilid',
        'pages_count' => 'Halaman setiap Salinan',
        'copies_count' => 'Bilangan Salinan',
        'add_to_bill' => 'Tambah ke Bil Semasa',
        'receipt_prompt' => 'Pembayaran Berjaya! Cetak resit termal?',
        'print_receipt' => 'Cetak Resit Termal',
        'share_whatsapp' => 'Kongsi ke WhatsApp',
        'new_sale' => 'Mula Jualan Baharu',
        
        // Inventory & Management
        'add_product' => 'Tambah Produk Baharu',
        'edit_product' => 'Sunting Produk',
        'add_stock' => 'Kemasukan Stok Pantas',
        'manage_categories' => 'Kategori',
        'import_csv' => 'Import CSV',
        'export_csv' => 'Eksport Inventori',
        'print_barcodes' => 'Cetak Label Kod Bar',
        'barcode' => 'Kod Bar / SKU',
        'product_name' => 'Nama Produk',
        'selling_price' => 'Harga Jualan (RM)',
        'cost_price' => 'Harga Kos (RM)',
        'stock_level' => 'Tahap Stok',
        'threshold' => 'Ambang Stok Rendah',
        'supplier' => 'Pembekal',
        'category' => 'Kategori',
        'profit_markup' => 'Gandaan / Margin',
        'velocity' => 'Jualan 30 Hari',
        'status' => 'Status',
        'actions' => 'Tindakan',
        'restore' => 'Pulihkan Produk',
        'permanent_delete' => 'Padam Kekal',
        
        // Analytics & Reports
        'filter_mode' => 'Tempoh Penapis',
        'daily' => 'Harian',
        'monthly' => 'Bulanan',
        'yearly' => 'Tahunan',
        'custom_range' => 'Julat Tarikh Tersuai',
        'start_date' => 'Tarikh Mula',
        'end_date' => 'Tarikh Tamat',
        'revenue_trend' => 'Trend Pertumbuhan Hasil & Keuntungan',
        'category_share' => 'Perkongsian Jualan mengikut Kategori',
        'cashier_breakdown' => 'Prestasi Jualan Kakitangan',
        'payment_breakdown' => 'Taburan Saluran Pembayaran',
        'stock_intake_timeline' => 'Garis Masa Kemasukan Stok',
        'export_excel' => 'Eksport Excel / CSV',
        
        // Settings & System
        'store_profile' => 'Profil Kedai & Perniagaan',
        'financial_settings' => 'Peraturan Cukai & Kewangan',
        'appearance_language' => 'Rupa & Bahasa',
        'database_tools' => 'Sandaran & Keselamatan Pangkalan Data',
        'download_backup' => 'Muat Turun Sandaran SQL',
        'dark_mode' => 'Tema Mod Gelap',
        'light_mode' => 'Tema Mod Cerah',
        'save_changes' => 'Simpan Perubahan',
        
        // Generic Actions & Alerts
        'cancel' => 'Batal',
        'save' => 'Simpan',
        'update' => 'Kemas Kini',
        'delete' => 'Padam',
        'confirm' => 'Sahkan',
        'success' => 'Berjaya',
        'error' => 'Ralat',
        'warning' => 'Amaran',
        'view' => 'Lihat',
        'edit' => 'Sunting'
    ]
];

function __($key) {
    global $translations;
    $lang = $_SESSION['lang'] ?? 'en';
    return $translations[$lang][$key] ?? $key;
}

// --- SETTINGS HELPERS ---

function getSetting($pdo, $key, $default = '') {
    try {
        $stmt = $pdo->prepare("SELECT setting_value FROM settings WHERE setting_key = ?");
        $stmt->execute([$key]);
        $val = $stmt->fetchColumn();
        return $val !== false ? $val : $default;
    } catch (Exception $e) {
        return $default;
    }
}

function setSetting($pdo, $key, $value) {
    $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?");
    $stmt->execute([$key, $value, $value]);
}

function getStoreProfile($pdo) {
    return [
        'shop_name'    => getSetting($pdo, 'shop_name', 'NOLAN PRINTING SERVICES'),
        'shop_reg_no'  => getSetting($pdo, 'shop_reg_no', '003563612-M'),
        'shop_phone'   => getSetting($pdo, 'shop_phone', '+6013-270 7949'),
        'shop_email'   => getSetting($pdo, 'shop_email', 'nolanprinting@gmail.com'),
        'shop_address' => getSetting($pdo, 'shop_address', '12A, Jalan Andaman 5, Taman Andaman Ukay, 68000 Ampang, Selangor'),
        'receipt_msg'  => getSetting($pdo, 'receipt_msg', 'Thank you for choosing Nolan Printing! Quality in Every Print.'),
        'tax_rate'     => (float)getSetting($pdo, 'tax_rate', '6'),
        'discount_type'=> getSetting($pdo, 'discount_type', 'fixed'),
        'discount_val' => (float)getSetting($pdo, 'discount_amount', '0')
    ];
}

// --- CSRF & SECURITY HELPERS ---

function getCsrfToken() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}

// --- AUDIT LOG HELPER ---

function logActivity($pdo, $action, $details) {
    try {
        $stmt = $pdo->prepare("INSERT INTO activity_log (user_id, action, details) VALUES (?, ?, ?)");
        $stmt->execute([$_SESSION['user_id'] ?? null, $action, $details]);
    } catch (Exception $e) {}
}

// --- TELEGRAM NOTIFICATION ---

function sendTelegramNotification($message) {
    $botToken = "8608132071:AAGv9aPHo4mJFI30F4PJh7YsgkwoXA2DfIU";
    $chatId = "986163412";
    $url = "https://api.telegram.org/bot$botToken/sendMessage?chat_id=$chatId&parse_mode=HTML&text=" . urlencode($message);
    $ctx = stream_context_create(['http' => ['timeout' => 2]]);
    @file_get_contents($url, false, $ctx);
}

// --- LOW STOCK COUNTER ---

function getLowStockCount($pdo) {
    return (int)$pdo->query("SELECT COUNT(*) FROM products WHERE status = 'active' AND stock <= threshold")->fetchColumn();
}