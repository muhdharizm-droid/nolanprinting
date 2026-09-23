<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Access Denied: Owners Only."); 
}

$tables = [];
$result = $pdo->query("SHOW TABLES");
while ($row = $result->fetch(PDO::FETCH_NUM)) {
    $tables[] = $row[0];
}

$sqlDump = "-- Nolan Printing Services Database Backup\n";
$sqlDump .= "-- Generated on: " . date('Y-m-d H:i:s') . "\n";
$sqlDump .= "-- Host: {$host} | Database: {$db}\n\n";
$sqlDump .= "SET FOREIGN_KEY_CHECKS=0;\n";
$sqlDump .= "SET SQL_MODE = \"NO_AUTO_VALUE_ON_ZERO\";\n";
$sqlDump .= "SET time_zone = \"+00:00\";\n\n";

foreach ($tables as $table) {
    $createTableStmt = $pdo->query("SHOW CREATE TABLE `{$table}`")->fetch(PDO::FETCH_NUM);
    $sqlDump .= "-- Table structure for table `{$table}`\n";
    $sqlDump .= "DROP TABLE IF EXISTS `{$table}`;\n";
    $sqlDump .= $createTableStmt[1] . ";\n\n";

    $rows = $pdo->query("SELECT * FROM `{$table}`")->fetchAll(PDO::FETCH_ASSOC);
    if (!empty($rows)) {
        $sqlDump .= "-- Dumping data for table `{$table}`\n";
        $columns = array_keys($rows[0]);
        $columnList = implode("`, `", $columns);

        foreach ($rows as $row) {
            $values = [];
            foreach ($row as $val) {
                if ($val === null) {
                    $values[] = "NULL";
                } else {
                    $values[] = $pdo->quote($val);
                }
            }
            $valueList = implode(", ", $values);
            $sqlDump .= "INSERT INTO `{$table}` (`{$columnList}`) VALUES ({$valueList});\n";
        }
        $sqlDump .= "\n";
    }
}

$sqlDump .= "SET FOREIGN_KEY_CHECKS=1;\n";

logActivity($pdo, "Database Exported", "Generated SQL database backup dump.");

// Output as downloadable file
$filename = "nolanprinting_backup_" . date('Y-m-d_His') . ".sql";
header('Content-Type: application/sql');
header('Content-Disposition: attachment; filename="' . $filename . '"');
header('Content-Length: ' . strlen($sqlDump));

echo $sqlDump;
exit;

