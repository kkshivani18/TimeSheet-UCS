import { initializeApp, getApps, getApp } from 'firebase/app';
import {getAuth, initializeAuth, getReactNativePersistence} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  ApiKey,
  AuthDomain,
  ProjectId,
  StorageBucket,
  MessagingSenderId,
  AppId,
  MeasurementId,
} from '@env';

// Make sure all env vars are loaded
if (!ApiKey || !AuthDomain || !ProjectId || !StorageBucket ||
  !MessagingSenderId || !AppId || !MeasurementId
) {
  console.warn('Firebase config values are missing from .env file');
}

// Firebase config
const firebaseConfig = {
  apiKey: ApiKey,
  authDomain: AuthDomain,
  projectId: ProjectId,
  storageBucket: StorageBucket,
  messagingSenderId: MessagingSenderId,
  appId: AppId,
  measurementId: MeasurementId,
};

const FIREBASE_APP = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

let FIREBASE_AUTH;
if (Platform.OS === 'web') {
  FIREBASE_AUTH = getAuth(FIREBASE_APP); 
} else {
  // Native: use persistence
  FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

const FIRESTORE_DB = getFirestore(FIREBASE_APP);

export { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB };



// new but auth error 

// // Initialize app (singleton)
// const FIREBASE_APP = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// // Initialize Auth with AsyncStorage persistence
// let FIREBASE_AUTH;
// try {
//   FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
//     persistence: getReactNativePersistence(ReactNativeAsyncStorage),
//   });
// } catch (error) {
//   // Already initialized
//   FIREBASE_AUTH = getAuth(FIREBASE_APP);
// }

// // Initialize Firestore
// const FIRESTORE_DB = getFirestore(FIREBASE_APP);

// export { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB };





// previous

// import { initializeApp, getApps, getApp } from 'firebase/app';
// import {getAuth, initializeAuth, getReactNativePersistence,} from 'firebase/auth';
// import { getFirestore } from 'firebase/firestore';
// import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   ApiKey,
//   AuthDomain,
//   ProjectId,
//   StorageBucket,
//   MessagingSenderId,
//   AppId,
//   MeasurementId,
// } from '@env';

// const firebaseConfig = {
//   apiKey: ApiKey,
//   authDomain: AuthDomain,
//   projectId: ProjectId,
//   storageBucket: StorageBucket,
//   messagingSenderId: MessagingSenderId,
//   appId: AppId,
//   measurementId: MeasurementId,
// };

// // Get existing app or initialize
// const FIREBASE_APP = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// // Auth initialization with safe singleton check
// let FIREBASE_AUTH;
// try {
//   FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
//     persistence: getReactNativePersistence(ReactNativeAsyncStorage),
//   });
// } catch (error) {
//   // This happens if auth is already initialized
//   FIREBASE_AUTH = getAuth(FIREBASE_APP);
// }

// const FIRESTORE_DB = getFirestore(FIREBASE_APP);

// export { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB };





// import { initializeApp } from "firebase/app";
// import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
// import {
//   ApiKey,
//   AuthDomain,
//   ProjectId,
//   StorageBucket,
//   MessagingSenderId,
//   AppId,
//   MeasurementId
// } from '@env';

// const firebaseConfig = {
//   apiKey: ApiKey,
//   authDomain: AuthDomain,
//   projectId: ProjectId,
//   storageBucket: StorageBucket,
//   messagingSenderId: MessagingSenderId,
//   appId: AppId,
//   measurementId: MeasurementId
// };

// // Initialize Firebase
// export const FIREBASE_APP = initializeApp(firebaseConfig);

// // Initialize Firebase Auth with AsyncStorage
// let FIREBASE_AUTH;
// try {
//   // Try to use initializeAuth with persistence first
//   FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
//     persistence: getReactNativePersistence(ReactNativeAsyncStorage)
//   });
// } catch (error) {
//   // Fall back to getAuth if initializeAuth fails
//   console.log("Auth initialization with persistence failed, falling back to default:", error);
//   FIREBASE_AUTH = getAuth(FIREBASE_APP);
// }

// export { FIREBASE_AUTH };
// export const FIRESTORE_DB = getFirestore(FIREBASE_APP);

// // const analytics = getAnalytics(app);
