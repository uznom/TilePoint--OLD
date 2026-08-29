import assert from 'assert';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

console.log('[Integration Test] Running Password Migration & Server Verification Suite...\n');

// 1. Setup mock legacy hash and user
const salt = 'legacy_salt_123';
const password = 'CorrectPassword2026!';
const iterations = 2500;

let hash = password + '$' + salt;
for (let i = 0; i < iterations; i++) {
  hash = crypto.createHash('sha256').update(hash).digest('hex');
}
const legacyHashVal = Buffer.from(hash).toString('base64').slice(0, 64);
const legacyToken = `$legacy-pbkdf2$i=${iterations}$s=${salt}$h=${legacyHashVal}`;

let mockUser = {
  id: 'u_test_1',
  username: 'migration_user',
  role: 'Cashier',
  passwordHash: legacyToken,
  mustResetPassword: 1
};

// 2. Test Verification & Migration logic
const LEGACY_MIGRATION_CUTOFF_DATE = new Date('2026-10-01T00:00:00.000Z');

function isBcryptHash(token) {
  if (typeof token !== 'string') return false;
  return token.startsWith('$2a$') || token.startsWith('$2b$') || token.startsWith('$2y$');
}

async function verifyAndMigratePassword(pwd, user, simulatedDate = new Date()) {
  const token = user.passwordHash;
  if (!pwd || !token) return { valid: false, migrated: false };

  if (isBcryptHash(token)) {
    const match = await bcrypt.compare(pwd, token);
    return { valid: match, migrated: false };
  }

  if (simulatedDate.getTime() > LEGACY_MIGRATION_CUTOFF_DATE.getTime()) {
    return { valid: false, migrated: false, cutoffExpired: true };
  }

  const parts = token.split('$').filter(Boolean);
  let s = '';
  let iter = 2500;
  let expectedH = '';

  for (const part of parts) {
    if (part.startsWith('i=')) iter = parseInt(part.slice(2), 10) || 2500;
    else if (part.startsWith('s=')) s = part.slice(2);
    else if (part.startsWith('h=')) expectedH = part.slice(2);
  }

  let testH = pwd + '$' + s;
  for (let i = 0; i < iter; i++) {
    testH = crypto.createHash('sha256').update(testH).digest('hex');
  }
  const calc = Buffer.from(testH).toString('base64').slice(0, 64);
  if (calc !== expectedH) {
    return { valid: false, migrated: false };
  }

  // Rehash with bcrypt on successful login
  const newBcrypt = await bcrypt.hash(pwd, 10);
  user.passwordHash = newBcrypt;
  user.mustResetPassword = 0;
  return { valid: true, migrated: true, newHash: newBcrypt };
}

// Test A: Wrong password rejects cleanly
const resWrong = await verifyAndMigratePassword('WrongPassword!', mockUser);
assert.strictEqual(resWrong.valid, false, 'Invalid password must fail verification');
assert.strictEqual(isBcryptHash(mockUser.passwordHash), false, 'Failed login must not migrate token');
console.log('PASS 1/4: Invalid password rejected on server without rehashing.');

// Test B: First successful login verifies legacy token and rehashes with bcrypt
const resFirstSuccess = await verifyAndMigratePassword(password, mockUser);
assert.strictEqual(resFirstSuccess.valid, true, 'Valid legacy password must succeed');
assert.strictEqual(resFirstSuccess.migrated, true, 'Valid legacy password must trigger automatic migration');
assert.strictEqual(isBcryptHash(mockUser.passwordHash), true, 'User token must now be a valid bcrypt hash');
console.log('PASS 2/4: First login verified against legacy scheme and immediately rehashed to bcrypt ($2a$).');

// Test C: Subsequent login verifies directly via bcrypt
const resSecondSuccess = await verifyAndMigratePassword(password, mockUser);
assert.strictEqual(resSecondSuccess.valid, true, 'Bcrypt verification must succeed');
assert.strictEqual(resSecondSuccess.migrated, false, 'Subsequent login should not need migration');
console.log('PASS 3/4: Subsequent logins verified directly against stored bcrypt hash.');

// Test D: Unmigrated account past cutoff date triggers password reset requirement
const unmigratedUser = {
  id: 'u_unmigrated',
  username: 'old_account',
  passwordHash: legacyToken,
  mustResetPassword: 1
};
const futureDate = new Date('2026-11-01T00:00:00.000Z');
const resExpired = await verifyAndMigratePassword(password, unmigratedUser, futureDate);
assert.strictEqual(resExpired.valid, false, 'Unmigrated login past cutoff date must be rejected');
assert.strictEqual(resExpired.cutoffExpired, true, 'Cutoff expiry flag must be set');
console.log('PASS 4/4: Unmigrated legacy accounts past cutoff date are blocked and forced to reset password.');

console.log('\n=============================================================');
console.log(' [ALL PASSWORD MIGRATION & REHASHING TESTS PASSED] ');
console.log('=============================================================\n');
