import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyBY187ZU2P7kCuirqRO-mkeIlZi6hpDBLo",
  authDomain: "ferry-booking-853b4.firebaseapp.com",
  projectId: "ferry-booking-853b4",
  storageBucket: "ferry-booking-853b4.firebasestorage.app",
  messagingSenderId: "719783190481",
  appId: "1:719783190481:web:496f21e8a07064b1214af0",
  measurementId: "G-J4LX81P5K8"
};


const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);