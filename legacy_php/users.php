<?php
session_start();
require 'db.php';

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'owner') { 
    die("Access Denied: Owners Only."); 
}

$role = $_SESSION['role'];
$msg = '';
$error = '';

// Handle CRUD Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if (!verifyCsrfToken($_POST['csrf_token'] ?? '')) { 
        die("Security token mismatch."); 
    }

    $action = $_POST['action'];

    if ($action === 'add') {
        $fullName = trim($_POST['full_name'] ?? '');
        $username = trim($_POST['username'] ?? '');
        $password = $_POST['password'] ?? '';
        $confirmPassword = $_POST['confirm_password'] ?? '';
        $assignedRole = $_POST['role'] ?? 'cashier';
        $gender = $_POST['gender'] ?? 'Male';
        $race = trim($_POST['race'] ?? 'Malay');
        $address = trim($_POST['address'] ?? '');
        $phone = trim($_POST['phone_number'] ?? '');
        $securityQuestion = trim($_POST['security_question'] ?? 'What was the name of your first school?');
        $securityAnswer = trim($_POST['security_answer'] ?? '');

        if (empty($fullName) || empty($username) || empty($password)) {
            $error = "Please fill in all required fields.";
        } elseif ($password !== $confirmPassword) {
            $error = "Passwords do not match.";
        } elseif (strlen($password) < 6) {
            $error = "Password must be at least 6 characters long.";
        } else {
            $check = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = ?");
            $check->execute([$username]);
            if ($check->fetchColumn() > 0) {
                $error = "Username '{$username}' already exists. Please choose a different username.";
            } else {
                $passHash = password_hash($password, PASSWORD_BCRYPT);
                $secHash = !empty($securityAnswer) ? password_hash(strtolower($securityAnswer), PASSWORD_BCRYPT) : null;

                $stmt = $pdo->prepare("INSERT INTO users (username, password, role, full_name, gender, race, address, phone_number, security_question, security_answer) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$username, $passHash, $assignedRole, $fullName, $gender, $race, $address, $phone, $securityQuestion, $secHash]);

                logActivity($pdo, "User Added", "Created account for: {$username} ({$assignedRole})");
                $msg = "Staff account '{$username}' created successfully.";
            }
        }
    } elseif ($action === 'update') {
        $id = (int)$_POST['id'];
        $fullName = trim($_POST['full_name'] ?? '');
        $username = trim($_POST['username'] ?? '');
        $assignedRole = $_POST['role'] ?? 'cashier';
        $gender = $_POST['gender'] ?? 'Male';
        $race = trim($_POST['race'] ?? 'Malay');
        $address = trim($_POST['address'] ?? '');
        $phone = trim($_POST['phone_number'] ?? '');
        $newPassword = $_POST['new_password'] ?? '';
        $confirmNewPassword = $_POST['confirm_new_password'] ?? '';

        if (empty($fullName) || empty($username)) {
            $error = "Full Name and Username are required.";
        } else {
            if (!empty($newPassword)) {
                if ($newPassword !== $confirmNewPassword) {
                    $error = "New passwords do not match.";
                } elseif (strlen($newPassword) < 6) {
                    $error = "New password must be at least 6 characters.";
                } else {
                    $passHash = password_hash($newPassword, PASSWORD_BCRYPT);
                    $stmt = $pdo->prepare("UPDATE users SET password = ?, full_name = ?, username = ?, role = ?, gender = ?, race = ?, address = ?, phone_number = ? WHERE id = ?");
                    $stmt->execute([$passHash, $fullName, $username, $assignedRole, $gender, $race, $address, $phone, $id]);
                    logActivity($pdo, "User Updated", "Updated details and changed password for staff #{$id} ({$username})");
                    $msg = "Staff account updated with new password.";
                }
            } else {
                $stmt = $pdo->prepare("UPDATE users SET full_name = ?, username = ?, role = ?, gender = ?, race = ?, address = ?, phone_number = ? WHERE id = ?");
                $stmt->execute([$fullName, $username, $assignedRole, $gender, $race, $address, $phone, $id]);
                logActivity($pdo, "User Updated", "Updated profile info for staff #{$id} ({$username})");
                $msg = "Staff account updated successfully.";
            }
        }
    } elseif ($action === 'delete') {
        $id = (int)$_POST['id'];
        if ($id === (int)$_SESSION['user_id']) {
            $error = "You cannot delete your own logged-in account.";
        } else {
            $uName = $pdo->query("SELECT username FROM users WHERE id = {$id}")->fetchColumn();
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            logActivity($pdo, "User Deleted", "Removed staff account #{$id} ({$uName})");
            $msg = "Staff account removed.";
        }
    }
}

// --- Filtering, Pagination & Sorting ---
$search = trim($_GET['search'] ?? '');
$roleFilter = $_GET['role_filter'] ?? 'all';

