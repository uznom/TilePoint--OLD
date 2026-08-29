const fs = require('fs');
let code = fs.readFileSync('src/context/DbContext.tsx', 'utf8');

code = code.replace(
  /socketClient = socketIO\(\{\n\s*path: "\/socket\.io\/",\n\s*transports: \["websocket", "polling"\],\n\s*\}\);/,
  `const tk = localStorage.getItem('tp_session_token') || sessionStorage.getItem('tp_session_token');\n        socketClient = socketIO({\n          path: "/socket.io/",\n          transports: ["websocket", "polling"],\n          auth: {\n            token: tk\n          }\n        });`
);

fs.writeFileSync('src/context/DbContext.tsx', code);
