import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Firebase Console se apni configuration yahan daal raha hu
const firebaseConfig = {
  apiKey: "AIzaSyBFjO26OVdN7lR5L95ExlInZHFf_cufUjM",
  authDomain: "ai-powered-voice.firebaseapp.com",
  projectId: "ai-powered-voice",
  appId: "1:311202371138:web:55083e342bd75929827fdb",
};

// Firebase application initialize kar raha hu
const app = initializeApp(firebaseConfig);

// Authentication setup karna
export const auth = getAuth(app);

// Google login provider
export const googleProvider = new GoogleAuthProvider();
