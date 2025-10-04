// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB8_dvrj05uAq2r66u9WDTABYadPFpE0l4",
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