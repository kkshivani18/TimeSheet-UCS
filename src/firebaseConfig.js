import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiKey,
  AuthDomain,
  ProjectId,
  StorageBucket,
  MessagingSenderId,
  AppId,
  MeasurementId,
} from '@env';

// Detect if running in a React Native environment
const isReactNative = typeof document === 'undefined' || navigator.product === 'ReactNative';

const firebaseConfig = {
  apiKey: ApiKey,
  authDomain: AuthDomain,
  projectId: ProjectId,
  storageBucket: StorageBucket,
  messagingSenderId: MessagingSenderId,
  appId: AppId,
  measurementId: MeasurementId,
};

// Initialize Firebase App
const FIREBASE_APP = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with enhanced handling and validation
let auth;
try {
  console.log('Initializing auth, isReactNative:', isReactNative, 'AsyncStorage available:', !!AsyncStorage);
  if (isReactNative) {
    if (typeof AsyncStorage === 'undefined' || typeof AsyncStorage.setItem !== 'function') {
      console.warn('AsyncStorage is invalid or undefined, falling back to memory persistence');
      auth = getAuth(FIREBASE_APP); // Fallback to memory persistence
    } else {
      auth = initializeAuth(FIREBASE_APP, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } else {
    auth = getAuth(FIREBASE_APP); // Web fallback
  }
  if (auth && auth._canInit === undefined) {
    console.warn('Auth._canInit is undefined, forcing initialization');
    auth = getAuth(FIREBASE_APP); // Reinitialize if _canInit is not set
  }
  console.log('Auth initialized successfully:', auth, 'canInit:', auth?._canInit);
} catch (error) {
  console.error('Firebase auth initialization error:', error.message, error.stack);
  auth = getAuth(FIREBASE_APP); // Fallback
  console.log('Fallback auth initialized:', auth);
}

// Final verification
if (!auth) {
  throw new Error('Auth initialization completely failed');
}

const FIREBASE_AUTH = auth;
const FIRESTORE_DB = getFirestore(FIREBASE_APP);

export { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB };




// import { initializeApp, getApps, getApp } from 'firebase/app';
// import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
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

// // Detect if running in a React Native environment
// const isReactNative = typeof document === 'undefined' || navigator.product === 'ReactNative';

// const firebaseConfig = {
//   apiKey: ApiKey,
//   authDomain: AuthDomain,
//   projectId: ProjectId,
//   storageBucket: StorageBucket,
//   messagingSenderId: MessagingSenderId,
//   appId: AppId,
//   measurementId: MeasurementId,
// };

// // Initialize Firebase App
// const FIREBASE_APP = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// // Initialize Auth
// let auth;
// try {
//   if (isReactNative) {
//     auth = initializeAuth(FIREBASE_APP, {
//       persistence: getReactNativePersistence(ReactNativeAsyncStorage),
//     });
//   } else {
//     // For web, use default auth without persistence
//     auth = getAuth(FIREBASE_APP);
//     // Optionally, import and use browserLocalPersistence for web if persistence is needed
//     // import { browserLocalPersistence } from 'firebase/auth';
//     // auth = initializeAuth(FIREBASE_APP, { persistence: browserLocalPersistence });
//   }
// } catch (error) {
//   if (error.code === 'auth/already-initialized') {
//     auth = getAuth(FIREBASE_APP);
//   } else {
//     console.error("Firebase auth initialization error:", error);
//     auth = getAuth(FIREBASE_APP); // Fallback
//   }
// }

// const FIREBASE_AUTH = auth;
// const FIRESTORE_DB = getFirestore(FIREBASE_APP);

// export { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB };