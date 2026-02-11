import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAulnZxHMzveNd29RQaxNJs24PYIH38YPw",
  authDomain: "fotolio-7eb14.firebaseapp.com",
  projectId: "fotolio-7eb14",
  storageBucket: "fotolio-7eb14.firebasestorage.app",
  messagingSenderId: "1051022962782",
  appId: "1:1051022962782:web:80439bdf36ca7ce9ee44cf",
  measurementId: "G-5NM59H71EP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);