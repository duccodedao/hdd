
import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  increment,
  limit
} from "firebase/firestore";
import crypto from "crypto";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Client SDK
const firebaseApp = initializeApp(firebaseConfig);
const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const db = getFirestore(firebaseApp, databaseId);
console.log(`Firebase Client initialized targeting project: ${firebaseConfig.projectId}, database: ${databaseId}`);

// Automatically sync and initialize system banking config to live MB BANK 00010302003
// try {
//   setDoc(doc(db, "settings", "system"), {
//     bankingConfig: {
//       bankCode: "MB",
//       bankAccount: "00010302003"
//     }
//   }, { merge: true }).then(() => {
//     console.log("System banking configurations successfully defaulted to MB Bank - 00010302003");
//   }).catch(e => {
//     console.error("Failed to set default system banking configuration", e);
//   });
// } catch (err) {
//   console.error("Initialization error updating default system configurations", err);
// }

// Cache for Gemini Client to avoid re-initializing if key hasn't changed
let cachedAiClient: { key: string, client: GoogleGenAI } | null = null;

  async function getAiClient() {
  // 1. Try to get key from Firestore (Admin UI setup)
  try {
    const apiKeysSnap = await getDoc(doc(db, "settings/apiKeys"));
    const firestoreKey = apiKeysSnap.exists() ? apiKeysSnap.data()?.geminiApiKey : null;
    
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

      if (!response || !response.text) {
        throw new Error("Empty response from Gemini");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ 
        error: "AI processing failed", 
        message: error.message || "Unknown error" 
      });
    }
  });

  // Endpoint to create an invoice (for deposits too)
  // Diagnostic endpoint to check Firestore connectivity
  app.get("/api/diag/firestore", async (req, res) => {
    try {
      const testRef = doc(db, "system/health_check");
      await setDoc(testRef, {
        lastCheck: Timestamp.now(),
        serverNode: process.env.K_SERVICE || "local",
        sdk: "client"
      }, { merge: true });
      
      const snap = await getDoc(testRef);
      res.json({ 
        status: "ok", 
        databaseId: firebaseConfig.firestoreDatabaseId || "(default)",
        projectId: firebaseConfig.projectId,
        data: snap.data() 
      });
    } catch (error: any) {
      console.error("Firestore Diagnostic Error:", error);
      res.status(500).json({ 
        error: error.message, 
        code: error.code,
        details: error.details,
        stack: error.stack,
        hint: `Nếu gặp lỗi PERMISSION_DENIED (API not used/disabled), hãy truy cập link sau để kích hoạt API cho project ${firebaseConfig.projectId}: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${firebaseConfig.projectId}`
      });
    }
  });

  app.post("/api/invoices/create", async (req, res) => {
    try {
      const { userId, userEmail, items, totalAmount, type } = req.body;
      
      const referenceCode = `Bmass${Math.floor(100000 + Math.random() * 900000)}`;
      const invoiceRef = doc(db, `invoices/${referenceCode}`);
      const invoiceData = {
        id: referenceCode,
        userId: userId || "guest",
        userEmail: userEmail || "guest",
        items: items || [],
        totalAmount: totalAmount || 0,
        status: "pending",
        type: type || "purchase", // 'purchase' or 'deposit'
        paymentMethod: "bank_transfer",
        paymentDetails: {
          referenceCode
        },
        createdAt: Timestamp.now(),
      };

      await setDoc(invoiceRef, invoiceData);
      res.json(invoiceData);
    } catch (error: any) {
      console.error("Create Invoice Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });

      let errorMessage = "Failed to create invoice: " + (error.message || error);
      let hint = "";

      if (error.message?.includes("PERMISSION_DENIED") || error.code === 7) {
        const projId = firebaseConfig.projectId;
        errorMessage = "Lỗi: Quyền truy cập Firestore bị từ chối (PERMISSION_DENIED).";
        hint = `Vui lòng kiểm tra xem Cloud Firestore API đã được kích hoạt chưa: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=${projId}`;
      } else if (error.message?.includes("NOT_FOUND") || error.message?.includes("database") || error.code === 5) {
        errorMessage = `Lỗi: Không tìm thấy database '${databaseId}'.`;
        hint = "Vui lòng kiểm tra lại cấu hình firestoreDatabaseId trong cài đặt.";
      }

      res.status(500).json({ 
        error: errorMessage,
        hint: hint,
        details: error.message
      });
    }
  });

  // Wallet Purchase API
  app.post("/api/wallet/purchase", async (req, res) => {
    try {
      const { userId, userEmail, userName, productId, productName, amount } = req.body;
      if (!userId || !amount) return res.status(400).json({ error: "Missing required fields" });

      const userRef = doc(db, `users/${userId}`);
      const userSnap = await getDoc(userRef);
      
      const currentBalance = userSnap.exists() ? (userSnap.data()?.balance || 0) : 0;
      
      if (currentBalance < amount) {
        return res.status(400).json({ error: "Số dư không đủ. Vui lòng nạp thêm tiền vào ví!" });
      }

      // Deduct balance
      await setDoc(userRef, {
        balance: currentBalance - amount,
      }, { merge: true });

      // Record transaction
      const txId = `TX_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      await setDoc(doc(db, `transactions/${txId}`), {
        id: txId,
        userId,
        userEmail,
        userName,
        productId,
        productName,
        amount,
        type: "purchase",
        status: "completed",
        createdAt: Timestamp.now()
      });

      res.json({ success: true, newBalance: currentBalance - amount });
    } catch (error: any) {
      console.error("Purchase Error:", error);
      res.status(500).json({ error: "Giao dịch thất bại: " + error.message });
    }
  });

  // Find Transfer Recipient
  app.post("/api/wallet/find-recipient", async (req, res) => {
    try {
      const { searchKey } = req.body;
      if (!searchKey) return res.status(400).json({ error: "Vui lòng nhập email hoặc số điện thoại" });

      const searchLower = searchKey.trim().toLowerCase();

      // Query by email
      let snap = await db.collection("users").where("email", "==", searchLower).get();

      // Try phone number if empty
      if (snap.empty) {
        snap = await db.collection("users").where("phoneNumber", "==", searchKey.trim()).get();
      }

      if (snap.empty) {
        return res.status(404).json({ error: "Không tìm thấy người nhận với email hoặc số điện thoại này." });
      }

      const recipientDoc = snap.docs[0];
      const recipientData = recipientDoc.data();
      res.json({
        uid: recipientDoc.id,
        displayName: recipientData.displayName || "Người dùng",
        email: recipientData.email || "",
        phoneNumber: recipientData.phoneNumber || "",
        photoURL: recipientData.photoURL || ""
      });
    } catch (error: any) {
      console.error("Find Recipient Error:", error);
      res.status(500).json({ error: "Failed to query recipient: " + error.message });
    }
  });

  // Inter-user Wallet Balance Transfer
  app.post("/api/wallet/transfer", async (req, res) => {
    try {
      const { senderId, recipientId, amount, message } = req.body;
      const parseAmount = parseInt(amount);

      if (!senderId || !recipientId || isNaN(parseAmount) || parseAmount <= 0) {
        return res.status(400).json({ error: "Thông tin chuyển khoản không hợp lệ." });
      }

      if (senderId === recipientId) {
        return res.status(400).json({ error: "Bạn không thể tự chuyển tiền cho chính mình!" });
      }

      const senderRef = db.doc(`users/${senderId}`);
      const recipientRef = db.doc(`users/${recipientId}`);

      const senderSnap = await senderRef.get();
      const recipientSnap = await recipientRef.get();

      if (!senderSnap.exists) {
         return res.status(400).json({ error: "Không tìm thấy tài khoản người gửi." });
      }
      if (!recipientSnap.exists) {
         return res.status(400).json({ error: "Không tìm thấy tài khoản người nhận." });
      }

      const senderData = senderSnap.data();
      const recipientData = recipientSnap.data();

      const senderBalance = senderData?.balance || 0;
      const recipientBalance = recipientData?.balance || 0;

      if (senderBalance < parseAmount) {
         return res.status(400).json({ error: "Số dư khả dụng không đủ để thực hiện giao dịch." });
      }

      // Deduct from sender, add to recipient
      await senderRef.set({
        balance: senderBalance - parseAmount
      }, { merge: true });

      await recipientRef.set({
        balance: recipientBalance + parseAmount
      }, { merge: true });

      const transferTime = Timestamp.now();
      const txIdSender = `TX_TRA_OUT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const txIdRecipient = `TX_TRA_IN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Save transactions
      await db.doc(`transactions/${txIdSender}`).set({
        id: txIdSender,
        userId: senderId,
        userEmail: senderData?.email || "",
        userName: senderData?.displayName || "User",
        productId: recipientId,
        productName: `Chuyển tiền đến ${recipientData?.displayName || recipientData?.email}`,
        amount: parseAmount,
        type: "transfer_out",
        status: "completed",
        message: message || "Chuyển tiền qua ví",
        createdAt: transferTime
      });

      await db.doc(`transactions/${txIdRecipient}`).set({
        id: txIdRecipient,
        userId: recipientId,
        userEmail: recipientData?.email || "",
        userName: recipientData?.displayName || "User",
        productId: senderId,
        productName: `Nhận tiền từ ${senderData?.displayName || senderData?.email}`,
        amount: parseAmount,
        type: "transfer_in",
        status: "completed",
        message: message || "Chuyển tiền qua ví",
        createdAt: transferTime
      });

      res.json({ success: true, newBalance: senderBalance - parseAmount });
    } catch (error: any) {
      console.error("Transfer Error:", error);
      res.status(500).json({ error: "Chuyển tiền thất bại: " + error.message });
    }
  });

  async function updateWalletOnPayment(invoiceData: any) {
    if (invoiceData.type === "deposit") {
      const userRef = db.doc(`users/${invoiceData.userId}`);
      const userSnap = await userRef.get();
      const currentBalance = userSnap.exists ? (userSnap.data()?.balance || 0) : 0;
      
      await userRef.set({
        balance: currentBalance + invoiceData.totalAmount,
      }, { merge: true });

      // Also record in deposits collection for admin audit
      const depositId = `DEP_${invoiceData.id}`;
      await db.doc(`deposits/${depositId}`).set({
        id: depositId,
        invoiceId: invoiceData.id,
        userId: invoiceData.userId,
        userEmail: invoiceData.userEmail,
        amount: invoiceData.totalAmount,
        status: "completed",
        createdAt: Timestamp.now()
      });
    }
  }

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
      const logRef = db.doc(`webhook_logs/${String(transactionId)}`);
      const logSnap = await logRef.get();
      
      if (logSnap.exists) {
        console.log(`Webhook for transaction ${transactionId} already processed.`);
        return res.json({ success: true });
      }

      // 3. Mark as processed immediately (to avoid race conditions)
      await logRef.set({
        payload,
        createdAt: Timestamp.now()
      });

      // SePay sends description which contains reference code
      const description = payload.content || payload.description || "";
      const amount = Number(payload.transferAmount || payload.amount || 0);

      // Extract reference code like Bmass123456 (matching user's prefix)
      const referenceCodeSearch = payload.code || description.match(/Bmass[0-9]{3,12}/i)?.[0];
      
      if (referenceCodeSearch) {
        // Find pending invoice using multiple case fallbacks to ensure absolute success
        let invoiceRef = db.doc(`invoices/${referenceCodeSearch}`);
        let invoiceSnap = await invoiceRef.get();
        
        if (!invoiceSnap.exists) {
          invoiceRef = db.doc(`invoices/${referenceCodeSearch.toUpperCase()}`);
          invoiceSnap = await invoiceRef.get();
        }
        
        if (!invoiceSnap.exists) {
          invoiceRef = db.doc(`invoices/${referenceCodeSearch.toLowerCase()}`);
          invoiceSnap = await invoiceRef.get();
        }

        if (invoiceSnap.exists) {
          const invoiceData = invoiceSnap.data();
          const referenceCode = invoiceSnap.id;
          if (invoiceData?.status === "pending") {
            // Check if amount matches. Use amount >= invoiceData.totalAmount as a safer check.
            if (amount >= (invoiceData.totalAmount - 100)) { // Allow minor display diff
               await invoiceRef.update({
                 status: "paid",
                 paidAt: Timestamp.now(),
                 "paymentDetails.sepayTransactionId": transactionId,
                 "paymentDetails.actualAmount": amount
               });
               await updateWalletOnPayment(invoiceData);
               console.log(`Invoice ${referenceCode} marked as PAID via SePay`);
            }
          }
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

      const invoiceRef = db.doc(`invoices/${invoiceId}`);
      const invoiceSnap = await invoiceRef.get();

      if (!invoiceSnap.exists) {
        return res.status(404).json({ error: "No invoice found" });
      }

      const invoiceData = invoiceSnap.data();
      if (invoiceData?.status === "paid") {
        return res.json({ success: true, status: "paid", message: "Hóa đơn này đã được xác nhận thanh toán thành công!" });
      }

      const referenceCode = invoiceData?.paymentDetails?.referenceCode || invoiceId;
      const expectedAmount = invoiceData?.totalAmount || 0;

      // 1. Sandbox mock simulation (always available to ease testing/sandbox flow when API or transfers are not ready)
      if (isSandboxMock) {
        await invoiceRef.update({
          status: "paid",
          paidAt: Timestamp.now(),
          "paymentDetails.sepayTransactionId": `MOCK_${Math.floor(10000000 + Math.random() * 90000000)}`,
          "paymentDetails.isSandboxMock": true
        });
        await updateWalletOnPayment(invoiceData);
        return res.json({ success: true, status: "paid", message: "Duyệt giao dịch mô phỏng nâng cao thành công!" });
      }

      // 2. Query SePay API to fetch latest bank transactions in real-time
      const sepayApiKey = process.env.SEPAY_API_KEY;
      if (sepayApiKey) {
        const sysSnap = await db.doc("settings/system").get();
        const bankingConfig = sysSnap.exists ? sysSnap.data()?.bankingConfig : null;
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
              const logRef = db.doc(`webhook_logs/${String(transactionId)}`);
              await logRef.set({
                payload: matchedTx,
                createdAt: Timestamp.now(),
                manualCheck: true
              });

              await invoiceRef.update({
                status: "paid",
                paidAt: Timestamp.now(),
                "paymentDetails.sepayTransactionId": transactionId,
                "paymentDetails.actualAmount": Number(matchedTx.amount_in || matchedTx.transferAmount || matchedTx.amount || 0),
                "paymentDetails.actualSource": "sepay_api_manual_check"
              });

              await updateWalletOnPayment(invoiceData);

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
        const snap = await db.collection(col).get();
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
        await db.doc(`users/${uid}`).update({
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
