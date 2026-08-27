import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';

/**
 * TilePoint Data Migration Script (JSON -> MySQL)
 * Migrates local JSON data structures (tp_branches, tp_users, tp_products, tp_sales, etc.)
 * into MySQL database tables created in schema.sql.
 *
 * Fully idempotent using `ON DUPLICATE KEY UPDATE`.
 */

// Format date to MySQL DATETIME format (YYYY-MM-DD HH:MM:SS) or null
function formatDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace('T', ' ');
  } catch {
    return null;
  }
}

// Convert JSON field or return null
function formatJson(val) {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    return null;
  }
}

// Convert boolean or falsy to 1/0
function formatBool(val) {
  return val ? 1 : 0;
}

// Ensure numeric value
function formatNumber(val, defaultVal = 0) {
  if (val === undefined || val === null || val === '') return defaultVal;
  const num = Number(val);
  return isNaN(num) ? defaultVal : num;
}

async function migrateData(dataInput, customConfig = {}) {
  const dbConfig = {
    host: process.env.MYSQL_HOST || customConfig.host || '127.0.0.1',
    port: Number(process.env.MYSQL_PORT || customConfig.port || 3306),
    user: process.env.MYSQL_USER || customConfig.user || 'root',
    password: process.env.MYSQL_PASSWORD || customConfig.password || '',
    database: process.env.MYSQL_DATABASE || customConfig.database || 'tilepoint_db',
    multipleStatements: true,
  };

  console.log(`Connecting to MySQL database '${dbConfig.database}' on ${dbConfig.host}:${dbConfig.port}...`);
  const connection = await mysql.createConnection(dbConfig);
  console.log('Successfully connected to MySQL server.');

  const data = typeof dataInput === 'string' ? JSON.parse(fs.readFileSync(dataInput, 'utf8')) : dataInput;

  const branches = data.tp_branches || data.branches || [];
  const users = data.tp_users || data.users || [];
  const suppliers = data.tp_suppliers || data.suppliers || [];
  const brands = data.tp_brands || data.brands || [];
  const products = data.tp_products || data.products || [];
  const branchStock = data.tp_branch_stock || data.branchStock || [];
  const shifts = data.tp_shifts || data.shifts || [];
  const sales = data.tp_sales || data.sales || [];
  const saleItems = data.tp_sale_items || data.saleItems || [];
  const purchaseOrders = data.tp_purchase_orders || data.purchaseOrders || [];
  const poItems = data.tp_po_items || data.poItems || [];
  const stockTransfers = data.tp_stock_transfers || data.stockTransfers || [];
  const stockTransferItems = data.tp_stock_transfer_items || data.stockTransferItems || [];
  const movements = data.tp_movements || data.movements || [];
  const inventoryMovements = data.tp_inventory_movements || data.inventoryMovements || [];
  const deliveries = data.tp_deliveries || data.deliveries || [];
  const damageLogs = data.tp_damage_logs || data.damageLogs || [];
  const ledgerEntries = data.tp_ledger_entries || data.ledgerEntries || [];
  const auditLogs = data.tp_audit_logs || data.auditLogs || [];
  const customCorporateBills = data.tp_custom_corporate_bills || data.customCorporateBills || [];
  const transmittals = data.tp_transmittals || data.transmittals || [];
  const members = data.tp_members || data.members || [];
  const expenses = data.tp_expenses || data.expenses || [];
  const productReturns = data.tp_product_returns || data.productReturns || [];
  const branchSalesReports = data.tp_branch_sales_reports || data.branchSalesReports || [];

  console.log(`\n=== Migration Summary ===`);
  console.log(`Branches: ${branches.length}`);
  console.log(`Users: ${users.length}`);
  console.log(`Suppliers: ${suppliers.length}`);
  console.log(`Brands: ${brands.length}`);
  console.log(`Products: ${products.length}`);
  console.log(`Branch Stock Records: ${branchStock.length}`);
  console.log(`Shifts: ${shifts.length}`);
  console.log(`Sales: ${sales.length}`);
  console.log(`Sale Items: ${saleItems.length}`);

  // 1. Migrate Branches
  if (branches.length > 0) {
    console.log(`\nMigrating ${branches.length} branches...`);
    const sql = `
      INSERT INTO branches (
        id, name, manager, address, phone, monthlySales, staffCount, activeCashiers,
        isDeleted, isDistributionBranch, storeLogo, branchCode, localIp, gatewayRules,
        receiptFacebook, receiptPromoText, receiptQrBase64, receiptThankYou, tin,
        logoSize, openingTime, closingTime, operatingDays, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        manager = VALUES(manager),
        address = VALUES(address),
        phone = VALUES(phone),
        monthlySales = VALUES(monthlySales),
        staffCount = VALUES(staffCount),
        activeCashiers = VALUES(activeCashiers),
        isDeleted = VALUES(isDeleted),
        isDistributionBranch = VALUES(isDistributionBranch),
        storeLogo = VALUES(storeLogo),
        branchCode = VALUES(branchCode),
        localIp = VALUES(localIp),
        gatewayRules = VALUES(gatewayRules),
        receiptFacebook = VALUES(receiptFacebook),
        receiptPromoText = VALUES(receiptPromoText),
        receiptQrBase64 = VALUES(receiptQrBase64),
        receiptThankYou = VALUES(receiptThankYou),
        tin = VALUES(tin),
        logoSize = VALUES(logoSize),
        openingTime = VALUES(openingTime),
        closingTime = VALUES(closingTime),
        operatingDays = VALUES(operatingDays),
        updatedAt = VALUES(updatedAt)
    `;

    for (const b of branches) {
      const row = [
        b.id,
        b.name || 'Unnamed Branch',
        b.manager || null,
        b.address || null,
        b.phone || null,
        formatNumber(b.monthlySales, 0),
        formatNumber(b.staffCount, 0),
        formatNumber(b.activeCashiers, 0),
        formatBool(b.isDeleted),
        formatBool(b.isDistributionBranch),
        b.storeLogo || null,
        b.branchCode || null,
        b.localIp || null,
        b.gatewayRules || null,
        b.receiptFacebook || null,
        b.receiptPromoText || null,
        b.receiptQrBase64 || null,
        b.receiptThankYou || null,
        b.tin || null,
        formatNumber(b.logoSize, 40),
        b.openingTime || null,
        b.closingTime || null,
        formatJson(b.operatingDays),
        formatDate(b.createdAt) || formatDate(Date.now()),
        formatDate(b.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);
    }
  }

  // 2. Migrate Users
  if (users.length > 0) {
    console.log(`Migrating ${users.length} users...`);
    const sql = `
      INSERT INTO users (
        id, avatarInitials, fullName, username, email, role, branchAssignmentId,
        status, managerPin, passwordHash, profilePicture, isNew, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        avatarInitials = VALUES(avatarInitials),
        fullName = VALUES(fullName),
        username = VALUES(username),
        email = VALUES(email),
        role = VALUES(role),
        branchAssignmentId = VALUES(branchAssignmentId),
        status = VALUES(status),
        managerPin = VALUES(managerPin),
        passwordHash = VALUES(passwordHash),
        profilePicture = VALUES(profilePicture),
        isNew = VALUES(isNew),
        updatedAt = VALUES(updatedAt)
    `;

    for (const u of users) {
      const row = [
        u.id,
        u.avatarInitials || null,
        u.fullName || u.username || 'User',
        u.username || `user_${u.id}`,
        u.email || `${u.username || u.id}@tilepoint.local`,
        u.role || 'Cashier',
        u.branchAssignmentId || null,
        u.status || 'Active',
        u.managerPin || null,
        u.passwordHash || null,
        u.profilePicture || null,
        formatBool(u.isNew),
        formatDate(u.createdAt) || formatDate(Date.now()),
        formatDate(u.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);
    }
  }

  // 3. Migrate Suppliers
  if (suppliers.length > 0) {
    console.log(`Migrating ${suppliers.length} suppliers...`);
    const sql = `
      INSERT INTO suppliers (
        id, name, contactPerson, email, phone, address, isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        contactPerson = VALUES(contactPerson),
        email = VALUES(email),
        phone = VALUES(phone),
        address = VALUES(address),
        isDeleted = VALUES(isDeleted),
        updatedAt = VALUES(updatedAt)
    `;

    for (const s of suppliers) {
      const row = [
        s.id,
        s.name,
        s.contactPerson || null,
        s.email || null,
        s.phone || null,
        s.address || null,
        formatBool(s.isDeleted),
        formatDate(s.createdAt) || formatDate(Date.now()),
        formatDate(s.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);
    }
  }

  // 4. Migrate Brands
  if (brands.length > 0) {
    console.log(`Migrating ${brands.length} brands...`);
    const sql = `
      INSERT INTO brands (
        id, name, supplierId, description, isDeleted, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        name = VALUES(name),
        supplierId = VALUES(supplierId),
        description = VALUES(description),
        isDeleted = VALUES(isDeleted)
    `;

    for (const br of brands) {
      const row = [
        br.id,
        br.name,
        br.supplierId,
        br.description || null,
        formatBool(br.isDeleted),
        formatDate(br.createdAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);
    }
  }

  // 5. Migrate Products & Inventory Catalog
  if (products.length > 0) {
    console.log(`Migrating ${products.length} products and inventory records...`);
    const sql = `
      INSERT INTO products (
        id, productCode, productName, category, brand, sku, product_sku, category_id, barcode, unit, costPrice,
        sellingPrice, stockQuantity, lowStockThreshold, designName, size, supplierId,
        origin, image, boxQuantity, coveragePerBox, minimumStock, qrCode, createdBy,
        updatedBy, version, markupPercent, taxType, hasExpiration, expirationDate,
        isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        productCode = VALUES(productCode),
        productName = VALUES(productName),
        category = VALUES(category),
        brand = VALUES(brand),
        sku = VALUES(sku),
        product_sku = VALUES(product_sku),
        category_id = VALUES(category_id),
        barcode = VALUES(barcode),
        unit = VALUES(unit),
        costPrice = VALUES(costPrice),
        sellingPrice = VALUES(sellingPrice),
        stockQuantity = VALUES(stockQuantity),
        lowStockThreshold = VALUES(lowStockThreshold),
        designName = VALUES(designName),
        size = VALUES(size),
        supplierId = VALUES(supplierId),
        origin = VALUES(origin),
        image = VALUES(image),
        boxQuantity = VALUES(boxQuantity),
        coveragePerBox = VALUES(coveragePerBox),
        minimumStock = VALUES(minimumStock),
        qrCode = VALUES(qrCode),
        createdBy = VALUES(createdBy),
        updatedBy = VALUES(updatedBy),
        version = VALUES(version),
        markupPercent = VALUES(markupPercent),
        taxType = VALUES(taxType),
        hasExpiration = VALUES(hasExpiration),
        expirationDate = VALUES(expirationDate),
        isDeleted = VALUES(isDeleted),
        updatedAt = VALUES(updatedAt)
    `;

    const inventorySql = `
      INSERT INTO inventory (
        id, productId, product_sku, category_id, productCode, productName, category, brand, sku, barcode, unit,
        stockQuantity, costPrice, sellingPrice, lowStockThreshold, supplierId, origin, version, isDeleted, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        product_sku = VALUES(product_sku),
        category_id = VALUES(category_id),
        productCode = VALUES(productCode),
        productName = VALUES(productName),
        category = VALUES(category),
        brand = VALUES(brand),
        sku = VALUES(sku),
        barcode = VALUES(barcode),
        unit = VALUES(unit),
        stockQuantity = VALUES(stockQuantity),
        costPrice = VALUES(costPrice),
        sellingPrice = VALUES(sellingPrice),
        lowStockThreshold = VALUES(lowStockThreshold),
        supplierId = VALUES(supplierId),
        origin = VALUES(origin),
        version = VALUES(version),
        isDeleted = VALUES(isDeleted),
        updatedAt = VALUES(updatedAt)
    `;

    for (const p of products) {
      const productSku = p.product_sku || p.sku || p.productCode || p.id;
      const categoryId = p.category_id || p.category || 'General';

      const row = [
        p.id,
        p.productCode || p.id,
        p.productName || 'Unnamed Product',
        p.category || 'General',
        p.brand || null,
        p.sku || null,
        productSku,
        categoryId,
        p.barcode || null,
        p.unit || 'Pcs',
        formatNumber(p.costPrice, 0),
        formatNumber(p.sellingPrice, 0),
        formatNumber(p.stockQuantity, 0),
        formatNumber(p.lowStockThreshold, 10),
        p.designName || null,
        p.size || null,
        p.supplierId || null,
        p.origin || null,
        p.image || null,
        p.boxQuantity !== undefined && p.boxQuantity !== null ? formatNumber(p.boxQuantity) : null,
        p.coveragePerBox !== undefined && p.coveragePerBox !== null ? formatNumber(p.coveragePerBox) : null,
        p.minimumStock !== undefined && p.minimumStock !== null ? formatNumber(p.minimumStock) : null,
        p.qrCode || null,
        p.createdBy || null,
        p.updatedBy || null,
        formatNumber(p.version, 1),
        p.markupPercent !== undefined && p.markupPercent !== null ? formatNumber(p.markupPercent) : null,
        p.taxType || null,
        formatBool(p.hasExpiration),
        formatDate(p.expirationDate),
        formatBool(p.isDeleted),
        formatDate(p.createdAt) || formatDate(Date.now()),
        formatDate(p.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);

      const invRow = [
        `inv_${p.id}`,
        p.id,
        productSku,
        categoryId,
        p.productCode || p.id,
        p.productName || 'Unnamed Product',
        p.category || 'General',
        p.brand || null,
        p.sku || null,
        p.barcode || null,
        p.unit || 'Pcs',
        formatNumber(p.stockQuantity, 0),
        formatNumber(p.costPrice, 0),
        formatNumber(p.sellingPrice, 0),
        formatNumber(p.lowStockThreshold, 10),
        p.supplierId || null,
        p.origin || null,
        formatNumber(p.version, 1),
        formatBool(p.isDeleted),
        formatDate(p.createdAt) || formatDate(Date.now()),
        formatDate(p.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(inventorySql, invRow);
    }
  }

  // 6. Migrate Branch Stock
  if (branchStock.length > 0) {
    console.log(`Migrating ${branchStock.length} branch stock records...`);
    const sql = `
      INSERT INTO branch_stock (
        id, branchId, productId, quantity, lowStockThreshold, lowStockThresholdOverride,
        sellingPriceOverride, version, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = VALUES(quantity),
        lowStockThreshold = VALUES(lowStockThreshold),
        lowStockThresholdOverride = VALUES(lowStockThresholdOverride),
        sellingPriceOverride = VALUES(sellingPriceOverride),
        version = VALUES(version),
        updatedAt = VALUES(updatedAt)
    `;

    for (const bs of branchStock) {
      const row = [
        bs.id,
        bs.branchId,
        bs.productId,
        formatNumber(bs.quantity, 0),
        bs.lowStockThreshold !== undefined && bs.lowStockThreshold !== null ? formatNumber(bs.lowStockThreshold) : null,
        bs.lowStockThresholdOverride !== undefined && bs.lowStockThresholdOverride !== null ? formatNumber(bs.lowStockThresholdOverride) : null,
        bs.sellingPriceOverride !== undefined && bs.sellingPriceOverride !== null ? formatNumber(bs.sellingPriceOverride) : null,
        formatNumber(bs.version, 1),
        formatDate(bs.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);
    }
  }

  // 7. Migrate Shifts
  if (shifts.length > 0) {
    console.log(`Migrating ${shifts.length} shifts...`);
    const sql = `
      INSERT INTO shifts (
        id, branchId, cashierId, cashierName, openedAt, closedAt, startCash, endCash,
        cashCount, status, notes, variance, shiftSalesTotal, shiftVatTotal,
        shiftDiscountTotal, shiftSalesCount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        branchId = VALUES(branchId),
        cashierId = VALUES(cashierId),
        cashierName = VALUES(cashierName),
        openedAt = VALUES(openedAt),
        closedAt = VALUES(closedAt),
        startCash = VALUES(startCash),
        endCash = VALUES(endCash),
        cashCount = VALUES(cashCount),
        status = VALUES(status),
        notes = VALUES(notes),
        variance = VALUES(variance),
        shiftSalesTotal = VALUES(shiftSalesTotal),
        shiftVatTotal = VALUES(shiftVatTotal),
        shiftDiscountTotal = VALUES(shiftDiscountTotal),
        shiftSalesCount = VALUES(shiftSalesCount)
    `;

    for (const sh of shifts) {
      const row = [
        sh.id,
        sh.branchId,
        sh.cashierId,
        sh.cashierName || 'Cashier',
        formatDate(sh.openedAt) || formatDate(Date.now()),
        formatDate(sh.closedAt),
        formatNumber(sh.startCash, 0),
        sh.endCash !== undefined && sh.endCash !== null ? formatNumber(sh.endCash) : null,
        formatNumber(sh.cashCount, 0),
        sh.status || 'Open',
        sh.notes || null,
        sh.variance !== undefined && sh.variance !== null ? formatNumber(sh.variance) : null,
        formatNumber(sh.shiftSalesTotal, 0),
        formatNumber(sh.shiftVatTotal, 0),
        formatNumber(sh.shiftDiscountTotal, 0),
        formatNumber(sh.shiftSalesCount, 0),
      ];
      await connection.execute(sql, row);
    }
  }

  // 8. Migrate Sales
  if (sales.length > 0) {
    console.log(`Migrating ${sales.length} sales...`);
    const sql = `
      INSERT INTO sales (
        id, saleNumber, shiftId, branchId, cashierId, cashierName, customerName,
        subtotal, vat, discount, grandTotal, paymentMethod, amountTendered,
        changeAmount, notes, isDeleted, deletedAt, idempotencyKey, discountType,
        pointsEarned, pointsRedeemed, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        saleNumber = VALUES(saleNumber),
        shiftId = VALUES(shiftId),
        branchId = VALUES(branchId),
        cashierId = VALUES(cashierId),
        cashierName = VALUES(cashierName),
        customerName = VALUES(customerName),
        subtotal = VALUES(subtotal),
        vat = VALUES(vat),
        discount = VALUES(discount),
        grandTotal = VALUES(grandTotal),
        paymentMethod = VALUES(paymentMethod),
        amountTendered = VALUES(amountTendered),
        changeAmount = VALUES(changeAmount),
        notes = VALUES(notes),
        isDeleted = VALUES(isDeleted),
        deletedAt = VALUES(deletedAt),
        idempotencyKey = VALUES(idempotencyKey),
        discountType = VALUES(discountType),
        pointsEarned = VALUES(pointsEarned),
        pointsRedeemed = VALUES(pointsRedeemed),
        updatedAt = VALUES(updatedAt)
    `;

    for (const sl of sales) {
      const row = [
        sl.id,
        sl.saleNumber || sl.id,
        sl.shiftId,
        sl.branchId,
        sl.cashierId,
        sl.cashierName || 'Cashier',
        sl.customerName || 'Walk-in',
        formatNumber(sl.subtotal, 0),
        formatNumber(sl.vat, 0),
        formatNumber(sl.discount, 0),
        formatNumber(sl.grandTotal, 0),
        sl.paymentMethod || 'Cash',
        formatNumber(sl.amountTendered, 0),
        formatNumber(sl.changeAmount, 0),
        sl.notes || null,
        formatBool(sl.isDeleted),
        formatDate(sl.deletedAt),
        sl.idempotencyKey || null,
        sl.discountType || null,
        formatNumber(sl.pointsEarned, 0),
        formatNumber(sl.pointsRedeemed, 0),
        formatDate(sl.createdAt) || formatDate(Date.now()),
        formatDate(sl.updatedAt) || formatDate(Date.now()),
      ];
      await connection.execute(sql, row);
    }
  }

  // 9. Migrate Sale Items
  if (saleItems.length > 0) {
    console.log(`Migrating ${saleItems.length} sale items...`);
    const sql = `
      INSERT INTO sale_items (
        id, saleId, productId, productName, quantity, unitPrice, total, isDeleted, deletedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        saleId = VALUES(saleId),
        productId = VALUES(productId),
        productName = VALUES(productName),
        quantity = VALUES(quantity),
        unitPrice = VALUES(unitPrice),
        total = VALUES(total),
        isDeleted = VALUES(isDeleted),
        deletedAt = VALUES(deletedAt)
    `;

    for (const item of saleItems) {
      const row = [
        item.id,
        item.saleId,
        item.productId,
        item.productName || 'Product',
        formatNumber(item.quantity, 0),
        formatNumber(item.unitPrice, 0),
        formatNumber(item.total, 0),
        formatBool(item.isDeleted),
        formatDate(item.deletedAt),
      ];
      await connection.execute(sql, row);
    }
  }

  console.log('\nMigration completed successfully!');
  await connection.end();
}

// CLI Execution if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const dataPath = process.argv[2] || path.join(process.cwd(), 'sample_data.json');
  if (fs.existsSync(dataPath)) {
    console.log(`Reading seed dataset from: ${dataPath}`);
    migrateData(dataPath).catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
  } else {
    console.log(`No input data file found at ${dataPath}.`);
    console.log(`Usage: node scripts/migrateJsonToMysql.js [path_to_data.json]`);
  }
}

export { migrateData };
