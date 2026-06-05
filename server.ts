
import express from "express";
import path from "path";
import cors from "cors";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import * as admin from 'firebase-admin';
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
  limit,
  writeBatch,
  runTransaction
} from "firebase/firestore";
import crypto from "crypto";
import axios from "axios";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

// Read config with path resolution and environment fallback for Vercel/production
let firebaseConfig: any;
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } else {
    throw new Error("Local config not found");
  }
} catch (e) {
  console.log("Firebase configuration file missing or unreadable, using environment or hardcoded defaults.");
  const hardcodedProjectId = "sonlyhongduc-ca6d6";
  firebaseConfig = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyCXAxmprEv9fF-P-1lLpUzykkxG4HjDVI4",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN || `${hardcodedProjectId}.firebaseapp.com`,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || hardcodedProjectId,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET || `${hardcodedProjectId}.firebasestorage.app`,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID || "757658501532",
    appId: process.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID || "1:757658501532:web:08c87ad6c041e0bc140859",
    measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID || "G-GXHCCW2KMH",
    firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || process.env.FIREBASE_DATABASE_ID || "main"
  };
}

// Crucial: Set project ID environment variables manually to help SDKs discover it
if (firebaseConfig.projectId) {
  process.env.GCLOUD_PROJECT = firebaseConfig.projectId;
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
  // Also set FIREBASE_CONFIG as stringified JSON which some SDKs look for
  process.env.FIREBASE_CONFIG = JSON.stringify(firebaseConfig);
}

const databaseId = firebaseConfig.firestoreDatabaseId || "(default)";

// Initialize Firebase Admin (for privileged server-side operations)
let adminDb: any = null;
try {
  const projectId = firebaseConfig?.projectId;
  
  // Safe helper to check for initialized apps
  const getApps = () => {
    try {
      if (admin && admin.apps) return admin.apps;
      const a = admin as any;
      if (a && a.default && a.default.apps) return a.default.apps;
    } catch (e) {}
    return [];
  };

  const getAdminDb = (dbId?: string) => {
    try {
      const targetDb = dbId && dbId !== "(default)" ? dbId : undefined;
      // @ts-ignore - Handle different SDK versions/bundling
      if (typeof admin.firestore === 'function') {
        const dbHandle = targetDb ? (admin.firestore as any)(targetDb) : admin.firestore();
        // Check if handles the main database correctly
        return dbHandle;
      }
      const a = admin as any;
      if (a.default && typeof a.default.firestore === 'function') {
        return targetDb ? a.default.firestore(targetDb) : a.default.firestore();
      }
    } catch (e) {
      console.warn("Error getting admin firestore handle:", e);
    }
    return null;
  };

  if (getApps().length === 0) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      try {
        const serviceAccount = JSON.parse(serviceAccountJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId
        });
      } catch (e) {
        admin.initializeApp({ projectId });
      }
    } else {
      try {
        admin.initializeApp({ projectId });
      } catch (e) {
        // May already be initialized by environment
      }
    }
  }

  adminDb = getAdminDb(databaseId);
  if (!adminDb && databaseId !== "(default)") {
    console.warn(`Falling back to default database for adminDb`);
    adminDb = getAdminDb();
  }
} catch (e: any) {
  console.error("Critical: Firebase Admin SDK setup failed:", e.message);
}


// Initialize Firebase Client SDK
let firebaseApp: any = null;
try {
  if (!firebaseConfig || !firebaseConfig.projectId) {
    console.error("Firebase configuration is missing or invalid. Check your setup.");
  } else {
    firebaseApp = initializeApp(firebaseConfig);
    console.log(`Firebase Client App initialized successfully: ${firebaseConfig.projectId}`);
  }
} catch (appErr: any) {
  console.error("Critical: Failed to initialize Firebase Client App", appErr.message);
}

