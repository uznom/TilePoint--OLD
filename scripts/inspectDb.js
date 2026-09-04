import 'dotenv/config';
import { pool } from '../src/server/db/mysqlPool.js';

async function main() {
  try {
    const [tables] = await pool.query('SHOW TABLES');
    const dbName = process.env.MYSQL_DATABASE || 'tilepoint_db';
    console.log(`Database: ${dbName}`);
    console.log('========================================================');

    const results = [];
    for (const t of tables) {
      const tableName = Object.values(t)[0];
      try {
        const [countRes] = await pool.query(`SELECT COUNT(*) as count FROM \`${tableName}\``);
        const count = countRes[0].count;
        results.push({ table: tableName, count });
      } catch (err) {
        results.push({ table: tableName, count: 'Error: ' + err.message });
      }
    }

    const nonEmpty = results.filter((r) => typeof r.count === 'number' && r.count > 0);
    const empty = results.filter((r) => r.count === 0);

    console.log(`\n=== NON-EMPTY TABLES (${nonEmpty.length}) ===`);
    console.table(nonEmpty);

    console.log(`\n=== EMPTY TABLES (${empty.length}) ===`);
    console.table(empty);

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('MySQL connection error:', err.message);
    try { await pool.end(); } catch (_) {}
    process.exit(1);
  }
}

main();
