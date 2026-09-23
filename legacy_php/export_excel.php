<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    exit("Unauthorized access."); 
}

$startDate = $_GET['start_date'] ?? date('Y-m-01');
$endDate = $_GET['end_date'] ?? date('Y-m-d');
$cashierId = $_GET['cashier_id'] ?? 'all';

$sql = "SELECT s.id, s.created_at, u.username, u.full_name, s.payment_method, s.subtotal, s.tax_amount, s.discount_amount, s.total 
        FROM sales s 
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

// Set headers for Excel CSV download
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename=Nolan_Sales_Report_'.$startDate.'_to_'.$endDate.'.csv');

$output = fopen('php://output', 'w');

// UTF-8 BOM for Excel compatibility
fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));

// Header Metadata
fputcsv($output, ['NOLAN PRINTING SERVICES - SALES & FINANCIAL REPORT']);
fputcsv($output, ['Period Range:', $startDate . ' to ' . $endDate]);
fputcsv($output, ['Exported Date:', date('Y-m-d H:i:s')]);
fputcsv($output, []); // Blank line

// Column Headers
fputcsv($output, ['Transaction ID', 'Date & Time', 'Staff Username', 'Staff Full Name', 'Payment Channel', 'Subtotal (RM)', 'Tax (RM)', 'Discount (RM)', 'Total Amount (RM)']);

$sumTotal = 0;
$sumTax = 0;
$sumDiscount = 0;
$sumSubtotal = 0;

// Data Rows
foreach ($sales as $row) {
    $sumSubtotal += (float)$row['subtotal'];
    $sumTax += (float)$row['tax_amount'];
    $sumDiscount += (float)$row['discount_amount'];
    $sumTotal += (float)$row['total'];

    fputcsv($output, [
        '#' . sprintf('%06d', $row['id']),
        date('Y-m-d H:i', strtotime($row['created_at'])),
        $row['username'],
        $row['full_name'],
        $row['payment_method'],
        number_format((float)$row['subtotal'], 2),
        number_format((float)$row['tax_amount'], 2),
        number_format((float)$row['discount_amount'], 2),
        number_format((float)$row['total'], 2)
    ]);
}

// Summary Row
fputcsv($output, []);
fputcsv($output, ['TOTALS (' . count($sales) . ' Transactions)', '', '', '', '', number_format($sumSubtotal, 2), number_format($sumTax, 2), number_format($sumDiscount, 2), number_format($sumTotal, 2)]);

fclose($output);
exit;