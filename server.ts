import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, getDocs, Timestamp, getDoc, setDoc } from "firebase/firestore";
import crypto from "crypto";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json";

const firebaseApp = initializeApp(firebaseConfig);
const db = (firebaseConfig as any).firestoreDatabaseId 
  ? getFirestore(firebaseApp, (firebaseConfig as any).firestoreDatabaseId)
  : getFirestore(firebaseApp);

// Automatically sync and initialize system banking config to live MB BANK 00010302003
try {
  setDoc(doc(db, "settings", "system"), {
    bankingConfig: {
      bankCode: "MB",
      bankAccount: "00010302003"
    }
  }, { merge: true }).then(() => {
    console.log("System banking configurations successfully defaulted to MB Bank - 00010302003");
  }).catch(e => {
    console.error("Failed to set default system banking configuration", e);
  });
} catch (err) {
  console.error("Initialization error updating default system configurations", err);
}

// Cache for Gemini Client to avoid re-initializing if key hasn't changed
let cachedAiClient: { key: string, client: GoogleGenAI } | null = null;

async function getAiClient() {
  // 1. Try to get key from Firestore (Admin UI setup)
  try {
    const apiKeysSnap = await getDoc(doc(db, "settings", "apiKeys"));
    const firestoreKey = apiKeysSnap.exists() ? apiKeysSnap.data().geminiApiKey : null;
    
    const keyToUse = firestoreKey || process.env.GEMINI_API_KEY;

    if (!keyToUse) {
      throw new Error("Gemini API Key is not configured in Admin panel or Environment variables.");
    }

    if (cachedAiClient && cachedAiClient.key === keyToUse) {
      return cachedAiClient.client;
    }

    const client = new GoogleGenAI({
      apiKey: keyToUse,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    cachedAiClient = { key: keyToUse, client };
    return client;
  } catch (error) {
    console.error("Error initializing Gemini client:", error);
    throw error;
  }
}

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// Gemini Proxy Endpoint
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const { model, contents, config } = req.body;
      
      if (!contents) {
        return res.status(400).json({ error: "Missing contents" });
      }

      const ai = await getAiClient();
      const response = await ai.models.generateContent({
        model: model || "gemini-1.5-flash",
        contents,
        config: config || {}
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ 
        error: "AI processing failed", 
        message: error.message || "Unknown error" 
      });
    }
  });

  // Endpoint to create an invoice
  app.post("/api/invoices/create", async (req, res) => {
    try {
      const { userId, userEmail, items, totalAmount } = req.body;
      
      const referenceCode = `Bmass${Math.floor(100000 + Math.random() * 900000)}`;
      const invoiceRef = doc(db, "invoices", referenceCode);
      const invoiceData = {
        id: referenceCode,
        userId: userId || "guest",
        userEmail: userEmail || "guest",
        items: items || [],
        totalAmount: totalAmount || 0,
        status: "pending",
        paymentMethod: "bank_transfer",
        paymentDetails: {
          referenceCode
        },
        createdAt: Timestamp.now(),
      };

      await setDoc(invoiceRef, invoiceData);
      res.json(invoiceData);
    } catch (error: any) {
      console.error("Create Invoice Error:", error);
      res.status(500).json({ error: "Failed to create invoice: " + (error.message || error) });
    }
  });

  // SePay Webhook Endpoint (Main)
  const handleSepayWebhook = async (req: express.Request, res: express.Response) => {
    // If it's a GET request (for testing/pinging), just return success
    if (req.method === 'GET') {
      return res.status(200).json({ success: true, message: "Webhook is reachable" });
    }

    try {
      // 1. Validate API Key if configured
      if (process.env.SEPAY_API_KEY) {
        const authHeader = req.headers.authorization || req.headers.apikey || req.headers["x-api-key"] || "";
        const token = String(authHeader).replace(/^(Bearer|Apikey)\s+/i, "").trim();
        if (token !== process.env.SEPAY_API_KEY) {
          return res.status(401).json({ success: false, error: "Unauthorized" });
        }
      }

      const payload = req.body;
      console.log("SePay Webhook Received:", JSON.stringify(payload, null, 2));

      const transactionId = payload.id || payload.transactionId;
      if (!transactionId) {
        return res.json({ success: true }); // Ignore if no transaction ID
      }

      // 2. Prevent duplicate processing using a webhook_logs collection (Idempotency)
      const logRef = doc(db, "webhook_logs", String(transactionId));
      const logSnap = await getDoc(logRef);
      
      if (logSnap.exists()) {
        console.log(`Webhook for transaction ${transactionId} already processed.`);
        return res.json({ success: true });
      }

      // 3. Mark as processed immediately (to avoid race conditions)
      await setDoc(logRef, {
        payload,
        createdAt: Timestamp.now()
      });

      // SePay sends description which contains reference code
      const description = payload.content || payload.description || "";
      const amount = Number(payload.transferAmount || payload.amount || 0);

      // Extract reference code like Bmass123456 (matching user's prefix)
      // The provided documentation says code can be sent in payload.code as well
      const referenceCodeSearch = payload.code || description.match(/Bmass[0-9]{3,12}/i)?.[0];
      
      if (referenceCodeSearch) {
        // Find pending invoice using multiple case fallbacks to ensure absolute success
        let invoiceRef = doc(db, "invoices", referenceCodeSearch);
        let invoiceSnap = await getDoc(invoiceRef);
        
        if (!invoiceSnap.exists()) {
          invoiceRef = doc(db, "invoices", referenceCodeSearch.toUpperCase());
          invoiceSnap = await getDoc(invoiceRef);
        }
        
        if (!invoiceSnap.exists()) {
          invoiceRef = doc(db, "invoices", referenceCodeSearch.toLowerCase());
          invoiceSnap = await getDoc(invoiceRef);
        }

        if (!invoiceSnap.exists()) {
          const formatted = "Bmass" + referenceCodeSearch.replace(/^[A-Za-z]+/, "");
          invoiceRef = doc(db, "invoices", formatted);
          invoiceSnap = await getDoc(invoiceRef);
        }
        
        if (invoiceSnap.exists()) {
          const invoiceData = invoiceSnap.data();
          const referenceCode = invoiceSnap.id;
          if (invoiceData.status === "pending") {
            // Check if amount matches. Use amount >= invoiceData.totalAmount as a safer check.
            if (amount >= (invoiceData.totalAmount - 100)) { // Allow minor display diff
               await updateDoc(invoiceRef, {
                 status: "paid",
                 paidAt: Timestamp.now(),
                 "paymentDetails.sepayTransactionId": transactionId,
                 "paymentDetails.actualAmount": amount
               });
               console.log(`Invoice ${referenceCode} marked as PAID via SePay`);
            } else {
               console.log(`Amount mismatch for invoice ${referenceCode}: expected ${invoiceData.totalAmount}, got ${amount}`);
            }
          } else {
            console.log(`Invoice ${referenceCode} is already in state: ${invoiceData.status}`);
          }
        } else {
          console.log(`No pending invoice found for reference code: ${referenceCodeSearch}`);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("SePay Webhook Error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  };

  app.post("/api/webhooks/sepay", handleSepayWebhook);
  app.get("/api/webhooks/sepay", handleSepayWebhook);
  app.post("/hooks/sepay-payment", handleSepayWebhook); // Alias for user's configured URL
  app.get("/hooks/sepay-payment", handleSepayWebhook);

  // Manual confirmation / callback verification endpoint for invoices (checks SePay transactions API)
  app.post("/api/invoices/verify", async (req, res) => {
    try {
      const { invoiceId, isSandboxMock } = req.body;
      if (!invoiceId) {
        return res.status(400).json({ error: "Missing invoiceId" });
      }

      const invoiceRef = doc(db, "invoices", invoiceId);
      const invoiceSnap = await getDoc(invoiceRef);

      if (!invoiceSnap.exists()) {
        return res.status(404).json({ error: "No invoice found" });
      }

      const invoiceData = invoiceSnap.data();
      if (invoiceData.status === "paid") {
        return res.json({ success: true, status: "paid", message: "Hóa đơn này đã được xác nhận thanh toán thành công!" });
      }

      const referenceCode = invoiceData.paymentDetails?.referenceCode || invoiceId;
      const expectedAmount = invoiceData.totalAmount;

      // 1. Sandbox mock simulation (always available to ease testing/sandbox flow when API or transfers are not ready)
      if (isSandboxMock) {
        await updateDoc(invoiceRef, {
          status: "paid",
          paidAt: Timestamp.now(),
          "paymentDetails.sepayTransactionId": `MOCK_${Math.floor(10000000 + Math.random() * 90000000)}`,
          "paymentDetails.isSandboxMock": true
        });
        return res.json({ success: true, status: "paid", message: "Duyệt giao dịch mô phỏng nâng cao thành công!" });
      }

      // 2. Query SePay API to fetch latest bank transactions in real-time
      const sepayApiKey = process.env.SEPAY_API_KEY;
      if (sepayApiKey) {
        const sysSnap = await getDoc(doc(db, "settings", "system"));
        const bankingConfig = sysSnap.exists() ? sysSnap.data().bankingConfig : null;
        const bankAccount = bankingConfig?.bankAccount || "";

        let url = "https://apigateway.sepay.vn/api/transactions/list?limit=20";
        if (bankAccount) {
          url += `&account_number=${encodeURIComponent(bankAccount)}`;
        }

        console.log(`Checking SePay list API for invoice ${invoiceId} (Reference: ${referenceCode})`);
        
        try {
          const apiResponse = await axios.get(url, {
            headers: {
              "Authorization": `Bearer ${sepayApiKey}`
            },
            timeout: 10000
          });

          const data = apiResponse.data;
          if (data && data.transactions && Array.isArray(data.transactions)) {
            const matchedTx = data.transactions.find((tx: any) => {
              const content = String(tx.transaction_content || tx.content || tx.description || "").toUpperCase();
              const txCode = String(tx.code || "").toUpperCase();
              const referenceUpper = referenceCode.toUpperCase();
              
              const codeInContent = content.includes(referenceUpper);
              const codeMatches = txCode === referenceUpper;
              
              const amount = Number(tx.amount_in || tx.transferAmount || tx.amount || 0);
              const amountMatches = amount >= (expectedAmount - 100);

              return (codeInContent || codeMatches) && amountMatches;
            });

            if (matchedTx) {
              const transactionId = matchedTx.id || matchedTx.transactionId;
              const logRef = doc(db, "webhook_logs", String(transactionId));
              await setDoc(logRef, {
                payload: matchedTx,
                createdAt: Timestamp.now(),
                manualCheck: true
              });

              await updateDoc(invoiceRef, {
                status: "paid",
                paidAt: Timestamp.now(),
                "paymentDetails.sepayTransactionId": transactionId,
                "paymentDetails.actualAmount": Number(matchedTx.amount_in || matchedTx.transferAmount || matchedTx.amount || 0),
                "paymentDetails.actualSource": "sepay_api_manual_check"
              });

              return res.json({ 
                success: true, 
                status: "paid", 
                message: "Cổng SePay xác nhận đã tìm thấy giao dịch chuyển khoản thành công!" 
              });
            }
          }
        } catch (apiErr: any) {
          console.log(`SePay list API connection issues (expected in sandboxed trial): ${apiErr?.message || apiErr}`);
          return res.json({
            success: false,
            status: "pending",
            isNetworkOffline: true,
            message: "Không thể kết nối cổng thanh toán tự động. Vui lòng xác nhận giao dịch thủ công bằng cách nhấn 'Tôi đã thanh toán (Kiểm tra ngay)' sau khi hoàn tất chuyển khoản."
          });
        }
      }

      // 3. Fallback: Transaction not found on SePay bank history
      return res.json({ 
        success: false, 
        status: "pending", 
        message: `Không tìm thấy nội dung chuyển khoản "${referenceCode}" với số tiền ${expectedAmount.toLocaleString()}đ trên lịch sử SePay. Bạn có muốn duyệt nhanh hoặc kích hoạt chế độ sandbox để kiểm nghiệm không?`
      });

    } catch (error: any) {
      console.error("Manual verify action error:", error);
      res.status(500).json({ error: "Lỗi kiểm tra hóa đơn: " + (error.message || error) });
    }
  });

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

  // Proxy for Cloud Storage or other APIs would go here

  export default app;

  async function startServer() {
    const PORT = 3000;
  
    // Chèn Middleware Vite hoặc serve file tĩnh
    if (process.env.NODE_ENV !== "production") {
      const vitePkg = "vite";
      const { createServer: createViteServer } = await import(vitePkg);
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      // Serve index.html for all undefined GET requests (SPA catch-all)
      app.get(/.*/, (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  }

  // Khởi động nội bộ khi không chạy trên Vercel Serverless
  if (!process.env.VERCEL) {
    startServer();
  }
