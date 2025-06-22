import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { FIREBASE_APP, FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';

export default function FirebaseInitializer({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeFirebase = async () => {
      try {
        // Check if Firebase Auth is initialized
        if (!FIREBASE_AUTH) {
          throw new Error('Firebase Auth is not initialized');
        }

        // Check if Firestore is initialized
        if (!FIRESTORE_DB) {
          throw new Error('Firestore is not initialized');
        }

        // If we get here, Firebase is initialized
        console.log('Firebase successfully initialized');
        setIsInitialized(true);
      } catch (err) {
        console.error('Firebase initialization error:', err);
        setError(err.message);
      }
    };

    initializeFirebase();
  }, []);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Firebase initialization error: {error}</Text>
      </View>
    );
  }

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing app...</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
    padding: 20,
  },
});