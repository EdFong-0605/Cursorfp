// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

console.log("[Firebase] REACT_APP_FIREBASE_API_KEY", process.env.REACT_APP_FIREBASE_API_KEY);
console.log("[Firebase] REACT_APP_FIREBASE_AUTH_DOMAIN", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
console.log("[Firebase] REACT_APP_FIREBASE_PROJECT_ID", process.env.REACT_APP_FIREBASE_PROJECT_ID);
console.log("[Firebase] REACT_APP_FIREBASE_STORAGE_BUCKET", process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
console.log("[Firebase] REACT_APP_FIREBASE_MESSAGING_SENDER_ID", process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
console.log("[Firebase] REACT_APP_FIREBASE_APP_ID", process.env.REACT_APP_FIREBASE_APP_ID);
console.log("[Firebase] REACT_APP_FIREBASE_MEASUREMENT_ID", process.env.REACT_APP_FIREBASE_MEASUREMENT_ID);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Connect to Functions emulator if in local development
if (
  window.location.hostname === "localhost" || 
  process.env.react_app_env === "local"
) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
 // export whatever you need elsewhere  

export { 
  app,
  analytics,
  functions
  //plus any other exports you need elsewhere
};
