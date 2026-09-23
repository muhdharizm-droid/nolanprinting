<?php
session_start();
require 'db.php';

$step = 1;
$username = '';
$error = '';
$question = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($_POST['check_user'])) {
        $username = trim($_POST['username'] ?? '');
        $stmt = $pdo->prepare("SELECT security_question FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if ($user && !empty($user['security_question'])) {
            $question = $user['security_question'];
            $step = 2;
        } else {
            $error = "User not found or no security question configured on this account.";
        }
    } elseif (isset($_POST['reset_password'])) {
        $username = trim($_POST['username'] ?? '');
        $answer = trim($_POST['security_answer'] ?? '');
        $newPass = $_POST['new_password'] ?? '';
        $confirmPass = $_POST['confirm_password'] ?? '';

        if (empty($newPass) || strlen($newPass) < 6) {
            $error = "Password must be at least 6 characters long.";
            $step = 2;
        } elseif ($newPass !== $confirmPass) {
            $error = "Passwords do not match.";
            $step = 2;
        } else {
            $stmt = $pdo->prepare("SELECT security_answer, security_question FROM users WHERE username = ?");
            $stmt->execute([$username]);
            $user = $stmt->fetch();

            if ($user && !empty($user['security_answer']) && password_verify(strtolower($answer), $user['security_answer'])) {
                $hashedPass = password_hash($newPass, PASSWORD_BCRYPT);
                $updateStmt = $pdo->prepare("UPDATE users SET password = ? WHERE username = ?");
                $updateStmt->execute([$hashedPass, $username]);

                logActivity($pdo, "Password Reset", "User {$username} reset their password via security question.");
                header("Location: login.php?msg=" . urlencode("Password reset successful! You can now log in with your new password."));
                exit;
            } else {
                $error = "Incorrect security answer. Please try again.";
                $step = 2;
                $question = $user['security_question'] ?? '';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Password | <?= __('app_name') ?></title>
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
            max-height: 50px;
            width: auto;
            border-radius: var(--radius-md);
            background: #ffffff;
            padding: 4px;
            margin-bottom: 0.75rem;
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
            <h4 class="fw-bold mb-1">Reset Password</h4>
            <p class="text-muted small mb-0">Step <?= $step ?> of 2: <?= $step == 1 ? 'Verify account username' : 'Answer security question' ?></p>
        </div>

        <div class="auth-body">
            <?php if (!empty($error)): ?>
                <div class="alert alert-danger d-flex align-items-center gap-2 py-2 small mb-3" role="alert">
                    <i class="fas fa-exclamation-circle"></i>
                    <div><?= htmlspecialchars($error) ?></div>
                </div>
            <?php endif; ?>

            <?php if ($step === 1): ?>
                <form method="POST">
                    <div class="mb-4">
                        <label class="form-label small fw-bold text-muted">Account Username</label>
                        <div class="input-group">
                            <span class="input-group-text bg-body border-end-0 text-muted">
                                <i class="fas fa-user"></i>
                            </span>
                            <input type="text" name="username" class="form-control border-start-0" placeholder="Enter your username" required autofocus value="<?= htmlspecialchars($_POST['username'] ?? '') ?>">
                        </div>
                    </div>
                    <button type="submit" name="check_user" class="btn btn-primary w-100 py-2 fw-bold shadow-sm">
                        Continue &rarr;
                    </button>
                </form>
            <?php else: ?>
                <form method="POST">
                    <input type="hidden" name="username" value="<?= htmlspecialchars($username) ?>">
                    
                    <div class="p-3 bg-body rounded-3 mb-3 border">
                        <small class="text-muted text-uppercase fw-bold" style="font-size: 0.7rem;">Your Security Question</small>
                        <div class="fw-semibold text-primary mt-1"><?= htmlspecialchars($question) ?></div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted">Security Answer</label>
                        <input type="text" name="security_answer" class="form-control" required placeholder="Type your answer" autofocus>
                    </div>

                    <div class="mb-3">
                        <label class="form-label small fw-bold text-muted">New Password</label>
                        <input type="password" name="new_password" class="form-control" required minlength="6" placeholder="At least 6 characters">
                    </div>

                    <div class="mb-4">
                        <label class="form-label small fw-bold text-muted">Confirm New Password</label>
                        <input type="password" name="confirm_password" class="form-control" required minlength="6" placeholder="Repeat new password">
                    </div>

                    <button type="submit" name="reset_password" class="btn btn-success w-100 py-2 fw-bold shadow-sm">
                        <i class="fas fa-key me-2"></i> Save New Password
                    </button>
                </form>
            <?php endif; ?>

            <div class="text-center mt-4 pt-2 border-top">
                <a href="login.php" class="text-muted small text-decoration-none">
                    &larr; Return to <span class="text-primary fw-semibold">Login</span>
                </a>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
</body>
</html>