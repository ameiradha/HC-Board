// Safe, lazy-loaded and offline-resilient Firebase Integration service.
// This supports Google Sign-In and Guest Mode, falling back to clean localStorage if config is missing.

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

let firebaseApp: any = null;
let database: any = null;
let firebaseAuth: any = null;
let isConfigured = false;

// Attempt to load and initialize Firebase dynamically if configured in the environment
export async function tryInitializeFirebase(): Promise<boolean> {
  try {
    // Dynamic fetch check of config to prevent Vite build errors when file doesn't exist yet
    const response = await fetch("/firebase-applet-config.json").catch(() => null);
    if (response && response.ok) {
      const config = await response.json();
      if (config && config.apiKey) {
        firebaseApp = initializeApp(config);
        database = getFirestore(firebaseApp, config.firestoreDatabaseId);
        firebaseAuth = getAuth(firebaseApp);
        isConfigured = true;
        console.log("Firebase Auth & Firestore dikonfigurasikan dengan lancar.");
        return true;
      }
    }
  } catch (e) {
    console.warn("Gagal inisialisasi Firebase. Menggunakan Guest Mode local.");
  }
  return false;
}

export { database as db, firebaseAuth as auth, isConfigured };

export const googleAuthProvider = new GoogleAuthProvider();

export async function loginWithGoogle(): Promise<any> {
  if (!firebaseAuth) {
    throw new Error("Sistem log masuk Firebase belum dimuatkan. Sila gunakan Guest Mode.");
  }
  try {
    const result = await signInWithPopup(firebaseAuth, googleAuthProvider);
    return result.user;
  } catch (error) {
    console.error("Firebase Auth Error:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}
