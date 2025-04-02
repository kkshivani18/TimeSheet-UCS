import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, Alert, Pressable} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
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
    const [taskDeadline, setTaskDeadline] = useState('');
    const [username, setUsername] = useState('');
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);
    const [workedHours, setWorkedHours] = useState(null);
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
     const fetchAttendance = async () => {
        if (!user) return;

        try {
            const docRef = doc(FIRESTORE_DB, 'attendance', user.uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setCheckInTime(data.checkInTime);
                setCheckOutTime(data.checkOutTime);
                setWorkedHours(data.workedHours);

                // Disable/Enable Buttons Based on Data
                if (data.checkInTime && !data.checkOutTime) {
                    setIsCheckInDisabled(true);
                    setIsCheckOutDisabled(false);
                } else {
                    setIsCheckInDisabled(false);
                    setIsCheckOutDisabled(true);
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
                Alert.alert('error', 'Please enter a task heading');
                return;
            }
            if (!taskDescription.trim()) {
                Alert.alert('error', 'Please enter a task description');
                return;
            }
            if (!taskDeadline.trim()) {
                Alert.alert('error', 'Please enter a deadline');
                return;
            }
    
            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                Alert.alert('error', 'No user logged in');
                return;
            }
    
            const newTask = {
                userId: user.uid,
                email: user.email,
                username: username,
                date: new Date(selectedDate).toISOString(),
                heading: taskHeading.trim(),
                description: taskDescription.trim(),
                deadline: taskDeadline.trim(),
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
            setTaskDeadline('');
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

    // const getMonthName = (monthNumber) => {
    //     const monthIndex = monthNumber - 1;
    //     return months[monthIndex].label;
    // };

    // Check-In
    const handleCheckIn = async () => {
        if (!user) return;

        try {
            const checkInTimestamp = new Date().toISOString();
            setCheckInTime(checkInTimestamp);
            setIsCheckInDisabled(true);
            setIsCheckOutDisabled(false);

            const docRef = doc(FIRESTORE_DB, 'attendance', user.uid);
            await setDoc(docRef, {
                checkInTime: checkInTimestamp,
                checkOutTime: checkOutTimestamp,
                workedHours: 0,
                userId: user.uid,
                email: user.email,
                username: username,
                date: new Date().toLocaleDateString(),
                timestamp: serverTimestamp(),
            });

            console.log("Check-In saved in Firestore:", checkInTimestamp);
            Alert.alert("Success", "Checked In Successfully!");
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
            const workedHours = (new Date(checkOutTimestamp) - new Date(checkInTime)) / (1000 * 60 * 60); // Convert ms to hours
    
            const attendanceRef = doc(FIRESTORE_DB, 'attendance', user.uid);
            await updateDoc(attendanceRef, {
                checkOutTime: checkOutTimestamp,
                workedHours: workedHours.toFixed(2) 
            });
    
            setCheckOutTime(checkOutTimestamp);
            setWorkedHours(workedHours.toFixed(2));
            
        } catch (error) {
            console.error("Error during check-out:", error);
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
            <Text style={styles.checkinText}>Check-In Time: {checkInTime || 'Not Checked In'}</Text>
            <Text style={styles.checkinText}>Check-Out Time: {checkOutTime || 'Not Checked Out'}</Text>
            <Text style={styles.checkinText}>Worked Hours: {workedHours ? `${workedHours} hrs` : 'N/A'}</Text>  

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
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}> Add Task for {selectedDate}</Text>
                            <TouchableOpacity 
                                onPress={() => setModalVisible(false)} 
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
                            <TextInput
                                style={styles.input}
                                placeholder="Enter deadline (e.g. 5:00 PM)"
                                value={taskDeadline}
                                onChangeText={setTaskDeadline}
                            />
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
        textAlign: 'justify',
        fontStyle: 'italic',
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    checkinText: {
        fontSize: 15,
        alignSelf: 'baseline',
        marginLeft: 10, 
        marginBottom: 10,
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
});
