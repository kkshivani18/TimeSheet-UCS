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

try {
  if (Platform.OS === 'web') {
    FIREBASE_AUTH = getAuth(FIREBASE_APP);
} else {
    FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
    }
  } catch (error) {
    FIREBASE_AUTH = getAuth(FIREBASE_APP);
  }

// if (Platform.OS === 'web') {
//   FIREBASE_AUTH = getAuth(FIREBASE_APP); 
// } else {
//   // Native: use persistence
//   FIREBASE_AUTH = initializeAuth(FIREBASE_APP, {
//     persistence: getReactNativePersistence(ReactNativeAsyncStorage),
//   });
// }

const FIRESTORE_DB = getFirestore(FIREBASE_APP);

export { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB };