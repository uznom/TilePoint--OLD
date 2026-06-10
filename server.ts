import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  const DB_PATH = path.join(process.cwd(), "datastore.json");

  // Helper to load DB
  function loadDb() {
    try {
      if (fs.existsSync(DB_PATH)) {
        const raw = fs.readFileSync(DB_PATH, "utf-8");
        return JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading datastore:", e);
    }
    return {};
  }

  // Helper to save DB
  function saveDb(data: any) {
    try {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing datastore:", e);
    }
  }

  // API Route: Get DB
  app.get("/api/db", (req, res) => {
    const db = loadDb();
    res.json(db);
  });

  // API Route: Update whole database or partial
  app.post("/api/db", (req, res) => {
    const updates = req.body;
    const current = loadDb();
    const merged = { ...current, ...updates };
    saveDb(merged);
    res.json({ success: true });
  });

  // API Route: Save specific key
  app.post("/api/db/save", (req, res) => {
    const { key, value } = req.body;
    if (!key) {
      return res.status(400).json({ error: "Missing key" });
    }
    const current = loadDb();
    current[key] = value;
    saveDb(current);
    res.json({ success: true });
  });

  // API Route: Delete/Reset DB
  app.post("/api/db/reset", (req, res) => {
    saveDb({});
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
