import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCs0CyoiagFHt79fi_CvAUBUi0YZBqEuzE",
  authDomain: "turf-booking-8deb5.firebaseapp.com",
  projectId: "turf-booking-8deb5",
  storageBucket: "turf-booking-8deb5.appspot.com",
  messagingSenderId: "785926962388",
  appId: "1:785926962388:web:919323b9ffddaa52bc8f41",
  measurementId: "G-6FVWNV1S05"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider(); 
export const db = getFirestore(app);

