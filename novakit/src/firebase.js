import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:"AIzaSyDVGWamBKS8r6kjOCoEQkLqgH9yvNRUqaI",
  authDomain:"novakit-5430f.firebaseapp.com",
  projectId:"novakit-5430f",
  storageBucket: "novakit-5430f.firebasestorage.app",
  messagingSenderId:  "1019754888988",
  appId:"1:1019754888988:web:fb9d061976d038aed2c4d9",
};

const missingConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingConfig.length) {
  throw new Error(
    `Missing Firebase configuration: ${missingConfig.join(", ")}. Copy .env.example to .env.local and fill in the values.`
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
