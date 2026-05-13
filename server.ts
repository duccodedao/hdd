import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc, collection, getDocs } from "firebase/firestore";
import crypto from "crypto";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";

// Firebase web config (reused from src/lib/firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyCLCcgaoW9gNYhKk0c0gDWC6i5mKVTN4XE",
  authDomain: "profile-d1214.firebaseapp.com",
  projectId: "profile-d1214",
  storageBucket: "profile-d1214.firebasestorage.app",
  messagingSenderId: "914980131889",
  appId: "1:914980131889:web:72f8da15c42dbee671b110",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());

  // Zalo Webhook Endpoint
  app.post("/api/zalo/webhook", async (req, res) => {
    // console.log("Zalo Webhook Event:", JSON.stringify(req.body, null, 2));
    const event = req.body;
    const secretTokenHeader = req.headers["x-bot-api-secret-token"];

    try {
      // Fetch Configs
      const [apiSnap, zaloSnap, productsSnap] = await Promise.all([
        getDoc(doc(db, "settings", "apiKeys")),
        getDoc(doc(db, "settings", "zalo", "config", "bot")),
        getDocs(collection(db, "products"))
      ]);

      const geminiApiKey = apiSnap.exists() ? apiSnap.data().geminiApiKey : null;
      const zaloConfig = zaloSnap.exists() ? zaloSnap.data() : {};
      
      const zaloAccessToken = zaloConfig.accessToken; // OA Token
      const zaloPlatformBotToken = zaloConfig.botToken; // New Bot Platform Token
      const zaloWebhookSecret = zaloConfig.webhookSecret; // Secret Token for validation

      // Verify secret token if configured
      if (zaloWebhookSecret && secretTokenHeader !== zaloWebhookSecret) {
        return res.status(401).send("Unauthorized");
      }

      let senderId = null;
      let userMessage = null;
      let isPlatformBot = false;

      // Detect Event Source
      if (event.event_name === "user_send_text") {
        // Zalo OA Event
        senderId = event.sender.id;
        userMessage = event.message.text;
      } else if (event.message && event.message.chat_id) {
        // Potential New Platform Bot Event (Assuming standard structure if not explicitly shown)
        senderId = event.message.chat_id;
        userMessage = event.message.text;
        isPlatformBot = true;
      } else if (event.chat_id && event.text) {
        // Alternate structure for new platform
        senderId = event.chat_id;
        userMessage = event.text;
        isPlatformBot = true;
      }

      if (senderId && userMessage && geminiApiKey) {
        const utilities = productsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        const baseUrl = req.protocol + "://" + req.get("host");
        const utilityContext = utilities.map(u => `- ${u.title}: ${u.description} (Link: ${baseUrl}/utilities?id=${u.id})`).join("\n");

        const prompt = `
          Bạn là trợ lý AI thông minh của hệ thống Nucleus OS (BMASS).
          Nhiệm vụ: Trả lời tin nhắn của người dùng một cách thân thiện, chuyên nghiệp.
          Dưới đây là danh sách các tiện ích có sẵn trong hệ thống:
          ${utilityContext}

          Nếu người dùng hỏi về các công cụ, hãy giới thiệu tiện ích phù hợp và KÈM THEO LINK TRỰC TIẾP tôi đã cung cấp.
          Nếu người dùng hỏi câu hỏi chung, hãy trả lời ngắn gọn.
          Tin nhắn người dùng: "${userMessage}"
          Trả lời bằng Tiếng Việt.
        `;

        const genAI = new GoogleGenAI(geminiApiKey) as any;
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text() || "Xin lỗi, hiện tại tôi gặp sự cố khi xử lý yêu cầu.";

        if (isPlatformBot && zaloPlatformBotToken) {
          // Send back via New Bot Platform API
          await axios.post(
            `https://bot-api.zaloplatforms.com/bot${zaloPlatformBotToken}/sendMessage`,
            {
              chat_id: senderId,
              text: aiResponse
            }
          );
        } else if (zaloAccessToken) {
          // Send back via OA API
          await axios.post(
            "https://openapi.zalo.me/v2.0/oa/message",
            {
              recipient: { user_id: senderId },
              message: { text: aiResponse }
            },
            {
              headers: {
                "Content-Type": "application/json",
                "access_token": zaloAccessToken
              }
            }
          );
        }
      }
    } catch (error) {
      console.error("Zalo Webhook AI Error:", error);
    }

    res.status(200).send("OK");
  });

  // Proxy for Zalo Platform Bot APIs (Avoid CORS)
  app.post("/api/zalo/proxy/:method", async (req, res) => {
    const { method } = req.params;
    const { botToken, ...payload } = req.body;

    if (!botToken) {
      return res.status(400).json({ ok: false, description: "Missing botToken" });
    }

    try {
      const response = await axios.post(
        `https://bot-api.zaloplatforms.com/bot${botToken}/${method}`,
        payload,
        { 
          headers: { "Content-Type": "application/json" },
          timeout: 10000 
        }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error(`Zalo Proxy Error (${method}):`, error.response?.data || error.message);
      
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { 
        ok: false, 
        description: error.message,
        error_code: -1
      };
      
      res.status(status).json(errorData);
    }
  });

  // Proxy for Zalo OA APIs (Legacy)
  app.post("/api/zalo/oa-proxy/:method", async (req, res) => {
    const { method } = req.params;
    const { accessToken, ...payload } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: "Missing accessToken" });
    }

    try {
      const response = await axios.post(
        `https://openapi.zalo.me/v2.0/oa/${method}`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            "access_token": accessToken
          }
        }
      );
      res.json(response.data);
    } catch (error: any) {
      console.error(`Zalo OA Proxy Error (${method}):`, error.response?.data || error.message);
      res.status(error.response?.status || 500).json(error.response?.data || { error: -1, message: error.message });
    }
  });

  // Telegram Auth Endpoint
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
