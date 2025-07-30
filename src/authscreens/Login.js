import React, { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Image, Modal } from 'react-native';
import axios from 'axios'; 
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// const { userLoginSchema } = require('../backend/models/user.zod')
const API_URL = 'http://127.0.0.1:3000/api/user'

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

    const navigation = useNavigation();

    const handleLogin = async () => {
        try {
            setLoading(true);
            const response = await axios.post(`${API_URL}/login`, { email, password });
            const { token, userId, role, username } = response.data;
            await AsyncStorage.setItem('token', token);
            await AsyncStorage.setItem('userId', userId);
            await AsyncStorage.setItem('username', username);
            await AsyncStorage.setItem('role', role);

            console.log('Login successful. role:', role);

            // Navigation based on role
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
