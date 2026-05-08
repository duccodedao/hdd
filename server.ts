import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import axios from "axios";
import cookieParser from "cookie-parser";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, getDoc, setDoc, query, collection, where, getDocs } from "firebase/firestore";

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

async function getTiktokConfig() {
  try {
    const snap = await getDoc(doc(db, "settings", "tiktok"));
    const data = snap.exists() ? snap.data() : {};
    return {
      clientKey: data.clientKey || process.env.TIKTOK_CLIENT_KEY || "",
      clientSecret: data.clientSecret || process.env.TIKTOK_CLIENT_SECRET || "",
      redirectUri: data.redirectUri || process.env.TIKTOK_REDIRECT_URI || `${process.env.APP_URL}/api/auth/tiktok/callback`,
      enabled: data.enabled !== false
    };
  } catch (e) {
    return {
      clientKey: process.env.TIKTOK_CLIENT_KEY || "",
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || "",
      redirectUri: process.env.TIKTOK_REDIRECT_URI || `${process.env.APP_URL}/api/auth/tiktok/callback`,
      enabled: true
    };
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(cookieParser());

  // TikTok Auth Initiator
  app.get("/api/auth/tiktok", async (req, res) => {
    const config = await getTiktokConfig();
    if (!config.enabled) {
      return res.redirect("/auth?tiktok_status=error&message=TikTok+Login+is+disabled");
    }

    const { uid } = req.query;
    const csrfState = Math.random().toString(36).substring(2);
    
    // Store UID in state to link back
    const state = JSON.stringify({ csrfState, uid: uid || null });
    
    // Max age 10 mins
    res.cookie("tiktok_csrf", csrfState, { maxAge: 600000, httpOnly: true });

    let url = "https://www.tiktok.com/v2/auth/authorize/";
    url += `?client_key=${config.clientKey}`;
    url += "&scope=user.info.basic";
    url += "&response_type=code";
    url += `&redirect_uri=${encodeURIComponent(config.redirectUri)}`;
    url += `&state=${encodeURIComponent(state)}`;

    res.redirect(url);
  });

  // TikTok Callback
  app.get("/api/auth/tiktok/callback", async (req, res) => {
    const config = await getTiktokConfig();
    const { code, state: stateStr, error } = req.query;
    const cookieState = req.cookies.tiktok_csrf;

    if (error) {
      return res.redirect("/profile?tiktok_status=error&message=" + encodeURIComponent(error as string));
    }

    try {
      const stateObj = JSON.parse(stateStr as string);
      if (stateObj.csrfState !== cookieState) {
        throw new Error("Invalid CSRF state");
      }

      // 1. Exchange code for access token
      const tokenResponse = await axios.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        new URLSearchParams({
          client_key: config.clientKey,
          client_secret: config.clientSecret,
          code: code as string,
          grant_type: "authorization_code",
          redirect_uri: config.redirectUri,
        }).toString(),
        {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }
      );

      const { access_token, open_id } = tokenResponse.data;

      // 2. Fetch User Info
      const userResponse = await axios.get(
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url_100,username",
        {
          headers: { Authorization: `Bearer ${access_token}` },
        }
      );

      const tiktokUser = userResponse.data.data.user;
      
      const tiktokData = {
        id: tiktokUser.open_id,
        username: tiktokUser.username,
        displayName: tiktokUser.display_name,
        avatar: tiktokUser.avatar_url_100
      };

      // 3. Link or Login
      let targetUid = stateObj.uid;

      if (!targetUid) {
        // Find existing user by tiktok id
        const q = query(collection(db, "users"), where("socialLinks.tiktok.id", "==", tiktokData.id));
        const snap = await getDocs(q);
        if (!snap.empty) {
          targetUid = snap.docs[0].id;
        }
      }

      if (targetUid) {
        // Update user document
        const userRef = doc(db, "users", targetUid);
        await updateDoc(userRef, {
          "socialLinks.tiktok": tiktokData
        });
        
        // Clear cookie
        res.clearCookie("tiktok_csrf");
        
        // Redirect back to profile
        res.redirect("/profile?tiktok_status=success");
      } else {
        // No user found and no UID provided (Login attempt without account)
        // In a real app, you might want to create an account or return a token
        res.redirect("/auth?tiktok_status=unlinked&tiktok_data=" + encodeURIComponent(JSON.stringify(tiktokData)));
      }

    } catch (err: any) {
      console.error("TikTok Auth Error:", err.response?.data || err.message);
      res.redirect("/profile?tiktok_status=error&message=Authentication+failed");
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
