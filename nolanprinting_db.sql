-- phpMyAdmin SQL Dump
-- version 5.1.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Aug 18, 2026 at 10:35 AM
-- Server version: 10.4.18-MariaDB
-- PHP Version: 8.0.3

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nolanprinting_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `activity_log`
--

CREATE TABLE `activity_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `details` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `activity_log`
--

INSERT INTO `activity_log` (`id`, `user_id`, `action`, `details`, `created_at`) VALUES
(1, 1, 'Log Out', 'User Hariz has logged out.', '2026-08-17 02:58:02'),
(2, 1, 'Product Updated', 'Modified product: Printing Service', '2026-08-17 08:30:30'),
(3, 1, 'Category Added', 'Created category: Stationery', '2026-08-18 03:25:58'),
(4, 1, 'Supplier Added', 'Added supplier: Stabilo', '2026-08-18 03:26:42'),
(5, 1, 'Sale Voided', 'Voided transaction #1 and restored stock.', '2026-08-18 03:27:59'),
(6, 1, 'Sale Voided', 'Voided transaction #2 and restored stock.', '2026-08-18 03:28:05'),
(7, 1, 'Sale Voided', 'Voided transaction #11 and restored stock.', '2026-08-18 03:32:42'),
(8, 1, 'Sale Voided', 'Voided transaction #12 and restored stock.', '2026-08-18 03:38:20'),
(9, 1, 'Sale Voided', 'Voided transaction #13 and restored stock.', '2026-08-18 03:43:55'),
(10, 1, 'Sale Voided', 'Voided transaction #14 and restored stock.', '2026-08-18 03:45:38'),
(11, 1, 'Sale Voided', 'Voided transaction #15 and restored stock.', '2026-08-18 03:52:18'),
(12, 1, 'Sale Voided', 'Voided transaction #16 and restored stock.', '2026-08-18 03:59:20'),
(13, 1, 'Sale Voided', 'Voided transaction #17 and restored stock.', '2026-08-18 04:04:46'),
(14, 1, 'Sale Voided', 'Voided transaction #18 and restored stock.', '2026-08-18 04:09:47'),
(15, 1, 'Sale Voided', 'Voided transaction #3 and restored stock.', '2026-08-18 04:38:01'),
(16, 1, 'Sale Voided', 'Voided transaction #4 and restored stock.', '2026-08-18 04:38:05'),
(17, 1, 'Sale Voided', 'Voided transaction #5 and restored stock.', '2026-08-18 04:38:10'),
(18, 1, 'Sale Voided', 'Voided transaction #6 and restored stock.', '2026-08-18 04:38:14'),
(19, 1, 'Sale Voided', 'Voided transaction #7 and restored stock.', '2026-08-18 04:38:17'),
(20, 1, 'Sale Voided', 'Voided transaction #8 and restored stock.', '2026-08-18 04:38:20'),
(21, 1, 'Sale Voided', 'Voided transaction #9 and restored stock.', '2026-08-18 04:38:24'),
(22, 1, 'Sale Voided', 'Voided transaction #10 and restored stock.', '2026-08-18 04:38:27'),
(23, 1, 'Product Deleted', 'Deleted product ID: 4', '2026-08-18 06:59:54'),
(24, 1, 'Sale Voided', 'Voided transaction #19 and restored stock.', '2026-08-18 07:15:52'),
(25, 1, 'Product Deleted', 'Deleted product ID: 4', '2026-08-18 07:16:03'),
(26, 1, 'Product Archived', 'Archived product ID: 4', '2026-08-18 07:17:26'),
(27, 1, 'Product Restored', 'Restored product: Pen Biru (ID: 4)', '2026-08-18 07:28:38'),
(28, 1, 'Product Archived', 'Archived product ID: 4', '2026-08-18 07:30:00'),
(29, 1, 'Product Restored', 'Restored product: Pen Biru (ID: 4)', '2026-08-18 07:30:05'),
(30, 1, 'Product Archived', 'Archived product ID: 4', '2026-08-18 07:41:04'),
(31, 1, 'Product Restored', 'Restored product: Pen Biru (ID: 4)', '2026-08-18 07:41:19'),
(32, 1, 'Product Archived', 'Archived product ID: 4', '2026-08-18 07:43:39'),
(33, 1, 'Product Restored', 'Restored product: Pen Biru (ID: 4)', '2026-08-18 07:43:44'),
(34, 1, 'Product Archived', 'Archived product ID: 4', '2026-08-18 07:45:59'),
(35, 1, 'Product Restored', 'Restored product: Pen Biru (ID: 4)', '2026-08-18 07:46:09'),
(36, 1, 'Supplier Updated', 'Updated info for supplier: Stabilo', '2026-08-18 07:47:11'),
(37, 1, 'Stock Added', 'Added 1 units to: Pen Biru', '2026-08-18 07:56:21'),
(38, 1, 'User Updated', 'Updated info for User ID: 1', '2026-08-18 08:07:56'),
(39, 1, 'User Updated', 'Updated info for User ID: 1', '2026-08-18 08:08:17'),
(40, 1, 'User Updated', 'Updated info for User ID: 1', '2026-08-18 08:08:25'),
(41, 1, 'Supplier Updated', 'Updated info for supplier: Stabilo', '2026-08-18 08:08:46');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `created_at`) VALUES
(1, 'Stationery', '2026-08-18 03:25:58');

-- --------------------------------------------------------

--
-- Table structure for table `expenses`
--

CREATE TABLE `expenses` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `description` varchar(255) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `category` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------

--
-- Table structure for table `products`
--

CREATE TABLE `products` (
  `id` int(11) NOT NULL,
  `barcode` varchar(100) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `cost_price` decimal(10,2) NOT NULL,
  `stock` int(11) NOT NULL DEFAULT 0,
  `threshold` int(11) NOT NULL DEFAULT 10,
  `category_id` int(11) DEFAULT NULL,
  `supplier_id` int(11) DEFAULT NULL,
  `status` enum('active','archived') NOT NULL DEFAULT 'active',
  `is_service` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `products`
--

INSERT INTO `products` (`id`, `barcode`, `name`, `price`, `cost_price`, `stock`, `threshold`, `category_id`, `supplier_id`, `status`, `is_service`, `created_at`, `updated_at`) VALUES
(1, '123456', 'Printing Service', '0.00', '0.00', 1000009, 10, NULL, NULL, 'active', 1, '2026-08-17 08:29:39', '2026-08-18 04:38:27'),
(3, '456789', 'Photocopy Service', '0.00', '0.00', 1000006, 10, NULL, NULL, 'active', 1, '2026-08-17 08:30:58', '2026-08-18 04:38:27'),
(4, '111111', 'Pen Biru', '0.80', '0.50', 50, 10, 1, 1, 'active', 0, '2026-08-18 03:27:22', '2026-08-18 07:56:21');

-- --------------------------------------------------------

--
-- Table structure for table `sales`
--

CREATE TABLE `sales` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL DEFAULT 0.00,
  `discount_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `tax_amount` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `status` enum('completed','voided') NOT NULL DEFAULT 'completed',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `sales`