$limit = 10;
$page = max(1, (int)($_GET['page'] ?? 1));
$offset = ($page - 1) * $limit;

$sortBy = $_GET['sort_by'] ?? 'id';
$sortOrder = strtoupper($_GET['sort_order'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';

$allowedSort = ['id', 'full_name', 'username', 'role', 'phone_number'];
if (!in_array($sortBy, $allowedSort)) {
    $sortBy = 'id';
}

$conditions = [];
$params = [];

if (!empty($search)) {
    $conditions[] = "(full_name LIKE ? OR username LIKE ? OR phone_number LIKE ?)";
    $params = array_merge($params, ["%$search%", "%$search%", "%$search%"]);
}
if ($roleFilter !== 'all') {
    $conditions[] = "role = ?";
    $params[] = $roleFilter;
}

$whereClause = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

$countStmt = $pdo->prepare("SELECT COUNT(*) FROM users $whereClause");
$countStmt->execute($params);
$totalUsers = (int)$countStmt->fetchColumn();
$totalPages = max(1, ceil($totalUsers / $limit));

$query = "SELECT * FROM users $whereClause ORDER BY $sortBy $sortOrder LIMIT $limit OFFSET $offset";
$stmt = $pdo->prepare($query);
$stmt->execute($params);
$users = $stmt->fetchAll();

// Role counts
$ownerCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'owner'")->fetchColumn();
$cashierCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'cashier'")->fetchColumn();
$stockCount = (int)$pdo->query("SELECT COUNT(*) FROM users WHERE role = 'stock_handler'")->fetchColumn();

$pageTitle = __('staff');
$pageSubtitle = 'Manage Cashier Accounts, Stock Handlers & Security Roles';
?>
<!DOCTYPE html>
<html lang="<?= $_SESSION['lang'] ?? 'en' ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('staff') ?> | <?= __('app_name') ?></title>
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
                        <h4 class="fw-bold mb-1"><?= __('staff') ?></h4>
                        <p class="text-muted small mb-0">Total <?= $totalUsers ?> staff and administrative accounts</p>
                    </div>
                    <div>
                        <button type="button" class="btn btn-primary shadow-sm" data-bs-toggle="modal" data-bs-target="#addUserModal">
                            <i class="fas fa-user-plus me-1"></i> Add New Staff
                        </button>
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

                <!-- Role Metrics Row -->
                <div class="row g-3 mb-4">
                    <div class="col-sm-4">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Owners / Admins</span>
                                <div class="stat-icon bg-primary bg-opacity-10 text-primary"><i class="fas fa-user-shield"></i></div>
                            </div>
                            <div class="stat-value text-primary"><?= $ownerCount ?></div>
                            <small class="text-muted">Full administrative access</small>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Cashiers (POS)</span>
                                <div class="stat-icon bg-success bg-opacity-10 text-success"><i class="fas fa-cash-register"></i></div>
                            </div>
                            <div class="stat-value text-success"><?= $cashierCount ?></div>
                            <small class="text-muted">Sales checkout access</small>
                        </div>
                    </div>
                    <div class="col-sm-4">
                        <div class="card-modern card-stat">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="stat-label">Stock Handlers</span>
                                <div class="stat-icon bg-warning bg-opacity-10 text-warning"><i class="fas fa-boxes-stacked"></i></div>
                            </div>
                            <div class="stat-value text-warning"><?= $stockCount ?></div>
                            <small class="text-muted">Inventory and intake access</small>
                        </div>
                    </div>
                </div>

                <!-- Filters -->
                <div class="card-modern p-3 mb-4">
                    <form method="GET" class="row g-3 align-items-center">
                        <div class="col-md-6">
                            <div class="input-group">
                                <span class="input-group-text bg-body border-end-0 text-muted"><i class="fas fa-search"></i></span>
                                <input type="text" name="search" class="form-control border-start-0" placeholder="Search staff by name, username, or phone..." value="<?= htmlspecialchars($search) ?>">
                            </div>
                        </div>
                        <div class="col-md-3">
                            <select name="role_filter" class="form-select" onchange="this.form.submit()">
                                <option value="all" <?= $roleFilter === 'all' ? 'selected' : '' ?>>All Roles</option>
                                <option value="owner" <?= $roleFilter === 'owner' ? 'selected' : '' ?>>Owners Only</option>
                                <option value="cashier" <?= $roleFilter === 'cashier' ? 'selected' : '' ?>>Cashiers Only</option>
                                <option value="stock_handler" <?= $roleFilter === 'stock_handler' ? 'selected' : '' ?>>Stock Handlers Only</option>
                            </select>
                        </div>
                        <div class="col-md-3 d-flex gap-2">
                            <button type="submit" class="btn btn-primary flex-grow-1">Filter</button>
                            <?php if (!empty($search) || $roleFilter !== 'all'): ?>
                                <a href="users.php" class="btn btn-light border"><i class="fas fa-undo"></i></a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>

                <!-- Users Table -->
                <div class="table-modern-wrapper">
                    <div class="table-responsive">
                        <table class="table table-modern">
                            <thead>
                                <tr>
                                    <th>Staff Member</th>
                                    <th>Username</th>
                                    <th>Assigned Role</th>
                                    <th>Phone Number</th>
                                    <th>Address</th>
                                    <th>Registered</th>
                                    <th class="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php if (empty($users)): ?>
                                    <tr>
                                        <td colspan="7" class="text-center py-5 text-muted">
                                            <i class="fas fa-users-slash fa-3x opacity-25 mb-2 d-block"></i>
                                            No staff accounts found.
                                        </td>
                                    </tr>
                                <?php else: ?>
                                    <?php foreach ($users as $u): ?>
                                        <tr>
                                            <td>
                                                <div class="d-flex align-items-center gap-2">
                                                    <div class="user-avatar-sm" style="width: 32px; height: 32px; font-size: 0.8rem;">
                                                        <?= strtoupper(substr($u['username'], 0, 1)) ?>
                                                    </div>
                                                    <div>
                                                        <div class="fw-bold"><?= htmlspecialchars($u['full_name']) ?></div>
                                                        <small class="text-muted"><?= htmlspecialchars($u['gender']) ?> &bull; <?= htmlspecialchars($u['race']) ?></small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <code class="fw-semibold text-primary">@<?= htmlspecialchars($u['username']) ?></code>
                                            </td>
                                            <td>
                                                <?php if ($u['role'] === 'owner'): ?>
                                                    <span class="badge badge-soft-primary"><i class="fas fa-shield-halved me-1"></i> Owner</span>
                                                <?php elseif ($u['role'] === 'cashier'): ?>
                                                    <span class="badge badge-soft-success"><i class="fas fa-cash-register me-1"></i> Cashier</span>
                                                <?php else: ?>
                                                    <span class="badge badge-soft-warning"><i class="fas fa-boxes-stacked me-1"></i> Stock Handler</span>
                                                <?php endif; ?>
                                            </td>
                                            <td>
                                                <?= !empty($u['phone_number']) ? htmlspecialchars($u['phone_number']) : '<span class="text-muted small">N/A</span>' ?>
                                            </td>
                                            <td class="small text-muted" style="max-width: 200px;">
                                                <?= htmlspecialchars($u['address'] ?? 'N/A') ?>
                                            </td>
                                            <td class="small text-muted">
                                                <?= date('d M Y', strtotime($u['created_at'])) ?>
                                            </td>
                                            <td class="text-end">
                                                <div class="btn-group btn-group-sm">
                                                    <button type="button" class="btn btn-light border text-primary" title="Edit Staff" onclick='openEditUser(<?= json_encode($u) ?>)'>
                                                        <i class="fas fa-edit"></i>
                                                    </button>
                                                    <?php if ($u['id'] !== (int)$_SESSION['user_id']): ?>
                                                        <button type="button" class="btn btn-light border text-danger" title="Delete Account" onclick="confirmDeleteUser(<?= $u['id'] ?>, '<?= htmlspecialchars(addslashes($u['username'])) ?>')">
                                                            <i class="fas fa-trash-alt"></i>
                                                        </button>
                                                    <?php endif; ?>
                                                </div>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                <?php endif; ?>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Pagination -->
                <?php if ($totalPages > 1): ?>
                    <nav class="mt-4">
                        <ul class="pagination justify-content-center">
                            <li class="page-item <?= $page <= 1 ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page - 1 ?>&search=<?= urlencode($search) ?>&role_filter=<?= $roleFilter ?>">&laquo; Previous</a>
                            </li>
                            <?php for ($p = 1; $p <= $totalPages; $p++): ?>
                                <li class="page-item <?= $p === $page ? 'active' : '' ?>">
                                    <a class="page-link" href="?page=<?= $p ?>&search=<?= urlencode($search) ?>&role_filter=<?= $roleFilter ?>"><?= $p ?></a>
                                </li>
                            <?php endfor; ?>
                            <li class="page-item <?= $page >= $totalPages ? 'disabled' : '' ?>">
                                <a class="page-link" href="?page=<?= $page + 1 ?>&search=<?= urlencode($search) ?>&role_filter=<?= $roleFilter ?>">Next &raquo;</a>
                            </li>
                        </ul>
                    </nav>
                <?php endif; ?>
            </main>
        </div>
    </div>

    <!-- Add User Modal -->
    <div class="modal fade" id="addUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="add">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-user-plus text-primary me-2"></i> Add New Staff Member</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Full Name *</label>
                                <input type="text" name="full_name" class="form-control" required placeholder="e.g., Ali Ahmad" autofocus>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Username *</label>
                                <input type="text" name="username" class="form-control" required placeholder="e.g., ali99">
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Password *</label>
                                <input type="password" name="password" class="form-control" required minlength="6">
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Confirm Password *</label>
                                <input type="password" name="confirm_password" class="form-control" required minlength="6">
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Assign Role</label>
                                <select name="role" class="form-select">
                                    <option value="cashier">Cashier</option>
                                    <option value="stock_handler">Stock Handler</option>
                                    <option value="owner">Owner</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Phone Number</label>
                                <input type="text" name="phone_number" class="form-control" placeholder="0123456789">
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Gender</label>
                                <select name="gender" class="form-select">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Race</label>
                                <input type="text" name="race" class="form-control" value="Malay">
                            </div>
                        </div>
                        <div class="mb-2">
                            <label class="form-label small fw-bold text-muted">Address</label>
                            <textarea name="address" class="form-control" rows="2" placeholder="Residential address"></textarea>
                        </div>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-primary fw-bold"><?= __('save') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div class="modal fade" id="editUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="update">
                    <input type="hidden" name="id" id="editUserId">
                    <div class="modal-header border-bottom">
                        <h5 class="modal-title fw-bold"><i class="fas fa-user-pen text-primary me-2"></i> Edit Staff Account</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3">
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Full Name *</label>
                                <input type="text" name="full_name" id="editFullName" class="form-control" required>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Username *</label>
                                <input type="text" name="username" id="editUsername" class="form-control" required>
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Assign Role</label>
                                <select name="role" id="editRole" class="form-select">
                                    <option value="cashier">Cashier</option>
                                    <option value="stock_handler">Stock Handler</option>
                                    <option value="owner">Owner</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Phone Number</label>
                                <input type="text" name="phone_number" id="editPhone" class="form-control">
                            </div>
                        </div>
                        <div class="row g-2 mb-3">
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Gender</label>
                                <select name="gender" id="editGender" class="form-select">
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                            <div class="col-6">
                                <label class="form-label small fw-bold text-muted">Race</label>
                                <input type="text" name="race" id="editRace" class="form-control">
                            </div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small fw-bold text-muted">Address</label>
                            <textarea name="address" id="editAddress" class="form-control" rows="2"></textarea>
                        </div>
                        <div class="p-3 bg-body rounded border">
                            <label class="form-label small fw-bold text-muted mb-1">Change Password (leave blank to keep current)</label>
                            <div class="row g-2">
                                <div class="col-6">
                                    <input type="password" name="new_password" class="form-control form-control-sm" placeholder="New password">
                                </div>
                                <div class="col-6">
                                    <input type="password" name="confirm_new_password" class="form-control form-control-sm" placeholder="Confirm new password">
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-primary fw-bold"><?= __('update') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Delete User Modal -->
    <div class="modal fade" id="deleteUserModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content card-modern border-0">
                <form method="POST">
                    <input type="hidden" name="csrf_token" value="<?= getCsrfToken() ?>">
                    <input type="hidden" name="action" value="delete">
                    <input type="hidden" name="id" id="deleteUserId">
                    <div class="modal-header border-bottom">
                        <h6 class="modal-title fw-bold text-danger"><i class="fas fa-trash-alt me-2"></i> Delete Staff Account</h6>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body py-3 text-center">
                        <p class="small mb-0">Delete account for user <strong id="deleteUserName">User</strong>?</p>
                    </div>
                    <div class="modal-footer border-top">
                        <button type="button" class="btn btn-light" data-bs-dismiss="modal"><?= __('cancel') ?></button>
                        <button type="submit" class="btn btn-danger fw-bold"><?= __('delete') ?></button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/app.js"></script>
    <script>
        const editUserModal = new bootstrap.Modal(document.getElementById('editUserModal'));
        const deleteUserModal = new bootstrap.Modal(document.getElementById('deleteUserModal'));

        function openEditUser(user) {
            document.getElementById('editUserId').value = user.id;
            document.getElementById('editFullName').value = user.full_name;
            document.getElementById('editUsername').value = user.username;
            document.getElementById('editRole').value = user.role;
            document.getElementById('editPhone').value = user.phone_number || '';
            document.getElementById('editGender').value = user.gender;
            document.getElementById('editRace').value = user.race || 'Malay';
            document.getElementById('editAddress').value = user.address || '';
            editUserModal.show();
        }

        function confirmDeleteUser(id, username) {
            document.getElementById('deleteUserId').value = id;
            document.getElementById('deleteUserName').innerText = `@${username}`;
            deleteUserModal.show();
        }
    </script>
</body>
</html>