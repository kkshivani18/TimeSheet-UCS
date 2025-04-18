import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity, Alert } from 'react-native';
import { FIREBASE_AUTH,FIRESTORE_DB } from '../firebaseConfig';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Ionicons } from "@expo/vector-icons";
import { doc, setDoc } from 'firebase/firestore';
// import * as Font from 'expo-font';

export default function SignUp({ navigation }) {

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const validatePassword = (password) => {
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        return passwordRegex.test(password);
    };

    const handleSignUp = async () => {
        try {
            setLoading(true);

            if (username === '') {
                setMessage('Please enter your username');
                setMessageType('error');
                return;
            }

            if (!validateEmail(email)) {
                setMessage('Please provide a valid email address.');
                setMessageType('error');
                return;
            }

            if (!validatePassword(password)) {
                setMessage('Password must have at least: \n - 1 capital letter \n - 1 small letter \n - 1 number \n - 1 special character \n - 8 characters long password');
                setMessageType('error');
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(
                FIREBASE_AUTH,
                email,
                password
            );

            // Create user document with role
            await setDoc(doc(FIRESTORE_DB, 'users', userCredential.user.uid), {
                username: username,
                email: email.toLowerCase(),
                role: 'user',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            setMessage('Success', 'Account created successfully!');
            setMessageType('success');
            navigation.navigate('Authentication', { email: userCredential.user.email });
        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={require('../../images/UCS logo.png')}
                    style={styles.logo}
                />
            </View>

            <Text style={styles.title}>Create an account</Text>

            {message ? (
                <View style={[styles.messageBox, messageType === 'success' ? styles.successBox : styles.errorBox]}>
                    <Text style={styles.message}>{message}</Text>
                </View>
            ) : null}

            <TextInput
                style={styles.input}
                placeholder="Enter Your Username"
                value={username}
                onChangeText={setUsername}
            />

            <TextInput
                style={styles.input}
                placeholder="Enter Your Email"
                value={email}
                onChangeText={setEmail}
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
                <Button title="Sign Up" onPress={handleSignUp} />
            </View>

            <Text style={styles.footerText}>
                Already have an account?
                <Text onPress={() => navigation.navigate('Login')} style={styles.loginLink}> Login</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "flex-start",
        padding: 16,
        marginTop: 30,
    },

    header: {
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    logo: {
        width: 125,
        height: 50,
        marginBottom: 20,
        alignSelf: 'center'
    },

    title: {
        fontSize: 24,
        fontWeight: "bold",
        fontFamily: "Arial",
        alignSelf: 'center',
        marginBottom: 15,
    },

    input: {
        borderWidth: 1,
        padding: 8,
        marginBottom: 26,
        borderRadius: 10,
        width: '90%',
        alignSelf: 'center'
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
        backgroundColor: 'rgba(0, 255, 0, 0.2)', // Translucent green
    },

    errorBox: {
        backgroundColor: 'rgba(255, 0, 0, 0.2)', // Translucent red
    },

    message: {
        textAlign: 'center',
        color: '#000',
    },

    orText: {
        textAlign: 'center',
        marginVertical: 16,
        fontWeight: "bold",
        fontSize: 15,
    },

    footerText: {
        textAlign: 'center',
        marginTop: 16,
    },

    loginLink: {
        color: 'darkblue',
    },
});
