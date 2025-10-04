// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.Firebase_API_Key,
  authDomain: "kars-interview-ai.firebaseapp.com",
  projectId: "kars-interview-ai",
  storageBucket: "kars-interview-ai.firebasestorage.app",
  messagingSenderId: "842178376915",
  appId: "1:842178376915:web:17b72ced5bbc05ab7c9026",
  measurementId: "G-EXRYXC4EYH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const auth = getAuth(app);

export const db = getFirestore(app);