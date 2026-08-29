const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(
  /const allowedOrigins = process\.env\.ALLOWED_ORIGINS[\s\S]*?origin: function \(origin, callback\) \{[\s\S]*?\},/,
  `const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    // Allow localhost, local network IPs, and AI Studio run.app domains dynamically
    const isLocalhost = /^https?:\\/\\/(localhost|127\\.0\\.0\\.1)(:\\d+)?$/.test(origin);
    const isRunApp = /\\.run\\.app$/.test(origin);
    const isLocalNetwork = /^https?:\\/\\/192\\.168\\.\\d+\\.\\d+(:\\d+)?$/.test(origin);
    
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin) || isLocalhost || isRunApp || isLocalNetwork) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },`
);

fs.writeFileSync('server.js', code);