let db: any = null;
if (firebaseApp) {
  try {
    db = getFirestore(firebaseApp, databaseId === "(default)" ? undefined : databaseId);
    console.log(`Firestore Client SDK initialized targeting database: ${databaseId}`);
  } catch (e: any) {
    console.warn(`Client SDK fail for database '${databaseId}', using default database. Error: ${e.message}`);
    try {
      db = getFirestore(firebaseApp);
    } catch (innerE: any) {
      console.error("Critical: All Firestore Client SDK initialization attempts failed", innerE.message);
    }
  }
}

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

// Helper to safely stringify objects potentially containing circular references
function safeStringify(obj: any, indent = 2) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular]';
      }
      cache.add(value);
    }
    return value;
  }, indent);
}

// Notification Helpers
async function sendTelegramNotification(message: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.ADMIN_CHAT_ID;
  
  if (!botToken || !chatId) {
    console.log("[Telegram] Notification skipped: Bot token or Admin chat ID missing.");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await axios.post(url, {
      chat_id: chatId,
      text: message,
      parse_mode: 'HTML'
    });
    console.log("[Telegram] Notification sent successfully.");
  } catch (err: any) {
    console.error("[Telegram] Failed to send notification:", err.message);
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
    const results: any = {};
    
    // 1. Check Admin SDK (Preferred)
    if (adminDb) {
      try {
        const testRefAdmin = adminDb.doc("system/health_check_admin");
        await testRefAdmin.set({
          lastCheck: admin.firestore.Timestamp.now(),
          serverNode: process.env.K_SERVICE || "local",
          sdk: "admin",
          databaseId
        }, { merge: true });
        results.adminSdk = { status: "ok", message: "Admin SDK connected successfully" };
      } catch (err: any) {
        results.adminSdk = { status: "error", message: err.message, code: err.code };
      }
    } else {
      results.adminSdk = { status: "missing", message: "Admin SDK not initialized" };
    }

    // 2. Check Client SDK (Fallback)
    try {
      const testRef = doc(db, "system/health_check_client");
      await setDoc(testRef, {
        lastCheck: Timestamp.now(),
        serverNode: process.env.K_SERVICE || "local",
        sdk: "client",
        databaseId
      }, { merge: true });
      results.clientSdk = { status: "ok", message: "Client SDK connected (might fail if rules apply)" };
    } catch (err: any) {
      results.clientSdk = { status: "error", message: err.message, code: err.code };
    }

    res.json({ 
      status: results.adminSdk?.status === "ok" ? "ok" : "warning",
      databaseId,
      projectId: firebaseConfig.projectId,
      results
    });
  });

  app.post("/api/invoices/create", async (req, res) => {
    console.log(`[Invoice Create] Request from ${req.ip}. Project: ${firebaseConfig?.projectId}. DB: ${databaseId}`);
    try {
      if (!db && !adminDb) {
        throw new Error("Cơ sở dữ liệu chưa được khởi tạo. Vui lòng kiểm tra cấu hình Firebase.");
      }
      const { userId, userEmail, items, totalAmount, type } = req.body;
      
      if (!totalAmount || Number(totalAmount) <= 0) {
        return res.status(400).json({ error: "Số tiền không hợp lệ (phải lớn hơn 0)." });
      }

      const referenceCode = `Bmass${Math.floor(100000 + Math.random() * 900000)}`;
      const dateNow = new Date();
      const invoiceData: any = {
        id: referenceCode,
        userId: userId || "guest",
        userEmail: userEmail || "guest",
        items: items || [],
        totalAmount: Number(totalAmount),
        status: "pending",
        type: type || "purchase",
        paymentMethod: "bank_transfer",
        paymentDetails: {
          referenceCode
        },
        createdAt: dateNow,
      };

      let success = false;
      let lastErr: any = null;

      // 1. Try Admin SDK first
      if (adminDb) {
        try {
          console.log(`[Invoice Create] Attempting Admin SDK for ${referenceCode}`);
          await adminDb.doc(`invoices/${referenceCode}`).set({
            ...invoiceData,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          success = true;
          console.log(`[Invoice Create] Success via Admin SDK: ${referenceCode}`);
        } catch (err: any) {
          console.error(`[Invoice Create] Admin SDK Error:`, err.message);
          lastErr = err;
          
          // Retry with default DB if project/db mismatch
          if (err.message?.includes("Project Id") || err.message?.includes("not found") || err.code === 5) {
             try {
                console.log(`[Invoice Create] Retrying with default Admin handle for ${referenceCode}`);
                await admin.firestore().doc(`invoices/${referenceCode}`).set({
                  ...invoiceData,
                  createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                success = true;
                console.log(`[Invoice Create] Success via Default Admin SDK: ${referenceCode}`);
             } catch (innerErr: any) {
                console.error("[Invoice Create] Default Admin SDK retry failed:", innerErr.message);
             }
          }
        }
      }

      // 2. Fallback to Client SDK
      if (!success) {
        try {
          console.log(`[Invoice Create] Attempting Client SDK for ${referenceCode}`);
          if (!db) throw new Error("Firestore Client SDK not initialized");
          const invoiceRef = doc(db, `invoices/${referenceCode}`);
          await setDoc(invoiceRef, {
            ...invoiceData,
            createdAt: Timestamp.now()
          });
          success = true;
          console.log(`[Invoice Create] Success via Client SDK: ${referenceCode}`);
        } catch (err: any) {
          console.error(`[Invoice Create] Client SDK Error:`, err.message);
          lastErr = lastErr || err;
        }
      }

      if (!success) {
        throw new Error(lastErr?.message || "All Firestore write attempts failed");
      }

      // Send notification for new order
      const notificationMsg = `<b>🔔 ĐƠN HÀNG MỚI (BMASS)</b>\n\n` + 
        `• <b>Mã đơn:</b> <code>${referenceCode}</code>\n` +
        `• <b>Người tạo:</b> ${userEmail || 'Ẩn danh'}\n` +
        `• <b>Số tiền:</b> ${Number(totalAmount).toLocaleString()}đ\n` +
        `• <b>Loại:</b> ${type === 'deposit' ? '💳 Nạp tiền' : '🛍️ Mua sắm'}\n` +
        `• <b>Thời gian:</b> ${dateNow.toLocaleString('vi-VN')}`;
      
      sendTelegramNotification(notificationMsg);

      res.json(invoiceData);
    } catch (error: any) {
      console.error("[Invoice Create] Final global error:", error.message);
      res.status(500).json({ 
        error: "Lỗi máy chủ khi tạo hóa đơn.",
        details: error.message,
        hint: "Vui lòng xem log server trên Vercel để biết thêm chi tiết."
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
      const qEmail = query(collection(db, "users"), where("email", "==", searchLower), limit(1));
      let snap = await getDocs(qEmail);

      // Try phone number if empty
      if (snap.empty) {
        const qPhone = query(collection(db, "users"), where("phoneNumber", "==", searchKey.trim()), limit(1));
        snap = await getDocs(qPhone);
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

      const senderRef = doc(db, `users/${senderId}`);
      const recipientRef = doc(db, `users/${recipientId}`);

      const senderSnap = await getDoc(senderRef);
      const recipientSnap = await getDoc(recipientRef);

      if (!senderSnap.exists()) {
         return res.status(400).json({ error: "Không tìm thấy tài khoản người gửi." });
      }
      if (!recipientSnap.exists()) {
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
      await setDoc(senderRef, {
        balance: senderBalance - parseAmount
      }, { merge: true });

      await setDoc(recipientRef, {
        balance: recipientBalance + parseAmount
      }, { merge: true });

      const transferTime = Timestamp.now();
      const txIdSender = `TX_TRA_OUT_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const txIdRecipient = `TX_TRA_IN_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

      // Save transactions
      await setDoc(doc(db, `transactions/${txIdSender}`), {
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

      await setDoc(doc(db, `transactions/${txIdRecipient}`), {
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
      if (adminDb) {
        const userRef = adminDb.doc(`users/${invoiceData.userId}`);
        const userSnap = await userRef.get();
        const currentBalance = userSnap.exists ? (userSnap.data()?.balance || 0) : 0;
        
        await userRef.set({
          balance: currentBalance + invoiceData.totalAmount,
        }, { merge: true });

        const depositId = `DEP_${invoiceData.id}`;
        await adminDb.doc(`deposits/${depositId}`).set({
          id: depositId,
          invoiceId: invoiceData.id,
          userId: invoiceData.userId,
          userEmail: invoiceData.userEmail,
          amount: invoiceData.totalAmount,
          status: "completed",
          createdAt: admin.firestore.Timestamp.now()
        });
      } else {
        const userRef = doc(db, `users/${invoiceData.userId}`);
        const userSnap = await getDoc(userRef);
        const currentBalance = userSnap.exists() ? (userSnap.data()?.balance || 0) : 0;
        
        await setDoc(userRef, {
          balance: currentBalance + invoiceData.totalAmount,
        }, { merge: true });

        // Also record in deposits collection for admin audit
        const depositId = `DEP_${invoiceData.id}`;
        await setDoc(doc(db, `deposits/${depositId}`), {
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
      console.log("SePay Webhook Received:", safeStringify(payload));

      const transactionId = payload.id || payload.transactionId;
      if (!transactionId) {
        return res.json({ success: true }); // Ignore if no transaction ID
      }
      
      // Determine transfer amount and reference code
      const description = String(payload.content || payload.description || "");
      const amount = Number(payload.transferAmount || payload.amount || 0);
      
      // Improved reference code extraction
      let referenceCodeSearch = payload.code;
      if (!referenceCodeSearch) {
        const match = description.match(/Bmass[0-9]+/i);
        if (match) referenceCodeSearch = match[0];
      }

      if (!referenceCodeSearch) {
        console.log("[SePay Webhook] No reference code found in payload.");
        return res.json({ success: true, message: "No reference code" });
      }

      let invoiceData: any = null;
      console.log(`[SePay Webhook] Processing transaction ${transactionId}, amount ${amount}, reference: ${referenceCodeSearch}`);
      
      if (referenceCodeSearch) {
        // Try searching by ID directly (case sensitive as created)
        const possibleIds = [referenceCodeSearch, referenceCodeSearch.toUpperCase(), referenceCodeSearch.toLowerCase()];
        
        for (const idToTry of possibleIds) {
          if (invoiceData) break;
          
          if (adminDb) {
            try {
              const snap = await adminDb.doc(`invoices/${idToTry}`).get();
              if (snap.exists) {
                invoiceData = snap.data();
                console.log(`[SePay Webhook] Found invoice via Admin SDK: ${idToTry}`);
              }
            } catch (err: any) {
              console.warn(`[SePay Webhook] Admin SDK lookup failed for ${idToTry}:`, err.message);
            }
          }
          
          if (!invoiceData && db) {
            try {
              const snap = await getDoc(doc(db, `invoices/${idToTry}`));
              if (snap.exists()) {
                invoiceData = snap.data();
                console.log(`[SePay Webhook] Found invoice via Client SDK: ${idToTry}`);
              }
            } catch (err: any) {
              console.error(`[SePay Webhook] Client SDK lookup failed for ${idToTry}:`, err.message);
            }
          }
        }
      }

      if (!invoiceData) {
        console.log(`[SePay Webhook] No invoice found for ${referenceCodeSearch} (Tried variants)`);
        // We still return 200 to SePay to acknowledge receipt
        return res.json({ success: true, message: `Invoice ${referenceCodeSearch} not found` });
      }

      console.log(`[SePay Webhook] Invoice status: ${invoiceData.status}, Expected: ${invoiceData.totalAmount}`);

      let processed = false;
      if (adminDb) {
        try {
          await adminDb.runTransaction(async (t: any) => {
            const logRefAdmin = adminDb!.doc(`webhook_logs/${String(transactionId)}`);
            const logSnap = await t.get(logRefAdmin);
            
            if (logSnap.exists) {
              processed = true;
              return;
            }

            // Check if amount is enough (allow small margin)
            const isAmountValid = amount >= (invoiceData.totalAmount - 500);
            
            // Mark log as processed REGARDLESS of amount to avoid double hooks
            t.set(logRefAdmin, {
              transactionId,
              amount,
              referenceCode: referenceCodeSearch,
              invoiceId: invoiceData.id,
              status: isAmountValid ? "success" : "invalid_amount",
              payload: { ...payload, processedAt: new Date().toISOString() },
              createdAt: admin.firestore.Timestamp.now()
            });

            if (invoiceData.status === "pending" && isAmountValid) {
               // Update invoice
               const invoiceRefAdmin = adminDb!.doc(`invoices/${invoiceData.id}`);
               t.update(invoiceRefAdmin, {
                 status: "paid",
                 paidAt: admin.firestore.Timestamp.now(),
                 "paymentDetails.sepayTransactionId": transactionId,
                 "paymentDetails.actualAmount": amount,
                 "paymentDetails.processedVia": "webhook_admin"
               });

               // Wallet update logic
               if (invoiceData.type === "deposit" && invoiceData.userId) {
                 const userRef = adminDb!.doc(`users/${invoiceData.userId}`);
                 const userSnap = await t.get(userRef);
                 const currentBalance = userSnap.exists ? (userSnap.data()?.balance || 0) : 0;
                 
                 t.set(userRef, {
                    balance: currentBalance + invoiceData.totalAmount,
                 }, { merge: true });

                 // Also record in deposits collection
                 const depositId = `DEP_${invoiceData.id}`;
                 t.set(adminDb!.doc(`deposits/${depositId}`), {
                   id: depositId,
                   invoiceId: invoiceData.id,
                   userId: invoiceData.userId,
                   userEmail: invoiceData.userEmail,
                   amount: invoiceData.totalAmount,
                   status: "completed",
                   createdAt: admin.firestore.Timestamp.now()
                 });
               }
               console.log(`[SePay Webhook] Invoice ${invoiceData.id} marked as PAID via Transaction ${transactionId}`);
            } else {
              console.log(`[SePay Webhook] Invoice ${invoiceData.id} NOT PAID: Status=${invoiceData.status}, ValidAmount=${isAmountValid}`);
            }
          });
          processed = true;
        } catch (err: any) {
          console.error("[SePay Webhook] Transaction execution error:", err.message);
        }
      } 
      
      if (!processed && db) {
        const invoiceRef = doc(db, `invoices/${invoiceData.id}`);
        await runTransaction(db, async (t) => {
          const logRef = doc(db, `webhook_logs/${String(transactionId)}`);
          const logSnap = await t.get(logRef);
          
          if (logSnap.exists) {
            return;
          }

          const isAmountValid = amount >= (invoiceData.totalAmount - 500);

          t.set(logRef, {
            payload: { ...payload, processedAt: new Date().toISOString() },
            createdAt: Timestamp.now(),
            validAmount: isAmountValid
          });

          if (invoiceData.status === "pending" && isAmountValid) {
             // Update invoice
             t.update(invoiceRef, {
               status: "paid",
               paidAt: Timestamp.now(),
               "paymentDetails.sepayTransactionId": transactionId,
               "paymentDetails.actualAmount": amount,
               "paymentDetails.processedVia": "webhook_client"
             });

             // Wallet update logic
             if (invoiceData.type === "deposit" && invoiceData.userId) {
               const userRef = doc(db, `users/${invoiceData.userId}`);
               const userSnap = await t.get(userRef);
               const currentBalance = userSnap.exists() ? (userSnap.data()?.balance || 0) : 0;
               
               t.set(userRef, {
                  balance: currentBalance + invoiceData.totalAmount,
               }, { merge: true });

               const depositId = `DEP_${invoiceData.id}`;
               t.set(doc(db, `deposits/${depositId}`), {
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
        });
      }

      res.json({ success: true, invoiceId: invoiceData.id });
    } catch (error: any) {
      console.error("SePay Webhook Error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
        payload: req.body
      });
      res.status(500).json({ 
        error: "Webhook processing failed", 
        details: error.message || String(error),
        code: error.code 
      });
    }
  };

  app.post("/api/webhooks/sepay", handleSepayWebhook);
  app.get("/api/webhooks/sepay", handleSepayWebhook);
  app.post("/hooks/sepay-payment", handleSepayWebhook); // Alias for user's configured URL
  app.get("/hooks/sepay-payment", handleSepayWebhook);

  // Manual confirmation / callback verification endpoint for invoices (checks SePay transactions API)
  app.post("/api/invoices/verify", async (req, res) => {
    const { invoiceId, isSandboxMock } = req.body;
    console.log(`[Invoice Verify] Start: invoiceId=${invoiceId}, Project=${firebaseConfig?.projectId}, DB=${databaseId}`);
    try {
      if (!invoiceId) {
        return res.status(400).json({ error: "Missing invoiceId" });
      }

      let invoiceData;
      let invoiceExists = false;
      
      // 1. Try Admin SDK
      if (adminDb) {
        try {
          console.log(`[Invoice Verify] Attempting Admin SDK lookup for: ${invoiceId}`);
          const invoiceRefAdmin = adminDb.doc(`invoices/${invoiceId}`);
          const invoiceSnap = await invoiceRefAdmin.get();
          if (invoiceSnap.exists) {
            invoiceExists = true;
            invoiceData = invoiceSnap.data();
            console.log(`[Invoice Verify] Admin SDK Found doc: ${invoiceId}`);
          } else {
            console.log(`[Invoice Verify] Admin SDK doc NOT FOUND: ${invoiceId}`);
          }
        } catch (adminErr: any) {
          console.error(`[Invoice Verify] Admin SDK error (non-fatal):`, adminErr.message);
        }
      } 
      
      // 2. Fallback to Client SDK
      if (!invoiceExists && db) {
        try {
          console.log(`[Invoice Verify] Attempting Client SDK lookup for: ${invoiceId}`);
          const invoiceRef = doc(db, `invoices/${invoiceId}`);
          const invoiceSnap = await getDoc(invoiceRef);
          if (invoiceSnap.exists()) {
            invoiceExists = true;
            invoiceData = invoiceSnap.data();
            console.log(`[Invoice Verify] Client SDK Found doc: ${invoiceId}`);
          } else {
             console.log(`[Invoice Verify] Client SDK doc NOT FOUND: ${invoiceId}`);
          }
        } catch (clientErr: any) {
          console.error(`[Invoice Verify] Client SDK error:`, clientErr.message);
        }
      }

      if (!invoiceExists) {
        console.warn(`[Invoice Verify] Invoice NOT FOUND after all attempts: ${invoiceId}`);
        // Log additional info to help user debug
        console.log(`[Invoice Verify] Config used: Project=${firebaseConfig?.projectId}, Database=${databaseId}`);
        return res.status(404).json({ 
          error: "No invoice found", 
          debug: { 
            invoiceId, 
            projectId: firebaseConfig?.projectId, 
            databaseId,
            adminDbReady: !!adminDb,
            clientDbReady: !!db,
            message: "Invoice not found. Please ensure code/description in payment is exactly correct (BmassXXXXXX) and database is correctly configured."
          } 
        });
      }

      if (invoiceData?.status === "paid") {
        return res.json({ success: true, status: "paid", message: "Hóa đơn này đã được xác nhận thanh toán thành công!" });
      }

      const referenceCode = invoiceData?.paymentDetails?.referenceCode || invoiceId;
      const expectedAmount = invoiceData?.totalAmount || 0;

      // 1. Sandbox mock simulation (always available to ease testing/sandbox flow when API or transfers are not ready)
      if (isSandboxMock) {
        if (adminDb) {
          await adminDb.doc(`invoices/${invoiceId}`).update({
            status: "paid",
            paidAt: admin.firestore.Timestamp.now(),
            "paymentDetails.sepayTransactionId": `MOCK_${Math.floor(10000000 + Math.random() * 90000000)}`,
            "paymentDetails.isSandboxMock": true
          });
        } else {
          await updateDoc(doc(db, "invoices", invoiceId), {
            status: "paid",
            paidAt: Timestamp.now(),
            "paymentDetails.sepayTransactionId": `MOCK_${Math.floor(10000000 + Math.random() * 90000000)}`,
            "paymentDetails.isSandboxMock": true
          });
        }
        await updateWalletOnPayment(invoiceData);
        return res.json({ success: true, status: "paid", message: "Duyệt giao dịch mô phỏng nâng cao thành công!" });
      }

      // 2. Query SePay API to fetch latest bank transactions in real-time
      const sepayApiKey = process.env.SEPAY_API_KEY;
      if (sepayApiKey && (db || adminDb)) {
        let sysSnap = null;
        if (db) {
          try {
            sysSnap = await getDoc(doc(db, "settings/system"));
          } catch (e) {
            console.warn("Failed to get system settings via client SDK:", e);
          }
        }
        
        const bankingConfig = sysSnap?.exists() ? sysSnap.data()?.bankingConfig : null;
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
              // Allow a small margin for bank fees or rounding
              const amountMatches = amount >= (expectedAmount - 500);

              return (codeInContent || codeMatches) && amountMatches;
            });

            if (matchedTx) {
              const transactionId = matchedTx.id || matchedTx.transactionId;

              if (adminDb) {
                const logRef = adminDb.doc(`webhook_logs/${String(transactionId)}`);
                await logRef.set({
                  payload: matchedTx,
                  createdAt: admin.firestore.Timestamp.now(),
                  manualCheck: true
                });

                const invoiceRefAdmin = adminDb.doc(`invoices/${invoiceId}`);
                await invoiceRefAdmin.update({
                  status: "paid",
                  paidAt: admin.firestore.Timestamp.now(),
                  "paymentDetails.sepayTransactionId": transactionId,
                  "paymentDetails.actualAmount": Number(matchedTx.amount_in || matchedTx.transferAmount || matchedTx.amount || 0),
                  "paymentDetails.actualSource": "sepay_api_manual_check"
                });
              } else {
                const logRef = doc(db, `webhook_logs/${String(transactionId)}`);
                await setDoc(logRef, {
                  payload: matchedTx,
                  createdAt: Timestamp.now(),
                  manualCheck: true
                });

                await updateDoc(doc(db, "invoices", invoiceId), {
                  status: "paid",
                  paidAt: Timestamp.now(),
                  "paymentDetails.sepayTransactionId": transactionId,
                  "paymentDetails.actualAmount": Number(matchedTx.amount_in || matchedTx.transferAmount || matchedTx.amount || 0),
                  "paymentDetails.actualSource": "sepay_api_manual_check"
                });
              }

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
      const errMsg = error.message || String(error);
      const errStack = error.stack || "";
      console.error("Manual verify action error:", errMsg, errStack);
      res.status(500).json({ 
        error: "Lỗi kiểm tra hóa đơn: " + errMsg,
        debug: { stack: errStack.split('\n').slice(0, 3) }
      });
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
        await updateDoc(doc(db, `users/${uid}`), {
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
    app.get('*all', (req, res, next) => {
      // Don't intercept API or webhook routes
      if (req.path.startsWith('/api/') || req.path.startsWith('/hooks/')) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
  }

  startServer().catch(err => {
    console.error("Fatal startup error:", err);
    process.exit(1);
  });
