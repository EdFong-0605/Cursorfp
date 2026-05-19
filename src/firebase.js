// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserSessionPersistence,
} from "firebase/auth";
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
// (Function meaning): `getAuth` creates the sign-in service tied to this Firebase app so other files can log users in or out.
const auth = getAuth(app);
// (Function meaning): `setPersistence` with `browserSessionPersistence` keeps you signed in on refresh but clears login when the tab or browser closes (not long-term local storage).
// (External references): [AuthContext.js] waits for `authPersistenceReady` before `onAuthStateChanged`.
export const authPersistenceReady = setPersistence(auth, browserSessionPersistence);
// (Function meaning): `getFunctions` creates the Cloud Functions client so the app can call your Python backend in [functions/main.py].
const functions = getFunctions(app);

// (Function meaning): Emulators only in `npm start` (development), never in `npm run build` / Firebase Hosting — so production uses the same real Auth as the cloud.
const isLocalDev = process.env.NODE_ENV === "development";
if (
  isLocalDev &&
  (window.location.hostname === "localhost" || process.env.REACT_APP_ENV === "local")
) {
  connectFunctionsEmulator(functions, "localhost", 5001);
}
// (Function meaning): Auth emulator only when developing locally AND `.env.development.local` sets REACT_APP_ENV=local.
if (isLocalDev && process.env.REACT_APP_ENV === "local") {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
}

export {
  app,
  analytics,
  auth,
  functions,
};
