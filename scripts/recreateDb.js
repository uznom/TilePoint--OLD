import 'dotenv/config';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

async function recreateDatabase() {
  const host = process.env.MYSQL_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_PORT || 3306);
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const dbName = process.env.MYSQL_DATABASE || 'tilepoint_db';

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

  // Step 1: Connect to server without specific database
  const adminConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    multipleStatements: true
  });

  try {
    console.log(`Dropping database \`${dbName}\` if exists...`);
    await adminConn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    console.log(`✓ Database \`${dbName}\` dropped.`);

    console.log(`Creating fresh database \`${dbName}\`...`);
    await adminConn.query(`CREATE DATABASE \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`✓ Database \`${dbName}\` created.`);
  } finally {
    await adminConn.end();
  }

  // Step 2: Connect to the newly created database
  const dbConn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database: dbName,
    multipleStatements: true
  });

  try {
    console.log(`Executing schema.sql on \`${dbName}\`...`);
    const schemaPath = path.join(ROOT_DIR, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlContent = fs.readFileSync(schemaPath, 'utf8');
      const statements = sqlContent
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.toLowerCase().startsWith('create database') && !s.toLowerCase().startsWith('use '));

      for (const stmt of statements) {
        try {
          await dbConn.query(stmt);
        } catch (e) {
          console.warn(`[Schema execution note] ${e.message}`);
        }
      }
      console.log(`✓ Executed ${statements.length} schema table statements.`);
    }

    // Ensure system_settings and active_sessions exist
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS \`system_settings\` (
        \`setting_key\` VARCHAR(191) NOT NULL,
        \`setting_value\` LONGTEXT NULL,
        PRIMARY KEY (\`setting_key\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS \`active_sessions\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`username\` VARCHAR(191) NULL,
        \`fullName\` VARCHAR(191) NULL,
        \`role\` VARCHAR(64) NULL,
        \`branchId\` VARCHAR(64) NULL,
        \`branchName\` VARCHAR(191) NULL,
        \`lastActive\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`userAgent\` TEXT NULL,
        \`fingerprint\` VARCHAR(255) NULL,
        \`deviceInfo\` TEXT NULL,
        \`sessionStartedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`expiresAt\` DATETIME NOT NULL,
        \`maxDurationMinutes\` INT NOT NULL DEFAULT 480,
        \`createdAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        KEY \`idx_active_sessions_user\` (\`userId\`),
        KEY \`idx_active_sessions_last_active\` (\`lastActive\`),
        KEY \`idx_active_sessions_expires_at\` (\`expiresAt\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log(`✓ Ensured auxiliary tables (system_settings, active_sessions).`);

    // Reset db.json to clean empty state
    const dbJsonPath = path.join(ROOT_DIR, 'db.json');
    const emptyDb = {
      tp_audit_logs: [
        {
          id: `AUD-INIT-${Date.now()}`,
          actionCode: 'DATABASE_CREATED',
          description: 'Database initialized fresh from schema.sql.',
          module: 'SYSTEM',
          userId: 'SYSTEM',
          username: 'system',
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ],
      tp_is_configured: false,
      tilepoint_onboarded_setup: false
    };
    fs.writeFileSync(dbJsonPath, JSON.stringify(emptyDb, null, 2), 'utf8');
    console.log(`✓ Reset db.json to clean state.`);

    console.log('\n========================================================');
    console.log(' DATABASE RECREATION COMPLETED SUCCESSFULLY');
    console.log('========================================================');
  } finally {
    await dbConn.end();
  }
}

recreateDatabase().catch((err) => {
  console.error('Fatal error recreating database:', err);
  process.exit(1);
});
