const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

// Add mysqlEnforced
code = code.replace('let isMysqlActive = false;', 'let isMysqlActive = false;\nlet mysqlEnforced = process.env.MYSQL_HOST !== undefined;');

// Update checkMysqlConnection
code = code.replace(
  'isMysqlActive = true;\n    return true;',
  'isMysqlActive = true;\n    mysqlEnforced = true;\n    return true;'
);

// Replace "if (isMysqlActive)" with "if (isMysqlActive || mysqlEnforced)"
// But we need to make sure we don't replace the ones in checkMysqlConnection and others like `if (isMysqlActive && ...)`
// Better regex:
code = code.replace(/if\s*\(\s*isMysqlActive\s*\)\s*\{/g, 'if (isMysqlActive || mysqlEnforced) {');

// Inside catch blocks, replace `isMysqlActive = false;` with throwing an error if mysqlEnforced is true.
// But wait, if MySQL query fails, it's already inside a catch block.
// Instead of regex, maybe just replace the fallback logic?
fs.writeFileSync('server.js.temp', code);
