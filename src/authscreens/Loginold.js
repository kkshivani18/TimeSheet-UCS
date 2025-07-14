import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_APP, FIRESTORE_DB } from '../firebaseConfig';
import { signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [role, setRole] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);

    const navigation = useNavigation();

    const handleLogin = async () => {
        if (!FIREBASE_AUTH) {
            console.log('FIREBASE_AUTH is undefined');
            setMessage('Authentication service not initialized');
            setMessageType('error');
            return;
        }
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
                        navigation.replace('Admin');
                    } else {
                        navigation.replace('Dashboard');
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
            console.log('Login error:', error);
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                setMessage('Error logging in: User not found');
                setMessageType('error');
            } else {
                setMessage('Please check your Email and Password ');
                setMessageType('error');
            }
        }
    };

    const handleForgotPassword = async () => {
        if (!resetEmail) {
            setMessage('Please enter your email to reset password');
            setMessageType('error');
            return;
        }
        try {
            await sendPasswordResetEmail(FIREBASE_AUTH, resetEmail);
            setMessage('Password reset email sent. Check your inbox.');
            setMessageType('success');
            setResetEmail(''); 
        } catch (error) {
            console.log('Forgot password error:', error);
            setMessage('Error sending reset email. Check your email address.');
            setMessageType('error');
        }
    };

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
                placeholderTextColor="#000000"
                autoCapitalize='none'
            />

            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter Your Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    placeholderTextColor="#000000"
                    autoCapitalize='none'
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
            
            <View style={styles.forgotPasswordContainer}>
                <Text
                    style={[styles.forgotpasswordText, styles.signUpLink]}
                    onPress={() => setForgotPasswordModalVisible(true)}
                >
                    Forgot Password?
                </Text>
            </View>

            <Modal
                visible={forgotPasswordModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setForgotPasswordModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
                        <TextInput
                            style={styles.emailInput}
                            placeholder="Enter your email"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            placeholderTextColor="#000000"
                        />
                        <View style={styles.modalButtonRow}>
                            <Button
                                title="Send Reset Link"
                                onPress={async () => {
                                    await handleForgotPassword();
                                    setForgotPasswordModalVisible(false);
                                    setResetEmail('');
                                }}
                            />
                            <Button
                                title="Cancel"
                                color="gray"
                                onPress={() => setForgotPasswordModalVisible(false)}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.buttonContainer}>
                <Button title="Log In" onPress={handleLogin} />
            </View>

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
        color: '#000000',
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
        color: '#000000',
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

    forgotpasswordText: {
        textAlign: 'right',
        marginTop: -2,
    },

    forgotPasswordContainer: {
        width: '90%',
        alignSelf: 'center',
        alignItems: 'flex-end',
        marginTop: -10, 
        marginBottom: 10,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalContent: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '85%',
        alignItems: 'center',
    },

    modalTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 10,
    },

    emailInput: {
        borderWidth: 1,
        padding: 10,
        marginTop: 2,
        marginBottom: 20,
        borderRadius: 10,
        width: '90%',
        alignSelf: 'center',
        color: '#000000',
    },

    modalButtonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 5,
        gap: 10,
    },

    signUpLink: {
        color: 'darkblue',
    },
});
