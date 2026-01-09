import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";



const firebaseConfig = {
  apiKey: "AIzaSyA-feKq7EOEcoxC7S9IE-NUvCgbl581VSg",
  authDomain: "chess-multiplayer-126c0.firebaseapp.com",
  projectId: "chess-multiplayer-126c0",
  storageBucket: "chess-multiplayer-126c0.firebasestorage.app",
  messagingSenderId: "827613432034",
  appId: "1:827613432034:web:e051639c180b4818b9f6bb",
  measurementId: "G-TR0LPHFWWJ"
};



const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);