import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, FlatList, Modal, ScrollView } from 'react-native';
import { FIREBASE_AUTH, FIREBASE_APP, FIRESTORE_DB } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc, getDocs } from 'firebase/firestore';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend, addMonths, subMonths, startOfDay, endOfDay } from 'date-fns';

export default function CompOff({ navigation }) {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [hours, setHours] = useState('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);   

    // states for CompOff Applications
    const [compOffApplications, setCompOffApplications] = useState([]);
    const [monthlyRecords, setMonthlyRecords] = useState([]);
    const [totalAvailableHours, setTotalAvailableHours] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const recordsPerPage = 7;

    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [compOffUnsubscribe, setCompOffUnsubscribe] = useState(null);

    useEffect(() => {
        fetchCompOffApplications();
        
        // Cleanup function
        return () => {
            if (compOffUnsubscribe) {
                compOffUnsubscribe();
            }
        };
    }, [selectedMonth]);

    const fetchCompOffApplications = async () => {
        try {
            const user = FIREBASE_AUTH.currentUser;
            if (!user) return;

            const q = query(
                collection(FIRESTORE_DB, 'compOff'),
                where('userId', '==', user.uid),
                where('status', 'in', ['Pending', 'Approved', 'OnHold'])
            );

            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const applications = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    requestDate: doc.data().createdAt?.toDate() || new Date()
                }));
                setCompOffApplications(applications);
            }, (error) => {
                if (FIREBASE_AUTH.currentUser) {
                    console.error("Error in snapshot listener:", error);
                    // Show alert only if user is authenticated
                    Alert.alert('Error', 'Could not load data');
                }
            });

            setCompOffUnsubscribe(() => unsubscribe);
        } catch (error) {
            console.error('Error fetching comp-off applications:', error);
        }
    };
    

    const handleLogout = async () => {
        try {
            // Clean up the Firestore listener first
            if (compOffUnsubscribe) {
                compOffUnsubscribe();
                setCompOffUnsubscribe(null);
            }
            
            // Sign out from Firebase Auth
            await FIREBASE_AUTH.signOut();
            
            // Navigate to login
            navigation.navigate('Login');
        } catch (error) {
            console.error('Error logging out:', error);
            navigation.navigate('Login');
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

    const handleSubmit = async () => {
        if (!startDate || !endDate || !reason || !hours) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
    
        setIsSubmitting(true);
        try {
            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            const compOffData = {
                userId: user.uid,
                startDateTime: startDate.toISOString(),
                endDateTime: endDate.toISOString(),
                duration: parseFloat(hours),
                reason: reason,
                status: 'Pending',
                createdAt: serverTimestamp(),
            };
    
            await addDoc(collection(FIRESTORE_DB, 'compOff'), compOffData);
            Alert.alert('Success', 'Compensatory off request submitted');
            
            // Reset form
            setStartDate(new Date());
            setEndDate(new Date());
            setHours('');
            setReason('');
        } catch (error) {
            console.error('Error submitting comp-off request:', error);
            Alert.alert('Error', 'Failed to submit request. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderCompOffApplication = ({ item }) => (
        <View style={styles.applicationCard}>
            <View style={styles.applicationHeader}>
                <Text style={[styles.status, { color: item.status === 'Approved' ? 'green' : item.status === 'Pending' ? 'grey' : 'orange' }]}>
                    {item.status}
                </Text>
            </View>
            <Text style={styles.requestDate}>Request Date: {format(item.requestDate, 'dd-MM-yyyy')}</Text>
            <Text style={styles.dateRange}>
                Date Range: {format(new Date(item.startDateTime), 'dd-MM-yyyy')} to {format(new Date(item.endDateTime), 'dd-MM-yyyy')}
            </Text>
            <Text style={styles.duration}>CompOff Duration: {item.duration} days</Text>
            <Text style={styles.reason}>Reason: {item.reason}</Text>
        </View>
    );

    // const renderMonthlyRecord = ({ item }) => (
    //     <View style={styles.recordRow}>
    //         <Text style={styles.recordCell}>{item.day}</Text>
    //         <Text style={styles.recordCell}>{item.date}</Text>
    //         <Text style={styles.recordCell}>{item.checkIn}</Text>
    //         <Text style={styles.recordCell}>{item.checkOut}</Text>
    //         <Text style={styles.recordCell}>{item.hours}</Text>
    //         <Text style={styles.recordCell}>{item.type}</Text>
    //     </View>
    // );

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

                    <View style={styles.dateContainer}>
                        <Text style={{fontWeight: 'bold'}}>Apply for Days:</Text>
                        <TextInput
                            style={styles.daysInput}
                            value={hours}
                            onChangeText={handleDaysChange}
                            placeholder="Enter Days"
                            keyboardType="numeric"
                            maxLength={2}
                            placeholderTextColor="#000000"
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
                            keyExtractor={item => item.id}
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
    // totalHoursContainer: {
    //     marginTop: 15,
    //     padding: 10,
    //     backgroundColor: '#f0f8ff',
    //     borderRadius: 5,
    // },
    // totalHours: {
    //     fontSize: 16,
    //     fontWeight: 'bold',
    //     textAlign: 'center',
    // },
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