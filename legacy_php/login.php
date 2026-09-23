<?php
session_start();
require 'db.php';

if (isset($_SESSION['user_id'])) {
    header("Location: index.php");
    exit;
}

$error = '';
$msg = $_GET['msg'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error = "Please enter both username and password.";
    } else {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['full_name'] = $user['full_name'];
            $_SESSION['role'] = $user['role'];

            logActivity($pdo, "User Login", "User {$user['username']} logged in successfully.");

            // Redirect based on role
            if ($user['role'] === 'owner') {
                header("Location: index.php");
            } elseif ($user['role'] === 'stock_handler') {
                header("Location: inventory.php");
            } else {
                header("Location: pos.php");
            }
            exit;
        } else {
            $error = "Invalid username or password. Please try again.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | <?= __('app_name') ?></title>
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
            padding: 1.5rem;
        }
        .auth-card {
            width: 100%;
            max-width: 440px;
            background: var(--bg-surface, #ffffff);
            border-radius: var(--radius-xl);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            overflow: hidden;
        }
        .auth-header {
            padding: 2.5rem 2.5rem 1.5rem;
            text-align: center;
            background: linear-gradient(180deg, rgba(79, 70, 229, 0.06) 0%, transparent 100%);
        }
        .auth-logo {
            max-height: 55px;
            width: auto;
            border-radius: var(--radius-md);
            background: #ffffff;
            padding: 4px;
            margin-bottom: 1rem;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        .auth-body {
            padding: 1rem 2.5rem 2.5rem;
        }
    </style>
</head>
<body>
    <div class="auth-card card-modern">
        <div class="auth-header">
            <img src="images/logo.jpeg" alt="Nolan Printing Logo" class="auth-logo">
            <h4 class="fw-bold mb-1">NOLAN PRINTING</h4>
            <p class="text-muted small mb-0">POS & Inventory Management System</p>
        </div>

        <div class="auth-body">
            <?php if (!empty($msg)): ?>
                <div class="alert alert-success d-flex align-items-center gap-2 py-2 small" role="alert">
                    <i class="fas fa-check-circle"></i>
                    <div><?= htmlspecialchars($msg) ?></div>
                </div>
            <?php endif; ?>

            <?php if (!empty($error)): ?>
                <div class="alert alert-danger d-flex align-items-center gap-2 py-2 small" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    <div><?= htmlspecialchars($error) ?></div>
                </div>
            <?php endif; ?>

            <form method="POST" id="loginForm" autocomplete="on">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">Username</label>
                    <div class="input-group">
                        <span class="input-group-text bg-body border-end-0 text-muted">
                            <i class="fas fa-user"></i>
                        </span>
                        <input type="text" name="username" class="form-control border-start-0" placeholder="Enter username" required autofocus value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
                    </div>
                </div>

                <div class="mb-4">
                    <div class="d-flex justify-content-between align-items-center">
                        <label class="form-label small fw-bold text-muted mb-0">Password</label>
                        <a href="forgot_password.php" class="text-primary small text-decoration-none">Forgot password?</a>
                    </div>
                    <div class="input-group mt-1">
                        <span class="input-group-text bg-body border-end-0 text-muted">
                            <i class="fas fa-lock"></i>
                        </span>
                        <input type="password" name="password" id="passwordInput" class="form-control border-start-0 border-end-0" placeholder="Enter password" required>
                        <button class="btn btn-outline-secondary border-start-0" type="button" id="togglePasswordBtn">
                            <i class="fas fa-eye text-muted"></i>
                        </button>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary w-100 py-2 fw-bold shadow-sm" id="submitBtn">
                    <i class="fas fa-arrow-right-to-bracket me-2"></i> Log In to System
                </button>

                <div class="text-center mt-4 pt-2 border-top">
                    <p class="text-muted small mb-0">
                        Need a staff account? <a href="register.php" class="text-primary fw-semibold text-decoration-none">Register Staff</a>
                    </p>
                </div>
            </form>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        document.getElementById('togglePasswordBtn').addEventListener('click', function() {
            const input = document.getElementById('passwordInput');
            const icon = this.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fas fa-eye-slash text-primary';
            } else {
                input.type = 'password';
                icon.className = 'fas fa-eye text-muted';
            }
        });

        document.getElementById('loginForm').addEventListener('submit', function() {
            const btn = document.getElementById('submitBtn');
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Authenticating...`;
        });
    </script>
</body>
</html>