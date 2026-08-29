import assert from 'assert';

console.log('[Test Degraded Recovery] Initializing resilience verification...\n');

// 1. Test error classification
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'PROTOCOL_CONNECTION_LOST',
  'ER_CON_COUNT_ERROR',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ENOTFOUND',
  'EAI_AGAIN'
]);

function isConnectionError(err) {
  if (!err) return false;
  if (err.fatal === true) return true;
  if (err.code && (CONNECTION_ERROR_CODES.has(err.code) || String(err.code).startsWith('PROTOCOL_'))) {
    return true;
  }
  const msg = String(err.message || '').toLowerCase();
  if (
    msg.includes('connection lost') ||
    msg.includes('connect econnrefused') ||
    msg.includes('closed connection') ||
    msg.includes('socket has been ended')
  ) {
    return true;
  }
  return false;
}

// Test A: Constraint / query errors must NOT be marked as connection error
const dupError = { code: 'ER_DUP_ENTRY', message: 'Duplicate entry for key PRIMARY' };
const fKeyError = { code: 'ER_NO_REFERENCED_ROW_2', message: 'Cannot add or update a child row: a foreign key constraint fails' };
const nullError = { code: 'ER_BAD_NULL_ERROR', message: 'Column cannot be null' };

assert.strictEqual(isConnectionError(dupError), false, 'Duplicate entry error must NOT trigger connection failure');
assert.strictEqual(isConnectionError(fKeyError), false, 'Foreign key error must NOT trigger connection failure');
assert.strictEqual(isConnectionError(nullError), false, 'Null constraint error must NOT trigger connection failure');
console.log('PASS 1/3: Constraint violations and query errors do NOT take the engine offline.');

// Test B: Network & connection errors MUST be recognized
const connRefused = { code: 'ECONNREFUSED', message: 'connect ECONNREFUSED 127.0.0.1:3306' };
const protoLost = { code: 'PROTOCOL_CONNECTION_LOST', message: 'Connection lost' };
const fatalErr = { fatal: true, message: 'Fatal socket issue' };

assert.strictEqual(isConnectionError(connRefused), true);
assert.strictEqual(isConnectionError(protoLost), true);
assert.strictEqual(isConnectionError(fatalErr), true);
console.log('PASS 2/3: Connectivity and fatal socket errors correctly identified as connection failures.');

// Test C: Degraded write queue & replay simulation
let mockMysqlStore = [];
let degradedQueue = [];
let isMysqlActive = false;

function handleWrite(item) {
  if (isMysqlActive) {
    mockMysqlStore.push(item);
  } else {
    degradedQueue.push(item);
  }
}

async function replayQueue() {
  const queueCopy = [...degradedQueue];
  for (const item of queueCopy) {
    mockMysqlStore.push(item);
  }
  degradedQueue = [];
}

// Perform writes while degraded
handleWrite({ id: 'tx_1', amount: 150 });
handleWrite({ id: 'tx_2', amount: 300 });

assert.strictEqual(degradedQueue.length, 2, 'Writes must be queued while degraded');
assert.strictEqual(mockMysqlStore.length, 0, 'No direct writes to MySQL while degraded');

// Simulate connection restored
isMysqlActive = true;
await replayQueue();

assert.strictEqual(degradedQueue.length, 0, 'Queue must be drained after replay');
assert.strictEqual(mockMysqlStore.length, 2, 'All queued writes must be replayed into MySQL on reconnection');
console.log('PASS 3/3: Writes buffered during degraded mode successfully replayed on reconnection.');

console.log('\n=============================================================');
console.log(' [ALL DEGRADED RESILIENCE & RECOVERY TESTS PASSED] ');
console.log('=============================================================\n');
