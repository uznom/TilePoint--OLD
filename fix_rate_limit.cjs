const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const globalLimiter = `const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // limit each IP to 300 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

app.use('/api/', globalApiLimiter);`;

code = code.replace(/app\.use\(helmet\(\{[\s\S]*?\}\)\);/, (match) => {
  return `${match}\n\n${globalLimiter}`;
});

fs.writeFileSync('server.js', code);
