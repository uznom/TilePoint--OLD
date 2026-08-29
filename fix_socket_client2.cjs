const fs = require('fs');
let code = fs.readFileSync('src/context/DbContext.tsx', 'utf8');

code = code.replace(
  /query: \{\n\s*clientId\n\s*\}/,
  "auth: {\n          token: localStorage.getItem('tp_session_token') || sessionStorage.getItem('tp_session_token')\n        },\n        query: { clientId }"
);

fs.writeFileSync('src/context/DbContext.tsx', code);
