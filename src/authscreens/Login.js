import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';
// import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';

export default function Login({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [role, setRole] = useState('');

    const handleLogin = async () => {
        try {
            const userCredential = await signInWithEmailAndPassword(FIREBASE_AUTH, email, password);
            const user = userCredential.user;

            if (user.emailVerified) {
                console.log('User is successfully logged in');

                // Fetch user role from Firestore
                const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
                if (userDoc.exists()) {
                    const userRole = userDoc.data().role;
                    setRole(userRole);

                    // Navigate based on role
                    if (userRole === 'admin') {
                        navigation.navigate('Admin');
                    } else {
                        navigation.navigate('Dashboard');
                    }

                    setMessage('You have successfully logged in');
                    setMessageType('success');
                } else {
                    setMessage('Error retrieving user data');
                    setMessageType('error');
                }
            } else {
                setMessage('Please verify your email address before logging in.');
                setMessageType('error');
                await sendEmailVerification(user);
            }
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setMessage('Error logging in: User not found');
                setMessageType('error');
            } else {
                setMessage('Email or Password is incorrect. Ensure email is in the correct format and password is entered correctly');
                setMessageType('error');
            }
        }
    };

    // GoogleSignin.configure({
    //     webClientId: "YOUR_WEB_CLIENT_ID",  // Replace with your Firebase Web Client ID
    // });

    // const handleGoogleSignIn = async () => {
    //     try {
    //         await GoogleSignin.hasPlayServices();
    //         const { idToken } = await GoogleSignin.signIn();

    //         // Create a Google credential with the token
    //         const googleCredential = GoogleAuthProvider.credential(idToken);

    //         // Sign-in the user with Firebase authentication
    //         const userCredential = await signInWithCredential(FIREBASE_AUTH, googleCredential);
    //         const user = userCredential.user;

    //         console.log('User signed in with Google:', user);

    //         // Check if the user exists in Firestore
    //         const userDocRef = doc(FIRESTORE_DB, 'users', user.uid);
    //         const userDoc = await getDoc(userDocRef);

    //         let userRole = 'user'; // Default role

    //         if (userDoc.exists()) {
    //             userRole = userDoc.data().role;
    //         } else {
    //             // New user, set up Firestore data
    //             await setDoc(userDocRef, {
    //                 uid: user.uid,
    //                 email: user.email,
    //                 displayName: user.displayName,
    //                 role: userRole, // Default role
    //                 createdAt: new Date().toISOString()
    //             });
    //         }

    //         // Navigate based on role
    //         if (userRole === 'admin') {
    //             navigation.navigate('Admin');
    //         } else {
    //             navigation.navigate('Dashboard');
    //         }

    //     } catch (error) {
    //         console.error('Google Sign In Error:', error);
    //         setMessage('Failed to sign in with Google');
    //         setMessageType('error');
    //     }
    // };

    return (
        <View style={styles.container}>
            <Image
                source={require('../../images/UCS logo.png')}
                style={styles.logo}
            />
            <Text style={styles.title}>Login</Text>

            {message ? (
                <View style={[styles.messageBox, messageType === 'success' ? styles.successBox : styles.errorBox]}>
                    <Text style={styles.message}>{message}</Text>
                </View>
            ) : null}

            <TextInput
                style={styles.input}
                placeholder="Enter Your Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter Your Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                />
                <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                    <Ionicons
                        name={passwordVisible ? 'eye-off' : 'eye'}
                        size={24}
                        color="gray"
                        style={styles.eyeIcon}
                    />
                </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
                <Button title="Log In" onPress={handleLogin} />
            </View>
            {/* <Text style={styles.orText}>________________ Or With ________________</Text> */}
            {/* <View style={styles.buttonContainer}>
                <Button title="Signin with Google" onPress={() => {}} /> */}
                    {/* {handleGoogleSignIn} */}
            {/* </View> */}

            <Text style={styles.footerText}>
                Don't have an account yet?
                <Text onPress={() => navigation.navigate('SignUp')} style={styles.signUpLink}> Sign Up</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 25,
        alignItems: 'center',
        padding: 16,
    },

    title: {
        fontSize: 24,
        marginBottom: 50,
        textAlign: 'center',
        fontWeight: 'bold',
        fontFamily: 'Arial',
        marginTop: 20,
    },

    logo: {
        marginTop: 10,
        width: 125,
        height: 50,
        marginBottom: 20,
        alignSelf: 'center'
    },

    input: {
        borderWidth: 1,
        padding: 10,
        marginTop: -20,
        marginBottom: 20,
        borderRadius: 10,
        width: '90%',
        alignSelf: 'center',
    },

    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 10,
        width: '90%',
        alignSelf: 'center',
        paddingRight: 10, 
        marginBottom: 20,
    },

    passwordInput: {
        flex: 1,
        padding: 10,
    },

    eyeIcon: {
        paddingHorizontal: 5,
    },

    buttonContainer: {
        width: '80%',
        height: 50,
        marginBottom: 10,
        marginTop: 10,
        justifyContent: 'center',
        alignSelf: 'center',
    },

    messageBox: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 20,
        alignSelf: 'center',
        width: '90%',
    },
  
    successBox: {
        backgroundColor: 'rgba(0, 255, 0, 0.2)',
    },
  
    errorBox: {
        backgroundColor: 'rgba(255, 0, 0, 0.2)',
    },
  
    message: {
        textAlign: 'center',
        color: '#000',
    },

    footerText: {
        textAlign: 'center',
        marginTop: 16,
    },

    signUpLink: {
        color: 'darkblue',
    },
});
