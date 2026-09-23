<?php
session_start();
require 'db.php';
// Inside logout.php
logActivity($pdo, "Log Out", "User {$_SESSION['username']} has logged out.");
session_destroy();
header("Location: login.php");
exit;