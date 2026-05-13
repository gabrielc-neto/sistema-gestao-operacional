import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBUZdqVSvcoHhnSYNK1edtpbJ1_xfQ-DTU",
  authDomain: "pontual-logistica.firebaseapp.com",
  projectId: "pontual-logistica",
  storageBucket: "pontual-logistica.firebasestorage.app",
  messagingSenderId: "814273518229",
  appId: "1:814273518229:web:dba7d5869edfb055d6999c",
  measurementId: "G-3XYB5FR8SH"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);
export default app;
