import assert from 'assert';
import alasql from 'alasql';

console.log('[Integration Test] Running SQL Parameterisation & SQLi Immunity Suite...\n');

// 1. Setup in-memory test tables
alasql('CREATE TABLE IF NOT EXISTS branch_stock (id STRING, branchId STRING, productId STRING, quantity INT)');
alasql('CREATE TABLE IF NOT EXISTS products (id STRING, productName STRING, sku STRING, isDeleted INT)');
alasql('CREATE TABLE IF NOT EXISTS sales (id STRING, branchId STRING, shiftId STRING, isDeleted INT, createdAt STRING)');

// Seed test data
alasql('DELETE FROM branch_stock');
alasql('DELETE FROM products');
alasql('DELETE FROM sales');

alasql('INSERT INTO branch_stock VALUES (?, ?, ?, ?)', ['BS1', 'BR-NORTH', 'P1', 50]);
alasql('INSERT INTO branch_stock VALUES (?, ?, ?, ?)', ['BS2', 'BR-SOUTH', 'P2', 30]);

alasql('INSERT INTO products VALUES (?, ?, ?, ?)', ['P1', 'Ceramic Tile', 'SKU-001', 0]);
alasql('INSERT INTO products VALUES (?, ?, ?, ?)', ['P2', 'Granite Slab', 'SKU-002', 0]);

// Attack vectors that attempt SQL injection / syntax manipulation
const sqliVector1 = "' OR '1'='1";
const sqliVector2 = "BR-NORTH' UNION SELECT 'hacked', 'hacked', 'hacked', 999 --";
const sqliVector3 = "BR-NORTH'; DROP TABLE branch_stock; --";

// Test 1: Parameterised query handles malicious string safely as literal value
const res1 = alasql('SELECT * FROM branch_stock WHERE branchId = ?', [sqliVector1]);
assert.strictEqual(res1.length, 0, 'Injected OR clause must NOT match all rows');
console.log('PASS 1/4: Parameterised alasql query safely escapes OR bypass payload.');

// Test 2: UNION SELECT attack vector treated as literal string
const res2 = alasql('SELECT * FROM branch_stock WHERE branchId = ?', [sqliVector2]);
assert.strictEqual(res2.length, 0, 'Injected UNION SELECT must NOT execute subquery');
console.log('PASS 2/4: Parameterised alasql query safely handles UNION SELECT vector.');

// Test 3: Multiple statements and table drop attempt treated as literal
const res3 = alasql('SELECT * FROM branch_stock WHERE branchId = ?', [sqliVector3]);
assert.strictEqual(res3.length, 0, 'Injected DROP TABLE must NOT execute');
const tableCheck = alasql('SELECT * FROM branch_stock');
assert.strictEqual(tableCheck.length, 2, 'Table must remain intact and unharmed');
console.log('PASS 3/4: Parameterised query prevents statement chaining and table tampering.');

// Test 4: Legitimate parameterised lookups return precise rows
const res4 = alasql('SELECT * FROM branch_stock WHERE branchId = ?', ['BR-NORTH']);
assert.strictEqual(res4.length, 1);
assert.strictEqual(res4[0].productId, 'P1');
console.log('PASS 4/4: Legitimate parameterised queries return exact records.');

console.log('\n=============================================================');
console.log(' [ALL SQL PARAMETERISATION TESTS PASSED SUCCESSFULLY] ');
console.log('=============================================================\n');
