import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, BackHandler } from 'react-native';
import { FIREBASE_AUTH } from '../firebaseConfig';
import { sendEmailVerification, checkActionCode } from 'firebase/auth';
import { useNavigation, useRoute } from '@react-navigation/native';

export default function Authentication() {
    const navigation = useNavigation();
    const route = useRoute();
    const { email } = route.params || {};
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [code, setCode] = useState('');

    useEffect(() => {
        const backAction = () => true; 
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove(); 
      }, []);

    const handleSendCode = () => {
        const user = FIREBASE_AUTH.currentUser;

        if (user) {
            sendEmailVerification(user)
                .then(() => {
                    setMessage('Verification link sent to your email');
                    setMessageType('success');
                })
                .catch((error) => {
                    console.error('Error sending verification code:', error);
                    setMessage('Error sending verification code');
                    setMessageType('error');
                });
        } else {
            setMessage('User is not signed in.');
            setMessageType('error');
        }
    };

    const handleVerifyCode = () => {
        checkActionCode(FIREBASE_AUTH, code)
            .then(() => {
                setMessage('Verification successful!');
                setMessageType('success');
                navigation.navigate('Login');
            })
            .catch((error) => {
                console.error('Error verifying code:', error);
                setMessage('Invalid code. Please try again.');
                setMessageType('error');
            });
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Verify Your Email</Text>

            {message ? (
                <View style={[styles.messageBox, messageType === 'success' ? styles.successBox : styles.errorBox]}>
                    <Text style={styles.message}>{message}</Text>
                </View>
            ) : null}

            <View style={styles.buttonContainer}>
                <Button title="Verify created account" onPress={handleSendCode}/>
            </View>

            <Text style={styles.footerText}>
                After successful email verification, {"\n"}
                Go to 
            <Text onPress={() => navigation.navigate('Login')} style={styles.loginLink}> Login</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'flex-start',
        padding: 16,
        marginTop: 30,
    },
    title: {
        fontSize: 24,
        marginBottom: 30,
        textAlign: 'center',
        fontWeight: 'bold',
        fontFamily: 'Arial',
        marginTop: 25,
    },
    buttonContainer: {
        width: '80%',
        height: 50,
        marginBottom: 10,
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

    footerText: {
        textAlign: 'center',
        marginTop: 16,
        marginBottom: 16,
        lineHeight: 24, 
        fontSize: 16
    },
    loginLink: {
        color: 'darkblue',
    },
});
