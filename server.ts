import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, getDocs, Timestamp } from "firebase/firestore";
import crypto from "crypto";
import axios from "axios";
import firebaseConfig from "./firebase-applet-config.json";

const firebaseApp = initializeApp(firebaseConfig);
const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Endpoint to export all data
  app.get("/dulieu", async (req, res) => {
    try {
      const collectionsToExport = [
        'device_logins', 'blockedIps', 'users', 'contact_requests', 'utilities', 
        'activities', 'user_ai_keys', 'forms', 'form_responses', 
        'document_categories', 'documents'
      ];
      
      const data: Record<string, any[]> = {};
      for (const col of collectionsToExport) {
        const snap = await getDocs(collection(db, col));
        data[col] = snap.docs.map(doc => {
          const docData = doc.data();
          const sanitized: any = { id: doc.id };
          for (const key in docData) {
            if (docData[key] instanceof Timestamp) {
              sanitized[key] = { _t: 'timestamp', val: docData[key].toDate().toISOString() };
            } else {
              sanitized[key] = docData[key];
            }
          }
          return sanitized;
        });
      }
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="system_data_backup.json"');
      res.json(data);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch data." });
    }
  });

  // Proxy for Telegram Auth Endpoint
  app.post("/api/auth/telegram", async (req, res) => {
    const { hash, ...data } = req.body;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) return res.status(500).json({ error: "Server misconfigured" });

    // Validate hash
    const secret = crypto.createHmac("sha256", crypto.createHash("sha256").update(botToken).digest()).update(Object.keys(data).sort().map(key => `${key}=${data[key]}`).join("\n")).digest("hex");
    
    if (hash !== secret) return res.status(401).json({ error: "Invalid integrity" });

    const { uid, ...telegramData } = data;
    if (!uid) return res.status(400).json({ error: "Missing uid" });

    try {
        await updateDoc(doc(db, "users", uid), {
          "socialLinks.telegram": telegramData
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "Failed to link" });
    }
  });

  // Chèn Middleware Vite hoặc serve file tĩnh
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
  });
}

startServer();
