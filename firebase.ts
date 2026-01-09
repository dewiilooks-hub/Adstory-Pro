import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDLNjpvOL4VMLUCmJ-LuhXsvUFmMhgIw7Q",
  authDomain: "adstory-pro-v1-0.firebaseapp.com",
  projectId: "adstory-pro-v1-0",
  storageBucket: "adstory-pro-v1-0.firebasestorage.app",
  messagingSenderId: "170878714200",
  appId: "1:170878714200:web:291c046ebb23f00558a52d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
