const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Disable JSON file reading/writing
code = code.replace(/function readDbFile\(\) \{/, 'function readDbFile() { return {}; /* disabled */');
code = code.replace(/function writeDbFile\(db\) \{/, 'function writeDbFile(db) { return; /* disabled */');
code = code.replace(/function scheduleDebouncedDbFileWrite\(\) \{/, 'function scheduleDebouncedDbFileWrite() { return; /* disabled */');

// Also ensure mysqlEnforced is true by default
code = code.replace(/let mysqlEnforced = false;/, 'let mysqlEnforced = true;');

fs.writeFileSync('server.js', code);
