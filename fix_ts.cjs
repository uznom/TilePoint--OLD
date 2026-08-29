const fs = require('fs');
let code = fs.readFileSync('src/services/transactionOutboxService.ts', 'utf8');

code = code.replace(/const STORAGE_KEY[\s\S]*?MAX_COMPLETED_RETENTION = 50;\n/, '');
code = code.replace(/this\.setupNetworkListeners\(\);\n/, '');
code = code.replace(/this\.hasPendingItems\(\)/, 'this.items.length > 0');

fs.writeFileSync('src/services/transactionOutboxService.ts', code);
