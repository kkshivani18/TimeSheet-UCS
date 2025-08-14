import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Image, Modal, Platform, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin, User, statusCodes, isErrorWithCode, isSuccessResponse, isNoSavedCredentialFoundResponse} from "@react-native-google-signin/google-signin";
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import * as AuthSession from 'expo-auth-session';
import {WEB_CLIENT_ID, ANDROID_CLIENT_ID} from '@env';
import { makeRedirectUri } from 'expo-auth-session';

GoogleSignin.configure({
  webClientId: WEB_CLIENT_ID,
  offlineAccess: true
});

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [role, setRole] = useState('');
    const [resetEmail, setResetEmail] = useState('');
    const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [userData, setUserData] = useState(null);

    const navigation = useNavigation();

    const handleLogin = async () => {
        try {
            setLoading(true);
            const response = await axios.post(`http://localhost:3000/api/user/login`, { email, password });
            const { token, userId, role, username } = response.data;
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userId', userId);
            await AsyncStorage.setItem('username', username);
            await AsyncStorage.setItem('role', role);

            console.log('Login successful. role:', role);

            // navigation based on role
            if (role === 'admin') {
                navigation.replace('Admin');
            } else {
                navigation.replace('Dashboard');
                console.log("done via mongodb and jwt")
            }
        } catch (error) {
            setMessage(error.response?.data?.message || 'Login failed. Please try again.');
            setMessageType('error');
        } finally {
            setLoading(false);
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

    // web google oauth
    const [request, response, promptAsync] = Google.useAuthRequest({
        androidClientId: ANDROID_CLIENT_ID,
        webClientId: WEB_CLIENT_ID,
        redirectUri: AuthSession.makeRedirectUri({ useProxy: true }),
        responseType: 'token',
        scopes: ['profile', 'email']
    });

    if (Platform.OS === 'web') {
            WebBrowser.maybeCompleteAuthSession({
                skipRedirectCheck: true,
                options: {
                    path: '/_oauth/google',
                },
        });
    }

    const handleGoogleSignIn = async () => {
    try {
        setLoading(true);

        if (!request) {
            throw new Error('Google Auth request was not initialized');
        }

        const result = await promptAsync();
        
        if (Platform.OS === 'web') {
            // web 
            if (result.type === 'success') {
                const {authentication} = result;
                await handleGoogleAuthSuccess(authentication.accessToken);
            }
        } else {
            // native 
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            await handleGoogleAuthSuccess(userInfo.idToken);
        }
    } catch (error) {
        console.error('Google Sign In Error:', error);
        let errorMessage = 'Sign in failed. Please try again.';
        
        if (isErrorWithCode(error)) {
            switch (error.code) {
                case statusCodes.SIGN_IN_CANCELLED:
                    errorMessage = 'Sign in was cancelled';
                    break;
                case statusCodes.IN_PROGRESS:
                    errorMessage = 'Sign in is already in progress';
                    break;
                case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
                    errorMessage = 'Play Services not available';
                    break;
            }
        }
        
            setMessage(errorMessage);
            setMessageType('error');
        } finally {
            setLoading(false);
        }
    };

    // handle successful Google auth
    const handleGoogleAuthSuccess = async (token) => {
        try {
            // Call your backend with the token
            const response = await axios.post(`http://localhost:3000/api/user/googleauth`, {
                token: token
            });

            const { token: jwtToken, userId, role, username } = response.data;

            // Store user data
            await AsyncStorage.setItem('token', jwtToken);
            await AsyncStorage.setItem('userId', userId);
            await AsyncStorage.setItem('username', username);
            await AsyncStorage.setItem('role', role);

            // Navigate based on role
            navigation.replace(role === 'admin' ? 'Admin' : 'Dashboard');
        } catch (error) {
            console.error('Backend authentication error:', error);
            setMessage('Authentication failed. Please try again.');
            setMessageType('error');
        }
    };

    return (
        <View style={styles.container}>
            <Image source={require('../../images/UCS logo.png')} style={styles.logo} />
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
                autoCapitalize="none"
            />
            <View style={styles.passwordContainer}>
                <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter Your Password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    placeholderTextColor="#000000"
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
                    <Ionicons name={passwordVisible ? 'eye-off' : 'eye'} size={24} color="gray" style={styles.eyeIcon} />
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
            <View>
                <Text>
                    Or
                </Text>
            </View>
            <TouchableOpacity 
                style={[
                    styles.googleButton,
                    loading && styles.disabledButton
                ]}
                onPress={handleGoogleSignIn}
                disabled={loading}
            >
                <View style={styles.googleButtonContent}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#757575" />
                    ) : (
                        <>
                            <Image 
                                source={require('../../images/google-auth.png')} 
                                style={styles.googleIcon} 
                            />
                            <Text style={styles.googleButtonText}>
                                Sign in with Google
                            </Text>
                        </>
                    )}
                </View>
            </TouchableOpacity>
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

    googleButton: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 4,
        padding: 12,
        marginTop: 10,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    googleButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    googleButtonText: {
        color: '#757575',
        fontSize: 16,
        fontWeight: '500',
    },
    disabledButton: {
        opacity: 0.7
    }
});
