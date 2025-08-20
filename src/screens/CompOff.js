import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, FlatList, Modal, ScrollView } from 'react-native';
// import { FIREBASE_AUTH, FIREBASE_APP, FIRESTORE_DB } from '../firebaseConfig';
// import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, startOfDay, endOfDay } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from '@env';

export default function CompOff({ navigation }) {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [hours, setHours] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    // const [isLoading, setIsLoading] = useState(false);
    // const [error, setError] = useState(null);   

    // Half-day functionality
    const [compOffType, setCompOffType] = useState('full'); // 'full' or 'half'
    const [halfDayPeriod, setHalfDayPeriod] = useState('morning'); // 'morning' or 'afternoon'

    // states for CompOff Applications
    const [compOffApplications, setCompOffApplications] = useState([]);
    const recordsPerPage = 7;

    const [compOffUnsubscribe, setCompOffUnsubscribe] = useState(null);

    // useEffect(() => {
    //     fetchCompOffApplications();
        
    //     // Cleanup function
    //     return () => {
    //         if (compOffUnsubscribe) {
    //             compOffUnsubscribe();
    //         }
    //     };
    // }, []);

    // const fetchCompOffApplications = async () => {
    //     try {
    //         const user = FIREBASE_AUTH.currentUser;
    //         if (!user) return;

    //         const q = query(
    //             collection(FIRESTORE_DB, 'compOff'),
    //             where('userId', '==', user.uid),
    //             where('status', 'in', ['Pending', 'Approved', 'OnHold'])
    //         );

    //         const unsubscribe = onSnapshot(q, (querySnapshot) => {
    //             const applications = querySnapshot.docs.map(doc => ({
    //                 id: doc.id,
    //                 ...doc.data(),
    //                 requestDate: doc.data().createdAt?.toDate() || new Date()
    //             }));
    //             setCompOffApplications(applications);
    //         }, (error) => {
    //             if (FIREBASE_AUTH.currentUser) {
    //                 console.error("Error in snapshot listener:", error);
    //                 // Show alert only if user is authenticated
    //                 Alert.alert('Error', 'Could not load data');
    //             }
    //         });

    //         setCompOffUnsubscribe(() => unsubscribe);
    //     } catch (error) {
    //         console.error('Error fetching comp-off applications:', error);
    //     }
    // };

    const fetchCompOffApplications = async () => {
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`${API_URL}/api/compoff/user/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch comp-off requests');
            const data = await response.json();
            data.sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime));
            setCompOffApplications(data);
        } catch (error) {
            Alert.alert('Error', 'Could not load previous comp-off requests');
        }
    };
    
    useEffect(() => {
        fetchCompOffApplications();
    }, []);

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userId', 'username', 'role'])
            navigation.replace('Login');
        } catch(error) {
            console.log("Error logging out", error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartPicker(false);
        if (selectedDate) {
            if (selectedDate > endDate) {
                Alert.alert('Error', 'Start date cannot be later than end date');
                return;
            }
            setStartDate(selectedDate);
        }
    };

    const handleEndDateChange = (event, selectedDate) => {
        setShowEndPicker(false);
        if (selectedDate) {
            if (selectedDate < startDate) {
                Alert.alert('Error', 'End date cannot be earlier than start date');
                return;
            }
            setEndDate(selectedDate);
        }
    };

    const handleDaysChange = (text) => {
        // Only numbers
        const numericValue = text.replace(/[^0-9]/g, '');
        setHours(numericValue);
    };

    // Handle comp-off type change
    const handleCompOffTypeChange = (type) => {
        setCompOffType(type);
        // Reset hours when switching to half-day
        if (type === 'half') {
            setHours('0.5');
        }
    };

    // Handle half-day period change
    const handleHalfDayPeriodChange = (period) => {
        setHalfDayPeriod(period);
    };

    // submitting req to mongodb
    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason || !hours) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
    
        // Validate half-day input
        if (compOffType === 'half') {
            const hoursValue = parseFloat(hours);
            if (hoursValue !== 0.5) {
                Alert.alert('Error', 'Half-day should be 0.5 days');
                return;
            }
        }
    
        setIsSubmitting(true);
        try {
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert('Error', 'User not authenticated');
                setIsSubmitting(false);
                return;
            }
    
            const compOffData = {
                userId: userId,
                startDateTime: startDate.toISOString(),
                endDateTime: endDate.toISOString(),
                duration: parseFloat(hours),
                reason: reason,
                status: 'Pending',
                compOffType: compOffType,
                halfDayPeriod: compOffType === 'half' ? halfDayPeriod : null,
            };
    
            const response = await fetch(`${API_URL}/api/compoff`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(compOffData),
            });
    
            if (!response.ok) {
                throw new Error('Failed to submit comp-off request');
            }
    
            Alert.alert('Success', 'Compensatory off request submitted');
    
            // Reset form
            setStartDate(new Date());
            setEndDate(new Date());
            setHours('');
            setReason('');
            setCompOffType('full');
            setHalfDayPeriod('morning');
    
            // Refresh the list
            fetchCompOffApplications();
        } catch (error) {
            console.error('Error submitting comp-off request:', error);
            Alert.alert('Error', 'Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCompOffApplication = ({ item }) => {
        const getCompOffTypeDisplay = () => {
            if (item.compOffType === 'half') {
                const period = item.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon';
                return `Half day (${period})`;
            }
            return 'Full day';
        };
    
        return (
            <View style={styles.applicationCard}>
                <View style={styles.applicationHeader}>
                    <Text style={[styles.status, { color: item.status === 'Approved' ? 'green' : item.status === 'Pending' ? 'grey' : 'orange' }]}>
                        {item.status}
                    </Text>
                </View>
                <Text style={styles.requestDate}>
                    Request Date: {item.createdAt ? format(new Date(item.createdAt), 'dd-MM-yyyy') : format(new Date(item.startDateTime), 'dd-MM-yyyy')}
                </Text>
                <Text style={styles.dateRange}>
                    Date Range: {format(new Date(item.startDateTime), 'dd-MM-yyyy')} to {format(new Date(item.endDateTime), 'dd-MM-yyyy')}
                </Text>
                <Text style={styles.duration}>CompOff Duration: {item.duration} days</Text>
                <Text style={styles.compOffType}>Type: {getCompOffTypeDisplay()}</Text>
                <Text style={styles.reason}>Reason: {item.reason}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Icon name="menu" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Apply for Compensatory Off</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={22} color="#333" />
                </TouchableOpacity>
            </View>

        <ScrollView>
            <View>
                <View style={styles.dateContainer}>
                    <Text style={{fontWeight: 'bold'}}>Start Date:</Text>
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowStartPicker(true)}
                    >
                        <Text>{formatDate(startDate)}</Text>
                        <Ionicons name="calendar" size={20} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                    <View style={styles.dateContainer}>
                        <Text style={{fontWeight: 'bold'}}>End Date:</Text>
                        <TouchableOpacity
                            style={styles.datePickerButton}
                            onPress={() => setShowEndPicker(true)}
                        >
                            <Text>{formatDate(endDate)}</Text>
                            <Ionicons name="calendar" size={20} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Comp-off Type Selection */}
                    <View style={styles.typeContainer}>
                        <Text style={{fontWeight: 'bold'}}>Comp-off Type:</Text>
                        <View style={styles.typeButtonsContainer}>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    compOffType === 'full' && styles.typeButtonActive
                                ]}
                                onPress={() => handleCompOffTypeChange('full')}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    compOffType === 'full' && styles.typeButtonTextActive
                                ]}>Full Day</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.typeButton,
                                    compOffType === 'half' && styles.typeButtonActive
                                ]}
                                onPress={() => handleCompOffTypeChange('half')}
                            >
                                <Text style={[
                                    styles.typeButtonText,
                                    compOffType === 'half' && styles.typeButtonTextActive
                                ]}>Half Day</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Half-day Period Selection (only show for half-day) */}
                    {compOffType === 'half' && (
                        <View style={styles.periodContainer}>
                            <Text style={{fontWeight: 'bold'}}>Half-day Period:</Text>
                            <View style={styles.periodButtonsContainer}>
                                <TouchableOpacity
                                    style={[
                                        styles.periodButton,
                                        halfDayPeriod === 'morning' && styles.periodButtonActive
                                    ]}
                                    onPress={() => handleHalfDayPeriodChange('morning')}
                                >
                                    <Text style={[
                                        styles.periodButtonText,
                                        halfDayPeriod === 'morning' && styles.periodButtonTextActive
                                    ]}>Morning</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.periodButton,
                                        halfDayPeriod === 'afternoon' && styles.periodButtonActive
                                    ]}
                                    onPress={() => handleHalfDayPeriodChange('afternoon')}
                                >
                                    <Text style={[
                                        styles.periodButtonText,
                                        halfDayPeriod === 'afternoon' && styles.periodButtonTextActive
                                    ]}>Afternoon</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.dateContainer}>
                        <Text style={{fontWeight: 'bold'}}>Apply for Days:</Text>
                        <TextInput
                            style={styles.daysInput}
                            value={hours}
                            onChangeText={handleDaysChange}
                            placeholder={compOffType === 'half' ? "0.5" : "Enter Days"}
                            keyboardType="numeric"
                            maxLength={compOffType === 'half' ? 3 : 2}
                            placeholderTextColor="#000000"
                            editable={compOffType === 'full'} // Disable editing for half-day
                        />
                    </View>

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter reason for compensatory off"
                        value={reason}
                        onChangeText={setReason}
                        multiline
                        placeholderTextColor="#000000"
                    />

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                    >
                        <Text style={styles.buttonText}>Submit CompOff Request</Text>
                    </TouchableOpacity>
            </View>

            <View style = {styles.previousCompOffContainer}>
                <View style = {styles.previousCompOffHeader}>
                    <Text style={styles.previousCompOffTitle}>Previous CompOff Applications</Text>
                </View>
                <View>
                    <FlatList
                        data={compOffApplications}
                        renderItem={renderCompOffApplication}
                        keyExtractor={item => item._id}
                        scrollEnabled={false}
                    />
                </View>
            </View>

            {showStartPicker && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="default"
                    onChange={handleStartDateChange}
                />
            )}

            {showEndPicker && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                />
            )}
        </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f0f0f0',
        marginTop: 5,
    },
    header: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        borderRadius: 15,
        backgroundColor: '#f8f8f8',
        marginBottom: 20,
    },
    title: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    previousCompOffContainer: {
        flex: 1,
        marginRight: 10,
    },
    previousCompOffTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    applicationCard: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    previousCompOffHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    previousCompOffTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    previousCompOffDates: {
        fontWeight: 'bold',
    },
    previousCompOffReason: {
        marginBottom: 5,
    },
    previousCompOffStatus: {
        fontStyle: 'italic',
        fontSize: 13,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginTop: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginRight: 10
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    datePickerContainer: {
        marginBottom: 20,
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 5,
        marginRight: 10,
    },
    typeContainer: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 5,
        marginRight: 10,
    },
    typeButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    typeButton: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginHorizontal: 5,
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    typeButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    typeButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    typeButtonTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    periodContainer: {
        marginBottom: 10,
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 5,
        marginRight: 10,
    },
    periodButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
    },
    periodButton: {
        flex: 1,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginHorizontal: 5,
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
    },
    periodButtonActive: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    periodButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    periodButtonTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    datePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f0f8ff',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#ddd',
        width: 150,
    },
    daysInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 8,
        width: 100,
        backgroundColor: '#f0f8ff',
        textAlign: 'center',
        color: '#000000'
    },
    input: {
        borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
        backgroundColor: 'white',
        marginRight: 10,
        color: '#000000'
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top'
    },
    submitButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 5,
        alignItems: 'center',
        marginBottom: 15,
        marginRight: 10,
    },
    buttonText: {
        color: 'white',
        fontSize: 16
    },
    applicationCard: {
        backgroundColor: '#f8f8f8',
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
    },
    applicationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    requestId: {
        fontWeight: 'bold',
    },
    status: {
        fontWeight: 'bold',
    },
    requestDate: {
        marginBottom: 5,
    },
    dateRange: {
        marginBottom: 5,
        fontWeight: 'bold',
    },
    reason: {
        marginBottom: 5,
    },
    duration: {
        marginBottom: 5,
    },
    compOffType: {
        marginBottom: 5,
        fontWeight: 'bold',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderRadius: 5,
        marginBottom: 5,
    },
    headerCell: {
        flex: 1,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    recordRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    recordCell: {
        flex: 1,
        textAlign: 'center',
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    paginationButton: {
        padding: 5,
        marginHorizontal: 10,
        color: '#007AFF',
    },
    pageNumber: {
        marginHorizontal: 10,
    },
    monthHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    monthArrow: {
        padding: 5,
    },
});