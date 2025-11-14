import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD8uGqzqokt3i354ZgBZoZb5TywYwhGG_E",
  authDomain: "ksdiv-3ba17.firebaseapp.com",
  projectId: "ksdiv-3ba17",
  storageBucket: "ksdiv-3ba17.appspot.com",
  messagingSenderId: "672014659899",
  appId: "1:672014659899:web:106b0385022b8e1f79471e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

export { auth, db };
