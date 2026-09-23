<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id'])) { 
    exit('0'); 
}

echo (string)getLowStockCount($pdo);