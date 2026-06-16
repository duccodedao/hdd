import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";
// @ts-ignore
import configFromFile from "../../firebase-applet-config.json";

const config: any = configFromFile || {};

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || config.apiKey || "AIzaSyCXAxmprEv9fF-P-1lLpUzykkxG4HjDVI4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || config.authDomain || "sonlyhongduc-ca6d6.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || config.projectId || "sonlyhongduc-ca6d6",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || config.storageBucket || "sonlyhongduc-ca6d6.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || config.messagingSenderId || "757658501532",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || config.appId || "1:757658501532:web:08c87ad6c041e0bc140859",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || config.measurementId || "G-GXHCCW2KMH",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || config.firestoreDatabaseId || "main"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics conditionally (only in browser)
export const analytics = typeof window !== 'undefined' ? (async () => {
  if (await isSupported()) {
    return getAnalytics(app);
  }
  return null;
})() : Promise.resolve(null);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