--

INSERT INTO `sales` (`id`, `user_id`, `subtotal`, `discount_amount`, `tax_amount`, `total`, `payment_method`, `status`, `created_at`) VALUES
(1, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-17 08:45:01'),
(2, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-17 08:45:07'),
(3, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-17 08:45:35'),
(4, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-18 03:01:40'),
(5, 1, '0.00', '0.00', '0.00', '0.50', 'Cash', 'voided', '2026-08-18 03:02:00'),
(6, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-18 03:03:09'),
(7, 1, '0.00', '0.00', '0.00', '0.50', 'Cash', 'voided', '2026-08-18 03:03:25'),
(8, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:16:23'),
(9, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:16:44'),
(10, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:18:04'),
(11, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-18 03:32:20'),
(12, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:38:08'),
(13, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:43:42'),
(14, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:45:28'),
(15, 1, '0.80', '0.00', '0.05', '0.85', 'Cash', 'voided', '2026-08-18 03:52:08'),
(16, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-18 03:59:03'),
(17, 1, '0.00', '0.00', '0.00', '1.30', 'Cash', 'voided', '2026-08-18 04:04:37'),
(18, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-18 04:09:37'),
(19, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'voided', '2026-08-18 04:11:13'),
(20, 1, '0.00', '0.00', '0.00', '0.00', 'Cash', 'completed', '2026-08-18 04:11:39'),
(21, 1, '0.00', '0.00', '0.00', '0.15', 'Cash', 'completed', '2026-08-18 04:18:18'),
(22, 1, '0.00', '0.00', '0.00', '0.50', 'Cash', 'completed', '2026-08-18 04:37:34'),
(23, 1, '0.00', '0.00', '0.00', '0.80', 'Cash', 'completed', '2026-08-18 07:41:44');

-- --------------------------------------------------------

--
-- Table structure for table `sale_items`
--

CREATE TABLE `sale_items` (
  `id` int(11) NOT NULL,
  `sale_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `price_at_sale` decimal(10,2) NOT NULL,
  `cost_at_sale` decimal(10,2) NOT NULL,
  `details` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `sale_items`
--

INSERT INTO `sale_items` (`id`, `sale_id`, `product_id`, `quantity`, `price_at_sale`, `cost_at_sale`, `details`) VALUES
(1, 1, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(2, 1, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(3, 2, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(4, 2, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(5, 3, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(6, 3, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(7, 4, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(8, 4, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(9, 5, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(10, 6, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(11, 6, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(12, 7, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(13, 8, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(14, 8, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(15, 9, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(16, 9, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(17, 10, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 80gsm'),
(18, 10, 3, 1, '0.30', '0.00', '1 pages, B&W, A4 80gsm'),
(19, 11, 4, 1, '0.80', '0.50', NULL),
(20, 12, 4, 1, '0.80', '0.50', NULL),
(21, 13, 4, 1, '0.80', '0.50', NULL),
(22, 14, 4, 1, '0.80', '0.50', NULL),
(23, 15, 4, 1, '0.80', '0.50', NULL),
(24, 16, 4, 1, '0.80', '0.50', NULL),
(25, 17, 1, 1, '0.50', '0.00', '1 pages, B&W, A4 70gsm'),
(26, 17, 4, 1, '0.80', '0.50', NULL),
(27, 18, 4, 1, '0.80', '0.50', NULL),
(28, 19, 4, 1, '0.80', '0.50', NULL),
(29, 20, 1, 1, '0.00', '0.00', NULL),
(30, 20, 3, 1, '0.00', '0.00', NULL),
(31, 21, 1, 1, '0.15', '0.00', 'Black & White, A4 80gsm'),
(32, 22, 1, 1, '0.50', '0.00', '1 page(s), Black & White, A4 80gsm'),
(33, 23, 4, 1, '0.80', '0.50', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `setting_key` varchar(50) NOT NULL,
  `setting_value` varchar(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('discount_amount', '0'),
('discount_type', 'fixed'),
('tax_rate', '6');

-- --------------------------------------------------------

--
-- Table structure for table `stock_intake`
--

CREATE TABLE `stock_intake` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `stock_intake`
--

INSERT INTO `stock_intake` (`id`, `product_id`, `quantity`, `user_id`, `created_at`) VALUES
(1, 1, 999999, 1, '2026-08-17 08:29:39'),
(2, 3, 999999, 1, '2026-08-17 08:30:58'),
(3, 4, 50, 1, '2026-08-18 03:27:22'),
(4, 4, 1, 1, '2026-08-18 07:56:21');

-- --------------------------------------------------------

--
-- Table structure for table `suppliers`
--

CREATE TABLE `suppliers` (
  `id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `contact` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `suppliers`
--

INSERT INTO `suppliers` (`id`, `name`, `contact`, `email`, `address`, `created_at`) VALUES
(1, 'Stabilo', '03-5485921', 'stabilo@gmail.com', '6, Jalan SR 8/3, Taman Serdang Raya, 43300 Seri Kembangan, Selangor', '2026-08-18 03:26:42');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('owner','cashier','stock_handler') NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `gender` enum('Male','Female','Other') NOT NULL,
  `race` varchar(100) NOT NULL,
  `address` text NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `security_question` varchar(255) DEFAULT NULL,
  `security_answer` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `username`, `password`, `role`, `full_name`, `gender`, `race`, `address`, `phone_number`, `security_question`, `security_answer`, `created_at`) VALUES
(1, 'Hariz', '$2y$10$JXjJtz5yROtX.fUXZ1Mo3eHSCa1iO10eAyOpGAkzX9yaJhUVy9Jh6', 'owner', 'Muhammad Hariz Bin Muslan', 'Male', 'Malay', '12A, Jalan Andaman 5, Taman Andaman Ukay, 68000 Ampang, Selangor', '0132707949', NULL, NULL, '2026-08-17 02:53:14');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `name` (`name`);

--
-- Indexes for table `expenses`
--
ALTER TABLE `expenses`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `products`
--
ALTER TABLE `products`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `barcode` (`barcode`),
  ADD KEY `category_id` (`category_id`),
  ADD KEY `supplier_id` (`supplier_id`);

--
-- Indexes for table `sales`
--
ALTER TABLE `sales`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sale_id` (`sale_id`),
  ADD KEY `product_id` (`product_id`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`setting_key`);

--
-- Indexes for table `stock_intake`
--
ALTER TABLE `stock_intake`
  ADD PRIMARY KEY (`id`),
  ADD KEY `product_id` (`product_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `suppliers`
--
ALTER TABLE `suppliers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `activity_log`
--
ALTER TABLE `activity_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=42;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `expenses`
--
ALTER TABLE `expenses`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `products`
--
ALTER TABLE `products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `sales`
--
ALTER TABLE `sales`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `sale_items`
--
ALTER TABLE `sale_items`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=34;

--
-- AUTO_INCREMENT for table `stock_intake`
--
ALTER TABLE `stock_intake`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `suppliers`
--
ALTER TABLE `suppliers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `activity_log`
--
ALTER TABLE `activity_log`
  ADD CONSTRAINT `activity_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `expenses`
--
ALTER TABLE `expenses`
  ADD CONSTRAINT `expenses_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `products`
--
ALTER TABLE `products`
  ADD CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `products_ibfk_2` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `sales`
--
ALTER TABLE `sales`
  ADD CONSTRAINT `sales_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `sale_items`
--
ALTER TABLE `sale_items`
  ADD CONSTRAINT `sale_items_ibfk_1` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `sale_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`);

--
-- Constraints for table `stock_intake`
--
ALTER TABLE `stock_intake`
  ADD CONSTRAINT `stock_intake_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `stock_intake_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
