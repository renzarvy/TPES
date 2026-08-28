/**
 * Application configuration module
 * Handles environment variables and provides structured access to Firebase keys.
 */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

const DEFAULT_FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0372082836",
  appId: "1:456768297704:web:5339d93e2de9c15ae4875d",
  apiKey: "AIzaSyA96ndEVo6VtkuR6hiq06MxY0fUjc4FkDM",
  authDomain: "gen-lang-client-0372082836.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-teachersperforma-7a1e0d4d-1763-4527-ab13-75d5859eb3ca",
  storageBucket: "gen-lang-client-0372082836.firebasestorage.app",
  messagingSenderId: "456768297704",
  measurementId: "",
};

export const firebaseConfig: FirebaseClientConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || DEFAULT_FIREBASE_CONFIG.measurementId,
};

export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME || "Teacher's Performance Evaluation System",
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === "true",
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
};
