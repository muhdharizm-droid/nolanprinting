<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || !in_array($_SESSION['role'], ['owner', 'stock_handler'])) { 
    exit("Unauthorized access."); 
}

$sql = "SELECT p.barcode, p.name, COALESCE(c.name, 'General') as category, p.cost_price, p.price, p.stock, p.threshold, COALESCE(s.name, 'None') as supplier 
        FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        LEFT JOIN suppliers s ON p.supplier_id = s.id 
        WHERE p.status = 'active' AND p.is_service = 0 
        ORDER BY p.name ASC";

$stmt = $pdo->query($sql);
$products = $stmt->fetchAll();

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=Nolan_Inventory_Export_'.date('Y-m-d').'.csv');

$output = fopen('php://output', 'w');

// UTF-8 BOM
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

fputcsv($output, ['NOLAN PRINTING SERVICES - INVENTORY MASTER SHEET']);
fputcsv($output, ['Exported Date:', date('Y-m-d H:i:s')]);
fputcsv($output, []);

// Header Row
fputcsv($output, ['Barcode', 'Product Name', 'Category', 'Cost Price (RM)', 'Selling Price (RM)', 'Current Stock Level', 'Restock Threshold', 'Supplier Name', 'Total Stock Valuation (RM)']);

$totalCostVal = 0;
$totalRetailVal = 0;

foreach ($products as $row) {
    $lineVal = (float)$row['price'] * (int)$row['stock'];
    $totalCostVal += ((float)$row['cost_price'] * (int)$row['stock']);
    $totalRetailVal += $lineVal;

    fputcsv($output, [
        $row['barcode'],
        $row['name'],
        $row['category'],
        number_format((float)$row['cost_price'], 2),
        number_format((float)$row['price'], 2),
        $row['stock'],
        $row['threshold'],
        $row['supplier'],
        number_format($lineVal, 2)
    ]);
}

fputcsv($output, []);
fputcsv($output, ['TOTAL VALUATION', '', '', 'Cost Value: RM ' . number_format($totalCostVal, 2), '', '', '', 'Retail Value:', 'RM ' . number_format($totalRetailVal, 2)]);

fclose($output);
exit;