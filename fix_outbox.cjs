const fs = require('fs');
let code = fs.readFileSync('src/services/transactionOutboxService.ts', 'utf8');

// Replace the entire loadFromStorage method
code = code.replace(/private loadFromStorage\(\) \{[\s\S]*?(?=\s+private saveToStorage)/, 'private loadFromStorage() { this.items = []; }\n');

// Replace the entire saveToStorage method
code = code.replace(/private saveToStorage\(\) \{[\s\S]*?(?=\s+public enqueue)/, 'private saveToStorage() { }\n');

fs.writeFileSync('src/services/transactionOutboxService.ts', code);
