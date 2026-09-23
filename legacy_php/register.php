<?php
session_start();
require 'db.php';

$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = trim($_POST['full_name'] ?? '');
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';
    $confirmPassword = $_POST['confirm_password'] ?? '';
    $role = $_POST['role'] ?? 'cashier';
    $gender = $_POST['gender'] ?? 'Male';
    $race = trim($_POST['race'] ?? 'Malay');
    $address = trim($_POST['address'] ?? '');
    $phone = trim($_POST['phone_number'] ?? '');
    $securityQuestion = trim($_POST['security_question'] ?? 'What is your primary school name?');
    $securityAnswer = trim($_POST['security_answer'] ?? '');

    if (empty($fullName) || empty($username) || empty($password)) {
        $error = "Please fill in all required fields.";
    } elseif ($password !== $confirmPassword) {
        $error = "Passwords do not match.";
    } elseif (strlen($password) < 6) {
        $error = "Password must be at least 6 characters long.";
    } else {
        try {
            // Check if username already exists
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $checkStmt->execute([$username]);
            if ($checkStmt->fetchColumn() > 0) {
                $error = "Username '{$username}' is already taken. Please choose another.";
            } else {
                $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
                $hashedSecurityAnswer = !empty($securityAnswer) ? password_hash(strtolower($securityAnswer), PASSWORD_BCRYPT) : null;

                $stmt = $pdo->prepare("INSERT INTO users (username, password, role, full_name, gender, race, address, phone_number, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([
                    $username, $hashedPassword, $role, $fullName, $gender, $race, $address, $phone, $securityQuestion, $hashedSecurityAnswer
                ]);

                logActivity($pdo, "Staff Registered", "New staff account created: {$username} ({$role})");
                header("Location: login.php?msg=" . urlencode("Account created successfully! You can now log in."));
                exit;
            }
        } catch (PDOException $e) {
            $error = "Database error: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Registration | <?= __('app_name') ?></title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="assets/css/app.css">
    <style>
        body {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            padding: 2.5rem 1.5rem;
        }
        .auth-card {
            width: 100%;
            max-width: 600px;
            background: var(--bg-surface, #ffffff);
            border-radius: var(--radius-xl);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }
        .auth-header {
            padding: 2rem 2.5rem 1rem;
            text-align: center;
            background: linear-gradient(180deg, rgba(79, 70, 229, 0.06) 0%, transparent 100%);
        }
        .auth-logo {
            max-height: 50px;
            width: auto;
            border-radius: var(--radius-md);
            background: #ffffff;
            padding: 4px;
            margin-bottom: 0.75rem;
        }
        .auth-body {
            padding: 1.5rem 2.5rem 2.5rem;
        }
    </style>
</head>
<body>
    <div class="auth-card card-modern">
        <div class="auth-header">
            <img src="images/logo.jpeg" alt="Nolan Printing Logo" class="auth-logo">
            <h4 class="fw-bold mb-1">Staff Account Registration</h4>
            <p class="text-muted small mb-0">Join Nolan Printing Services management portal</p>
        </div>

        <div class="auth-body">
            <?php if (!empty($error)): ?>
                <div class="alert alert-danger d-flex align-items-center gap-2 py-2 small mb-4" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    <div><?= htmlspecialchars($error) ?></div>
                </div>
            <?php endif; ?>

            <form method="POST" id="registerForm">
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Full Name *</label>
                        <input type="text" name="full_name" class="form-control" required placeholder="e.g., Hariz Muslan" value="<?= htmlspecialchars($_POST['full_name'] ?? '') ?>">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Username *</label>
                        <input type="text" name="username" class="form-control" required placeholder="e.g., hariz99" value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
                    </div>

                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Password *</label>
                        <input type="password" name="password" id="pass" class="form-control" required minlength="6" placeholder="At least 6 characters">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Confirm Password *</label>
                        <input type="password" name="confirm_password" id="confirmPass" class="form-control" required minlength="6" placeholder="Repeat password">
                    </div>

                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Assign Role</label>
                        <select name="role" class="form-select">
                            <option value="cashier">Cashier (POS & Sales)</option>
                            <option value="stock_handler">Stock Handler (Inventory)</option>
                            <option value="owner">Owner / Administrator</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Phone Number</label>
                        <input type="text" name="phone_number" class="form-control" placeholder="e.g., 0123456789" value="<?= htmlspecialchars($_POST['phone_number'] ?? '') ?>">
                    </div>

                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Gender</label>
                        <select name="gender" class="form-select">
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Race / Ethnicity</label>
                        <input type="text" name="race" class="form-control" placeholder="e.g., Malay" value="<?= htmlspecialchars($_POST['race'] ?? 'Malay') ?>">
                    </div>

                    <div class="col-12">
                        <label class="form-label small fw-bold text-muted">Address</label>
                        <textarea name="address" class="form-control" rows="2" placeholder="Residential address"><?= htmlspecialchars($_POST['address'] ?? '') ?></textarea>
                    </div>

                    <div class="col-12"><hr class="my-1"></div>

                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Security Question (for recovery)</label>
                        <select name="security_question" class="form-select">
                            <option value="What was the name of your first school?">What was the name of your first school?</option>
                            <option value="What is your mother's maiden name?">What is your mother's maiden name?</option>
                            <option value="What was the name of your first pet?">What was the name of your first pet?</option>
                            <option value="What city were you born in?">What city were you born in?</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-bold text-muted">Security Answer</label>
                        <input type="text" name="security_answer" class="form-control" placeholder="Answer to your question" required>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary w-100 py-2 mt-4 fw-bold shadow-sm">
                    <i class="fas fa-user-plus me-2"></i> Register Staff Account
                </button>

                <div class="text-center mt-3">
                    <a href="login.php" class="text-muted small text-decoration-none">
                        &larr; Already have an account? <span class="text-primary fw-semibold">Log in</span>
                    </a>
                </div>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>