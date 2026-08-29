const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const ioAuth = `// WebSocket Authentication Middleware
io.use((socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token) {
    return next(new Error('Authentication error: Token missing'));
  }

  // Very basic token presence check to prevent unauthenticated broadcasts.
  // In a robust implementation, this should query the DB to validate session validity.
  // We'll verify the token exists in the active_sessions table if the DB is online.
  if (!isMysqlActive && !mysqlEnforced) {
    return next();
  }

  pool.query('SELECT id, role, userId FROM \`active_sessions\` WHERE \`token\` = ? AND (\`expiresAt\` IS NULL OR \`expiresAt\` > NOW())', [token])
    .then(([rows]) => {
      if (rows.length === 0) {
        return next(new Error('Authentication error: Invalid or expired token'));
      }
      socket.user = rows[0];
      next();
    })
    .catch(err => {
      console.warn('[WebSocket] Auth query failed:', err.message);
      next(new Error('Authentication error: Database error'));
    });
});

io.on('connection'`;

code = code.replace(/io\.on\('connection'/, ioAuth);

fs.writeFileSync('server.js', code);
