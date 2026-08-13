import { initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  indexedDBLocalPersistence,
  setPersistence,
} from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "demo-okey-online";
const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true"
  || !import.meta.env.VITE_FIREBASE_PROJECT_ID;

const app = initializeApp({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || `http://127.0.0.1:9000?ns=${projectId}-default-rtdb`,
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.appspot.com`,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "000000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:000000000000:web:demo",
});

export const auth = getAuth(app);
export const database = getDatabase(app);
export { useEmulators };

void setPersistence(auth, indexedDBLocalPersistence);

if (useEmulators) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectDatabaseEmulator(database, "127.0.0.1", 9000);
}
