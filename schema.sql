-- TilePoint Enterprise Retail & Inventory POS Engine
-- Production-Ready MySQL Database Schema

CREATE DATABASE IF NOT EXISTS `tilepoint_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tilepoint_db`;

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS `branches` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `manager` VARCHAR(191) NULL,
  `address` TEXT NULL,
  `phone` VARCHAR(64) NULL,
  `monthlySales` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `staffCount` INT NOT NULL DEFAULT 0,
  `activeCashiers` INT NOT NULL DEFAULT 0,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `isDistributionBranch` TINYINT(1) NOT NULL DEFAULT 0,
  `storeLogo` LONGTEXT NULL,
  `branchCode` VARCHAR(64) NULL,
  `localIp` VARCHAR(64) NULL,
  `gatewayRules` TEXT NULL,
  `receiptFacebook` VARCHAR(191) NULL,
  `receiptPromoText` TEXT NULL,
  `receiptQrBase64` LONGTEXT NULL,
  `receiptThankYou` TEXT NULL,
  `tin` VARCHAR(64) NULL,
  `logoSize` INT NULL DEFAULT 40,
  `openingTime` VARCHAR(32) NULL,
  `closingTime` VARCHAR(32) NULL,
  `operatingDays` JSON NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_branches_code` (`branchCode`),
  KEY `idx_branches_is_deleted` (`isDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS `users` (
  `id` VARCHAR(64) NOT NULL,
  `avatarInitials` VARCHAR(16) NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `role` VARCHAR(64) NOT NULL DEFAULT 'Cashier',
  `branchAssignmentId` VARCHAR(64) NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `managerPin` VARCHAR(64) NULL,
  `passwordHash` VARCHAR(255) NULL,
  `profilePicture` LONGTEXT NULL,
  `isNew` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  KEY `idx_users_email` (`email`),
  KEY `idx_users_branch_id` (`branchAssignmentId`),
  KEY `idx_users_role` (`role`),
  CONSTRAINT `fk_users_branch` FOREIGN KEY (`branchAssignmentId`) REFERENCES `branches` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Suppliers Table
CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `contactPerson` VARCHAR(191) NULL,
  `email` VARCHAR(191) NULL,
  `phone` VARCHAR(64) NULL,
  `address` TEXT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suppliers_name` (`name`),
  KEY `idx_suppliers_is_deleted` (`isDeleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Brands Table
CREATE TABLE IF NOT EXISTS `brands` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `supplierId` VARCHAR(64) NOT NULL,
  `description` TEXT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_brands_supplier_id` (`supplierId`),
  CONSTRAINT `fk_brands_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Products Table
CREATE TABLE IF NOT EXISTS `products` (
  `id` VARCHAR(64) NOT NULL,
  `productCode` VARCHAR(128) NOT NULL,
  `productName` VARCHAR(255) NOT NULL,
  `category` VARCHAR(128) NOT NULL,
  `brand` VARCHAR(128) NULL,
  `sku` VARCHAR(128) NULL,
  `barcode` VARCHAR(128) NULL,
  `unit` VARCHAR(64) NOT NULL DEFAULT 'Pcs',
  `costPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `sellingPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `stockQuantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `lowStockThreshold` DECIMAL(12, 2) NULL DEFAULT 10.00,
  `designName` VARCHAR(191) NULL,
  `size` VARCHAR(64) NULL,
  `supplierId` VARCHAR(64) NULL,
  `origin` VARCHAR(128) NULL,
  `image` LONGTEXT NULL,
  `boxQuantity` DECIMAL(10, 2) NULL,
  `coveragePerBox` DECIMAL(10, 4) NULL,
  `minimumStock` DECIMAL(12, 2) NULL,
  `qrCode` TEXT NULL,
  `createdBy` VARCHAR(64) NULL,
  `updatedBy` VARCHAR(64) NULL,
  `version` INT NOT NULL DEFAULT 1,
  `markupPercent` DECIMAL(8, 2) NULL,
  `taxType` VARCHAR(64) NULL,
  `hasExpiration` TINYINT(1) NOT NULL DEFAULT 0,
  `expirationDate` DATETIME NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_code` (`productCode`),
  KEY `idx_products_barcode` (`barcode`),
  KEY `idx_products_sku` (`sku`),
  KEY `idx_products_category` (`category`),
  KEY `idx_products_brand` (`brand`),
  KEY `idx_products_supplier_id` (`supplierId`),
  KEY `idx_products_is_deleted` (`isDeleted`),
  CONSTRAINT `fk_products_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Branch Stock Table
CREATE TABLE IF NOT EXISTS `branch_stock` (
  `id` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `lowStockThreshold` DECIMAL(12, 2) NULL,
  `lowStockThresholdOverride` DECIMAL(12, 2) NULL,
  `sellingPriceOverride` DECIMAL(12, 2) NULL,
  `version` INT NOT NULL DEFAULT 1,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_branch_product` (`branchId`, `productId`),
  KEY `idx_branch_stock_branch_id` (`branchId`),
  KEY `idx_branch_stock_product_id` (`productId`),
  CONSTRAINT `fk_branch_stock_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_branch_stock_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Shifts Table
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `cashierId` VARCHAR(64) NOT NULL,
  `cashierName` VARCHAR(191) NOT NULL,
  `openedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closedAt` DATETIME NULL,
  `startCash` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `endCash` DECIMAL(12, 2) NULL,
  `cashCount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Open',
  `notes` TEXT NULL,
  `variance` DECIMAL(12, 2) NULL DEFAULT 0.00,
  `shiftSalesTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `shiftVatTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `shiftDiscountTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `shiftSalesCount` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_shifts_branch_id` (`branchId`),
  KEY `idx_shifts_cashier_id` (`cashierId`),
  KEY `idx_shifts_status` (`status`),
  KEY `idx_shifts_opened_at` (`openedAt`),
  CONSTRAINT `fk_shifts_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_shifts_cashier` FOREIGN KEY (`cashierId`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Sales Table
CREATE TABLE IF NOT EXISTS `sales` (
  `id` VARCHAR(64) NOT NULL,
  `saleNumber` VARCHAR(128) NOT NULL,
  `shiftId` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `cashierId` VARCHAR(64) NOT NULL,
  `cashierName` VARCHAR(191) NOT NULL,
  `customerName` VARCHAR(191) NOT NULL DEFAULT 'Walk-in',
  `subtotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `vat` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `discount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `grandTotal` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `paymentMethod` VARCHAR(64) NOT NULL DEFAULT 'Cash',
  `amountTendered` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `changeAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `notes` TEXT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  `idempotencyKey` VARCHAR(191) NULL,
  `discountType` VARCHAR(64) NULL,
  `pointsEarned` DECIMAL(10, 2) NULL DEFAULT 0.00,
  `pointsRedeemed` DECIMAL(10, 2) NULL DEFAULT 0.00,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sales_number` (`saleNumber`),
  KEY `idx_sales_shift_id` (`shiftId`),
  KEY `idx_sales_branch_id` (`branchId`),
  KEY `idx_sales_cashier_id` (`cashierId`),
  KEY `idx_sales_created_at` (`createdAt`),
  KEY `idx_sales_is_deleted` (`isDeleted`),
  CONSTRAINT `fk_sales_shift` FOREIGN KEY (`shiftId`) REFERENCES `shifts` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sales_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Sale Items Table
CREATE TABLE IF NOT EXISTS `sale_items` (
  `id` VARCHAR(64) NOT NULL,
  `saleId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `unitPrice` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `total` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sale_items_sale_id` (`saleId`),
  KEY `idx_sale_items_product_id` (`productId`),
  CONSTRAINT `fk_sale_items_sale` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sale_items_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Purchase Orders Table
CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` VARCHAR(64) NOT NULL,
  `poNumber` VARCHAR(128) NOT NULL,
  `supplierId` VARCHAR(64) NOT NULL,
  `supplierName` VARCHAR(191) NULL,
  `totalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `branchId` VARCHAR(64) NULL,
  `requestedBy` VARCHAR(191) NULL,
  `date` DATETIME NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  `idempotencyKey` VARCHAR(191) NULL,
  `paymentMode` VARCHAR(64) NULL,
  `termStartDate` DATETIME NULL,
  `termEndDate` DATETIME NULL,
  `termsLength` INT NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_number` (`poNumber`),
  KEY `idx_po_supplier_id` (`supplierId`),
  KEY `idx_po_branch_id` (`branchId`),
  KEY `idx_po_status` (`status`),
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplierId`) REFERENCES `suppliers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` VARCHAR(64) NOT NULL,
  `poId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255) NULL,
  `quantityOrdered` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `quantityReceived` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `unitCost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `totalCost` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `costPrice` DECIMAL(12, 2) NULL,
  `quantityRequested` DECIMAL(12, 2) NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_po_items_po_id` (`poId`),
  KEY `idx_po_items_product_id` (`productId`),
  CONSTRAINT `fk_po_items_po` FOREIGN KEY (`poId`) REFERENCES `purchase_orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_po_items_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Stock Transfers Table
CREATE TABLE IF NOT EXISTS `stock_transfers` (
  `id` VARCHAR(64) NOT NULL,
  `transferNo` VARCHAR(128) NOT NULL,
  `fromBranchId` VARCHAR(64) NOT NULL,
  `toBranchId` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NULL,
  `transferType` VARCHAR(64) NOT NULL DEFAULT 'Standard',
  `requestedBy` VARCHAR(191) NOT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Pending',
  `reason` TEXT NULL,
  `approvedBy` VARCHAR(191) NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  `timestamp` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_transfer_no` (`transferNo`),
  KEY `idx_transfers_from_branch` (`fromBranchId`),
  KEY `idx_transfers_to_branch` (`toBranchId`),
  KEY `idx_transfers_branch_id` (`branchId`),
  KEY `idx_transfers_timestamp` (`timestamp`),
  KEY `idx_transfers_branch_timestamp` (`branchId`, `timestamp`),
  KEY `idx_transfers_status` (`status`),
  CONSTRAINT `fk_transfers_from_branch` FOREIGN KEY (`fromBranchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transfers_to_branch` FOREIGN KEY (`toBranchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Stock Transfer Items Table
CREATE TABLE IF NOT EXISTS `stock_transfer_items` (
  `id` VARCHAR(64) NOT NULL,
  `transferId` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_transfer_items_transfer_id` (`transferId`),
  KEY `idx_transfer_items_product_id` (`productId`),
  CONSTRAINT `fk_transfer_items_transfer` FOREIGN KEY (`transferId`) REFERENCES `stock_transfers` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_transfer_items_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Stock Movements Table
CREATE TABLE IF NOT EXISTS `stock_movements` (
  `id` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `referenceId` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `createdBy` VARCHAR(191) NOT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_stock_mov_product_id` (`productId`),
  KEY `idx_stock_mov_branch_id` (`branchId`),
  KEY `idx_stock_mov_type` (`type`),
  KEY `idx_stock_mov_reference_id` (`referenceId`),
  CONSTRAINT `fk_stock_mov_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_stock_mov_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Inventory Movements Table
CREATE TABLE IF NOT EXISTS `inventory_movements` (
  `id` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `type` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `sourceBranchId` VARCHAR(64) NULL,
  `destinationBranchId` VARCHAR(64) NULL,
  `referenceId` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `userId` VARCHAR(64) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inv_mov_product_id` (`productId`),
  KEY `idx_inv_mov_source_branch` (`sourceBranchId`),
  KEY `idx_inv_mov_dest_branch` (`destinationBranchId`),
  KEY `idx_inv_mov_user_id` (`userId`),
  CONSTRAINT `fk_inv_mov_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. Deliveries Table
CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` VARCHAR(64) NOT NULL,
  `saleId` VARCHAR(64) NOT NULL,
  `saleNumber` VARCHAR(128) NOT NULL,
  `customerName` VARCHAR(191) NOT NULL,
  `contactNumber` VARCHAR(64) NOT NULL,
  `houseNo` VARCHAR(128) NULL,
  `street` VARCHAR(191) NULL,
  `barangay` VARCHAR(128) NOT NULL,
  `cityMunicipality` VARCHAR(128) NOT NULL,
  `landmark` TEXT NULL,
  `deliveryDate` DATETIME NOT NULL,
  `deliveryTime` VARCHAR(32) NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  `truck` VARCHAR(128) NULL,
  `driver` VARCHAR(191) NULL,
  `helper` VARCHAR(191) NULL,
  `branchId` VARCHAR(64) NULL,
  `branchName` VARCHAR(191) NULL,
  `receiverName` VARCHAR(191) NULL,
  `customerSignature` LONGTEXT NULL,
  `deliveredAt` DATETIME NULL,
  `deliveredBy` VARCHAR(191) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deliveries_sale_id` (`saleId`),
  KEY `idx_deliveries_branch_id` (`branchId`),
  KEY `idx_deliveries_status` (`status`),
  CONSTRAINT `fk_deliveries_sale` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. Damage Logs Table
CREATE TABLE IF NOT EXISTS `damage_logs` (
  `id` VARCHAR(64) NOT NULL,
  `productId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `reason` VARCHAR(128) NULL,
  `notes` TEXT NULL,
  `reportedBy` VARCHAR(191) NOT NULL,
  `actionTaken` VARCHAR(191) NULL,
  `category` VARCHAR(128) NULL,
  `branchName` VARCHAR(191) NULL,
  `reportedAt` DATETIME NULL,
  `productSku` VARCHAR(128) NULL,
  `unitType` VARCHAR(64) NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_damage_product_id` (`productId`),
  KEY `idx_damage_branch_id` (`branchId`),
  CONSTRAINT `fk_damage_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_damage_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. Ledger Entries Table
CREATE TABLE IF NOT EXISTS `ledger_entries` (
  `id` VARCHAR(64) NOT NULL,
  `date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `productId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `movementType` VARCHAR(64) NOT NULL,
  `quantity` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `referenceNo` VARCHAR(128) NOT NULL,
  `remarks` TEXT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_ledger_product_id` (`productId`),
  KEY `idx_ledger_branch_id` (`branchId`),
  KEY `idx_ledger_date` (`date`),
  CONSTRAINT `fk_ledger_product` FOREIGN KEY (`productId`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ledger_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. Audit Logs Table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` VARCHAR(64) NOT NULL,
  `actionCode` VARCHAR(128) NULL,
  `description` TEXT NULL,
  `module` VARCHAR(64) NULL,
  `userId` VARCHAR(64) NULL,
  `username` VARCHAR(191) NULL,
  `referenceId` VARCHAR(191) NULL,
  `branchId` VARCHAR(64) NULL,
  `action` VARCHAR(191) NULL,
  `tableAffected` VARCHAR(128) NULL,
  `recordId` VARCHAR(191) NULL,
  `changePayload` JSON NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user_id` (`userId`),
  KEY `idx_audit_module` (`module`),
  KEY `idx_audit_action` (`actionCode`),
  KEY `idx_audit_branch_id` (`branchId`),
  KEY `idx_audit_timestamp` (`timestamp`),
  KEY `idx_audit_branch_timestamp` (`branchId`, `timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. Custom Corporate Bills Table
CREATE TABLE IF NOT EXISTS `custom_corporate_bills` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `supplierId` VARCHAR(64) NULL,
  `purchaseOrderId` VARCHAR(64) NULL,
  `totalAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `remainingBalance` DECIMAL(14, 2) NULL DEFAULT 0.00,
  `frequency` VARCHAR(64) NOT NULL DEFAULT 'Monthly',
  `nextDueDate` DATETIME NOT NULL,
  `installmentsCount` INT NULL DEFAULT 0,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `notes` TEXT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bills_supplier_id` (`supplierId`),
  KEY `idx_bills_po_id` (`purchaseOrderId`),
  KEY `idx_bills_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. Transmittals Table
CREATE TABLE IF NOT EXISTS `transmittals` (
  `id` VARCHAR(64) NOT NULL,
  `documentType` VARCHAR(128) NOT NULL,
  `fromBranchId` VARCHAR(64) NULL,
  `toBranchId` VARCHAR(64) NOT NULL,
  `submittedBy` VARCHAR(191) NOT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Pending',
  `payloadJson` JSON NOT NULL,
  `notes` TEXT NULL,
  `submittedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `idx_transmittals_from_branch` (`fromBranchId`),
  KEY `idx_transmittals_to_branch` (`toBranchId`),
  KEY `idx_transmittals_status` (`status`),
  KEY `idx_transmittals_submitted_at` (`submittedAt`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. Members Table
CREATE TABLE IF NOT EXISTS `members` (
  `id` VARCHAR(64) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NULL,
  `points` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `creditLimit` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `outstandingBalance` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Active',
  `branchId` VARCHAR(64) NULL,
  `createdAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_members_phone` (`phone`),
  KEY `idx_members_email` (`email`),
  KEY `idx_members_branch_id` (`branchId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. Expenses Table
CREATE TABLE IF NOT EXISTS `expenses` (
  `id` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `dateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `category` VARCHAR(128) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `recordedBy` VARCHAR(191) NOT NULL,
  `notes` TEXT NULL,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_branch_id` (`branchId`),
  KEY `idx_expenses_category` (`category`),
  KEY `idx_expenses_date_time` (`dateTime`),
  CONSTRAINT `fk_expenses_branch` FOREIGN KEY (`branchId`) REFERENCES `branches` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. Product Returns Table
CREATE TABLE IF NOT EXISTS `product_returns` (
  `id` VARCHAR(64) NOT NULL,
  `saleId` VARCHAR(64) NOT NULL,
  `productName` VARCHAR(255) NOT NULL,
  `quantityReturned` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  `amountRefunded` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `damageRestockFee` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Restocked',
  `dateTime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `isDeleted` TINYINT(1) NOT NULL DEFAULT 0,
  `deletedAt` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_returns_sale_id` (`saleId`),
  CONSTRAINT `fk_returns_sale` FOREIGN KEY (`saleId`) REFERENCES `sales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. Branch Sales Reports Table
CREATE TABLE IF NOT EXISTS `branch_sales_reports` (
  `id` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `branchName` VARCHAR(191) NOT NULL,
  `reportingDate` DATETIME NOT NULL,
  `totalSalesCount` INT NOT NULL DEFAULT 0,
  `totalSalesAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `totalVatAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `totalDiscountAmount` DECIMAL(14, 2) NOT NULL DEFAULT 0.00,
  `transmissionType` VARCHAR(64) NOT NULL DEFAULT 'Automated',
  `sales` JSON NOT NULL,
  `saleItems` JSON NOT NULL,
  `users` JSON NULL,
  `expenses` JSON NULL,
  `deliveries` JSON NULL,
  `purchaseOrders` JSON NULL,
  `pandl` JSON NULL,
  `heatmap` JSON NULL,
  `boa` JSON NULL,
  `notes` TEXT NULL,
  `status` VARCHAR(64) NOT NULL DEFAULT 'Submitted',
  `importVerificationId` VARCHAR(128) NULL,
  `securitySignature` TEXT NULL,
  `approvedBy` VARCHAR(191) NULL,
  `auditedBy` VARCHAR(191) NULL,
  `auditedAt` DATETIME NULL,
  `transferredAt` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_reports_branch_id` (`branchId`),
  KEY `idx_sales_reports_date` (`reportingDate`),
  KEY `idx_sales_reports_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. Active Sessions Table
CREATE TABLE IF NOT EXISTS `active_sessions` (
  `id` VARCHAR(64) NOT NULL,
  `userId` VARCHAR(64) NOT NULL,
  `username` VARCHAR(191) NOT NULL,
  `fullName` VARCHAR(191) NOT NULL,
  `role` VARCHAR(64) NOT NULL,
  `branchId` VARCHAR(64) NOT NULL,
  `branchName` VARCHAR(191) NOT NULL,
  `lastActive` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `userAgent` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sessions_user_id` (`userId`),
  KEY `idx_sessions_branch_id` (`branchId`),
  KEY `idx_sessions_last_active` (`lastActive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. DB Snapshots Table
CREATE TABLE IF NOT EXISTS `db_snapshots` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `creator` VARCHAR(191) NOT NULL,
  `sizeBytes` BIGINT NOT NULL DEFAULT 0,
  `data` LONGTEXT NOT NULL,
  `timestamp` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_snapshots_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
