import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, getDoc, doc } from 'firebase/firestore';
import { Icon } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';

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

export default function AdminTasks({ navigation }) {
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [taskHeading, setTaskHeading] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [username, setUsername] = useState('');

    // Date and time picker states
    const [deadlineDate, setDeadlineDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');

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
            // Safely create date string with error handling
            let date;
            try {
                date = new Date(selectedYear, selectedMonth - 1, day).toISOString().split('T')[0];
            } catch (error) {
                console.error('Error creating date string:', error);
                date = ''; // Provide a default value
            }
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

            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                Alert.alert('error', 'No user logged in');
                return;
            }

            // Format the deadline date using date-fns
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
            setShowPicker(false);
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

    const getMonthName = (monthNumber) => {
        const monthIndex = monthNumber - 1;
        return months[monthIndex].label;
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
                    <Icon name="menu" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Admin Dashboard</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={22} color="#333" />
                </TouchableOpacity>
            </View>

            <View>
                <Text style={[styles.usertext, { textAlign: 'left' }]}>Hello, {username}!</Text>
            </View>

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
                                    onPress: () => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const selected = new Date(day.dateString);
                                        selected.setHours(0, 0, 0, 0);
                                        if (selected < today) {
                                            Alert.alert('Invalid Date', 'Cannot add tasks for past dates');
                                            return;
                                        }
                                        setModalVisible(true);
                                    }
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
        marginTop: 5,
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
        marginBottom: 40,
    },
    title: {
        fontSize: 19,
        fontWeight: 'bold',
    },

    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
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
        marginBottom: 20,
    },
    // Date and time picker styles
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