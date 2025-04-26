import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, Alert, Pressable, ScrollView,  Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Icon } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';

const months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
];

export default function Dashboard({ navigation }) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [taskHeading, setTaskHeading] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    // const [taskDeadline, setTaskDeadline] = useState('');
    const [deadlineDate, setDeadlineDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');
    const [username, setUsername] = useState('');
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);
    const [workedHours, setWorkedHours] = useState(null);
    const [totalWorkedMinutes, setTotalWorkedMinutes] = useState(0);
    const [attendanceId, setAttendanceId] = useState(null);
    const [isCheckInDisabled, setIsCheckInDisabled] = useState(false);
    const [isCheckOutDisabled, setIsCheckOutDisabled] = useState(true);

    const user = FIREBASE_AUTH.currentUser;

    useEffect(() => {
        const fetchUserData = async () => {
            const user = FIREBASE_AUTH.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
                if (userDoc.exists()) {
                    setUsername(userDoc.data().username);
                } else {
                    setUsername('User');
                }
            } else {
                setUsername('Guest');
            }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, []);

    // Fetch attendance data
    // const fetchAttendance = async () => {
    //     if (!user) return;

    //     try {
    //         const docRef = doc(FIRESTORE_DB, 'attendance', user.uid);
    //         const docSnap = await getDoc(docRef);

    //         if (docSnap.exists()) {
    //             const data = docSnap.data();
    //             setCheckInTime(data.checkInTime);
    //             setCheckOutTime(data.checkOutTime);
    //             setWorkedHours(data.workedHours);

    //             // Disable/Enable Buttons Based on Data
    //             if (data.checkInTime && !data.checkOutTime) {
    //                 setIsCheckInDisabled(true);
    //                 setIsCheckOutDisabled(false);
    //             } else {
    //                 setIsCheckInDisabled(false);
    //                 setIsCheckOutDisabled(true);
    //             }
    //         } else {
    //             console.log("No attendance record found, creating new one.");
    //             setIsCheckInDisabled(false);
    //             setIsCheckOutDisabled(true);
    //         }
    //     } catch (error) {
    //         console.error("Error fetching attendance:", error);
    //     }
    // };

    const fetchAttendance = async () => {
        if (!user) return;

        try {
            const docRef = doc(FIRESTORE_DB, 'attendance', user.uid);
            const docSnap = await getDoc(docRef);

            const todayDate = new Date().toLocaleDateString();

            if (docSnap.exists()) {
                const data = docSnap.data();

                // If it's a new day, reset everything
                if (data.date !== todayDate) {
                    await updateDoc(docRef, {
                        checkInTime: null,
                        checkOutTime: null,
                        workedHours: '',
                        totalWorkedMinutes: 0,
                        date: todayDate,
                        timestamp: serverTimestamp(),
                    });
                    setCheckInTime(null);
                    setCheckOutTime(null);
                    setWorkedHours('');
                    setTotalWorkedMinutes(0);
                    setIsCheckInDisabled(false);
                    setIsCheckOutDisabled(true);
                } else {
                    setCheckInTime(data.checkInTime);
                    setCheckOutTime(data.checkOutTime);
                    setWorkedHours(data.workedHours);
                    setTotalWorkedMinutes(data.totalWorkedMinutes || 0);

                    // Disable/Enable Buttons
                    if (data.checkInTime) {
                        setIsCheckInDisabled(true);
                        // Always enable check-out if checked in
                        setIsCheckOutDisabled(false);
                    } else {
                        setIsCheckInDisabled(false);
                        setIsCheckOutDisabled(true);
                    }
                }
            } else {
                console.log("No attendance record found, creating new one.");
                setIsCheckInDisabled(false);
                setIsCheckOutDisabled(true);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
    };

    const handleMonthChange = (itemValue) => {
        setSelectedMonth(itemValue);
    };

    const handleYearChange = (itemValue) => {
        setSelectedYear(itemValue);
    };

    const getCurrentMonthDays = () => {
        const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
        const markedDates = {};
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(selectedYear, selectedMonth - 1, day).toISOString().split('T')[0];
            markedDates[date] = { marked: false }; // have to customize more
        }
        return markedDates;
    };

    const handleDayPress = (day) => {
        setSelectedDate(day.dateString);
        setModalVisible(true);
    };

    const handleSaveTask = async () => {
        try {
            // Form validation
            if (!taskHeading.trim()) {
                Alert.alert('Error', 'Please enter a task heading');
                return;
            }
            if (!taskDescription.trim()) {
                Alert.alert('Error', 'Please enter a task description');
                return;
            }

            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                Alert.alert('Error', 'No user logged in');
                return;
            }

            // Format the deadline date
            const formattedDeadline = format(deadlineDate, 'dd/MM/yyyy - hh:mm a');

            const newTask = {
                userId: user.uid,
                email: user.email,
                username: username,
                date: new Date(selectedDate).toISOString(),
                heading: taskHeading.trim(),
                description: taskDescription.trim(),
                deadline: formattedDeadline,
                completed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Add task to Firestore
            const docRef = await addDoc(collection(FIRESTORE_DB, 'tasks'), newTask);

            // Show success message
            Alert.alert('Success', 'Task added successfully');

            // Navigate to Tasks screen with both date and new task
            navigation.navigate('Tasks', {
                date: selectedDate,
                newTask: { id: docRef.id, ...newTask }
            });

            // Reset form and close modal
            setTaskHeading('');
            setTaskDescription('');
            setDeadlineDate(new Date());
            setModalVisible(false);
        } catch (error) {
            console.error('Error saving task:', error);
            Alert.alert('Error', 'Failed to save task. Please try again.');
        }
    };

    const viewTasksForDate = (date) => {
        navigation.navigate('Tasks', {
            date: date,
            timestamp: new Date().getTime()
        });
    };

    // Check-In
    const handleCheckIn = async () => {
        if (!user) return;

        try {
            const checkInTimestamp = new Date().toISOString();
            setCheckInTime(checkInTimestamp);
            setCheckOutTime(null);
            setIsCheckInDisabled(true);
            setIsCheckOutDisabled(false);

            const docRef = doc(FIRESTORE_DB, 'attendance', user.uid);
            await setDoc(docRef, {
                checkInTime: checkInTimestamp,
                checkOutTime: null,
                workedHours: 0,
                totalWorkedMinutes: totalWorkedMinutes, // Preserve existing total
                userId: user.uid,
                email: user.email,
                username: username,
                date: new Date().toLocaleDateString(),
                timestamp: serverTimestamp(),
            });

            console.log("Check-In saved in Firestore:", checkInTimestamp);
            Alert.alert("Success", `Checked In at ${formatDateTime(checkInTimestamp)}!`);
        } catch (error) {
            console.error("Error during check-in:", error);
            Alert.alert("Error", "Failed to Check In");
        }
    };

    // Check-Out
    const handleCheckOut = async () => {
        if (!user || !checkInTime) return;

        try {
            const checkOutTimestamp = new Date().toISOString();

            // Calculate time worked for this session
            const diffMs = new Date(checkOutTimestamp) - new Date(checkInTime);
            const session = Math.floor(diffMs / (1000 * 60));

            // Add to total worked minutes
            const newTotalMinutes = session;
            setTotalWorkedMinutes(newTotalMinutes);

            // Calculate total hours and minutes for display
            const totalHours = Math.floor(newTotalMinutes / 60);
            const remainingMinutes = newTotalMinutes % 60;
            const totalWorkedDuration = `${totalHours} hrs ${remainingMinutes} mins`;

            // Calculate session duration for display
            const sessionHours = Math.floor(session / 60);
            const sessionRemainingMinutes = session % 60;
            const sessionDuration = `${sessionHours} hrs ${sessionRemainingMinutes} mins`;

            const attendanceRef = doc(FIRESTORE_DB, 'attendance', user.uid);
            await updateDoc(attendanceRef, {
                checkOutTime: checkOutTimestamp,
                workedHours: totalWorkedDuration,
                totalWorkedMinutes: newTotalMinutes
            });

            setCheckOutTime(checkOutTimestamp);
            setWorkedHours(totalWorkedDuration);

            // Don't disable check-out button after checking out
            // This allows multiple check-outs

            Alert.alert(
                "Success",
                `Checked Out - ${formatDateTime(checkOutTimestamp)}!\n\nThis session: ${sessionDuration}\nWorked Hours: ${totalWorkedDuration}`
            );

        } catch (error) {
            console.error("Error during check-out:", error);
            Alert.alert("Error", "Failed to Check Out");
        }
    };

    // function to format date strings
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'Not Available';

        try {
            const date = new Date(dateTimeString);
            return format(date, 'dd-MM-yyyy HH:mm');
        } catch (error) {
            console.error('Error formatting date:', error);
            return dateTimeString;
        }
    };

    const handleLogout = () => {
        FIREBASE_AUTH.signOut()
            .then(() => {
                console.log('User logged out');
                navigation.navigate('Login');
            })
            .catch((error) => {
                console.error('Error logging out:', error);
            });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Icon name="menu" size={25} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Dashboard</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={25} color="#333" />
                </TouchableOpacity>
            </View>

            <View>
                <Text style={[styles.usertext, { textAlign: 'left' }]}>Hello, {username}!</Text>
            </View>

            {/* check in & check out feature */}
            <View style={styles.attendanceCard}>
                <Text style={styles.checkinText}>Check-In Time: {checkInTime ? formatDateTime(checkInTime) : 'Not Checked In'}</Text>
                <Text style={styles.checkinText}>Check-Out: {checkOutTime ? formatDateTime(checkOutTime) : 'Not Checked Out'}</Text>
                <Text style={styles.checkinText}>Worked Hours: {workedHours ? `${workedHours}` : 'N/A'}</Text>
            </View>

            <View style={styles.buttonRow}>
                <Pressable
                    style={[styles.checkinButton, isCheckInDisabled && styles.disabledButton]}
                    onPress={handleCheckIn}
                    disabled={isCheckInDisabled}
                >
                    <Text style={styles.buttonText}>Check In</Text>
                </Pressable>

                <Pressable
                    style={[styles.checkinButton, isCheckOutDisabled && styles.disabledButton]}
                    onPress={handleCheckOut}
                    disabled={isCheckOutDisabled}
                >
                    <Text style={styles.buttonText}>Check Out</Text>
                </Pressable>
            </View>

            {/* month and year picker */}
            <View style={styles.pickerContainer}>
                <Picker
                    selectedValue={selectedMonth}
                    style={styles.picker}
                    onValueChange={handleMonthChange}
                >
                    {months.map((month) => (
                        <Picker.Item key={month.value} label={month.label} value={month.value} />
                    ))}
                </Picker>
                <Picker
                    selectedValue={selectedYear}
                    style={styles.picker}
                    onValueChange={handleYearChange}
                >
                    {[...Array(20).keys()].map(year => (
                        <Picker.Item key={year} label={`${selectedYear - 10 + year}`} value={selectedYear - 10 + year} />
                    ))}
                </Picker>
            </View>

            {/* calendar */}
            <View style={styles.card}>
                <Calendar
                    key={`${selectedYear}-${selectedMonth}`}
                    style={styles.calendar}
                    hideArrows={true}
                    theme={{
                        calendarBackground: 'white',
                        textSectionTitleColor: '#b6c1cd',
                        selectedDayBackgroundColor: '#00adf5',
                        selectedDayTextColor: '#ffffff',
                        todayTextColor: '#00adf5',
                        dayTextColor: '#2d4150',
                        textDisabledColor: '#d9e1e8',
                        dotColor: '#00adf5',
                        selectedDotColor: '#ffffff',
                        arrowColor: 'orange',
                        monthTextColor: 'black',
                        indicatorColor: 'black',
                        textDayFontWeight: '300',
                        textMonthFontWeight: 'bold',
                        textDayHeaderFontWeight: '300',
                        textDayFontSize: 16,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 14,
                    }}
                    markedDates={getCurrentMonthDays()}
                    current={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`}
                    onDayPress={(day) => {
                        setSelectedDate(day.dateString);
                        Alert.alert(
                            'Select Option',
                            `What would you like to do for ${day.dateString}?`,
                            [
                                {
                                    text: 'Add Task',
                                    onPress: () => setModalVisible(true)
                                },
                                {
                                    text: 'View Tasks',
                                    onPress: () => viewTasksForDate(day.dateString)
                                },
                                {
                                    text: 'Cancel',
                                    style: 'cancel'
                                }
                            ]
                        );
                    }}
                />
            </View>

            <Modal
                animationType="slide"
                presentationStyle='pageSheet'
                visible={modalVisible}
                onRequestClose={() => {
                    setModalVisible(false);
                    setShowPicker(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}> Add Task for {selectedDate}</Text>
                            <TouchableOpacity
                                onPress={() => {
                                    setModalVisible(false);
                                    setShowPicker(false);
                                }}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color="black" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Task Heading</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter task heading"
                                value={taskHeading}
                                onChangeText={setTaskHeading}
                            />

                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Enter task description"
                                value={taskDescription}
                                onChangeText={setTaskDescription}
                                multiline={true}
                                numberOfLines={4}
                            />

                            <Text style={styles.inputLabel}>Deadline</Text>
                            <View style={styles.dateTimeButtonsContainer}>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => {
                                        // Ensure any existing picker is closed first
                                        setShowPicker(false);
                                        // Use setTimeout to ensure the previous picker is fully closed
                                        setTimeout(() => {
                                            setPickerMode('date');
                                            setShowPicker(true);
                                        }, 100);
                                    }}
                                >
                                    <Icon name="calendar" type="feather" size={16} color="#007AFF" />
                                    <Text style={styles.dateTimeButtonText}>Select Date</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => {
                                        // Ensure any existing picker is closed first
                                        setShowPicker(false);
                                        // Use setTimeout to ensure the previous picker is fully closed
                                        setTimeout(() => {
                                            setPickerMode('time');
                                            setShowPicker(true);
                                        }, 100);
                                    }}
                                >
                                    <Icon name="clock" type="feather" size={16} color="#007AFF" />
                                    <Text style={styles.dateTimeButtonText}>Select Time</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.selectedDeadlineContainer}>
                                <Text style={styles.selectedDeadlineText}>
                                    {format(deadlineDate, 'dd/MM/yyyy - hh:mm a')}
                                </Text>
                            </View>

                            {showPicker && (
                                <DateTimePicker
                                    testID="dateTimePicker"
                                    value={deadlineDate}
                                    mode={pickerMode}
                                    is24Hour={false}
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(_, selectedDate) => {
                                        // Always hide the picker on Android after selection
                                        if (Platform.OS === 'android') {
                                            setShowPicker(false);
                                        }

                                        // Update the date if a selection was made
                                        if (selectedDate) {
                                            // For iOS, if in date mode, switch to time mode after date selection
                                            if (Platform.OS === 'ios' && pickerMode === 'date') {
                                                setPickerMode('time');
                                                // Create a new date with the selected date but keep current time
                                                const updatedDate = new Date(selectedDate);
                                                updatedDate.setHours(deadlineDate.getHours());
                                                updatedDate.setMinutes(deadlineDate.getMinutes());
                                                setDeadlineDate(updatedDate);
                                            }
                                            // For iOS, if in time mode, hide picker after time selection
                                            else if (Platform.OS === 'ios' && pickerMode === 'time') {
                                                setShowPicker(false);
                                                // Create a new date with the current date but selected time
                                                const updatedDate = new Date(deadlineDate);
                                                updatedDate.setHours(selectedDate.getHours());
                                                updatedDate.setMinutes(selectedDate.getMinutes());
                                                setDeadlineDate(updatedDate);
                                            }
                                            // For Android, update the date directly
                                            else {
                                                setDeadlineDate(selectedDate);
                                            }
                                        }
                                    }}
                                />
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSaveTask}
                        >
                            <Text style={styles.saveButtonText}>Save Task</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 25,
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f0f0f0',
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
    pickerContainer: {
        // marginTop: -10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },

    picker: {
        height: 55,
        width: 160,
    },

    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        width: '90%',
    },

    calendar: {
        borderRadius: 10,
    },

    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },

    modalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },

    closeButton: {
        padding: 5,
    },

    inputContainer: {
        marginBottom: 20,
    },

    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
    },

    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },

    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },

    saveButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },

    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    usertext: {
        marginTop: -10,
        textAlign: 'justify',
        fontStyle: 'italic',
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    attendanceCard: {
        // marginTop: 15,
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        width: '90%',
        marginBottom: 10,
    },
    checkinText: {
        fontSize: 15,
        fontWeight: 'bold',
        alignSelf: 'baseline',
        marginLeft: 10,
        marginBottom: 5,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
    },
    checkinButton: {
        backgroundColor: '#007AFF',
        padding: 10,
        borderRadius: 30,
        width: '40%',
        alignItems: 'center',
    },
    disabledButton: {
        backgroundColor: 'gray',
    },
    buttonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    activeSessionText: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontStyle: 'italic',
        marginTop: 5,
    },
    datePickerButton: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dateTimeButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
        width: '48%',
    },
    dateTimeButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 5,
    },
    selectedDeadlineContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
    },
    selectedDeadlineText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
});
