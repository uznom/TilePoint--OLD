const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace('let isMysqlActive = false;', 'let isMysqlActive = false;\nlet mysqlEnforced = false;');

code = code.replace(
  'isMysqlActive = true;\n    return true;',
  'isMysqlActive = true;\n    mysqlEnforced = true;\n    return true;'
);

// We need to find all `if (isMysqlActive)` and change them. 
// Except:
// - `if (!isMysqlActive)`
// - `if (isMysqlActive && ...)`
// - `isMysqlActive ? ... : ...`
// Let's just do a specific replace for the fallback blocks.
code = code.replace(/if\s*\(\s*isMysqlActive\s*\)\s*\{/g, 'if (isMysqlActive || mysqlEnforced) {');

// In checkMysqlConnection, we have `if (isMysqlActive) { console.warn... }`. We want to restore that one to not throw.
code = code.replace(
  `catch (err) {\n    if (isMysqlActive || mysqlEnforced) {\n      console.warn(\`[Database] MySQL connection lost (\${err.code}). Running on AlaSQL embedded MySQL Engine.\`);\n    }`,
  `catch (err) {\n    if (isMysqlActive) {\n      console.warn(\`[Database] MySQL connection lost (\${err.code}).\`);\n    }`
);

// Now for all `isMysqlActive = false;` assignments, we should only set it to false, but if mysqlEnforced is true, we should THROW an error.
// Actually, it's safer to just change the catch blocks in those functions.
code = code.replace(/isMysqlActive = false;\n\s*}/g, (match) => {
  return `isMysqlActive = false;\n      if (mysqlEnforced) throw new Error('Database connection lost. Please try again later.');\n    }`;
});

fs.writeFileSync('server.js', code);
