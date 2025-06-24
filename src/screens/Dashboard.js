import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView, Platform } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { FIREBASE_AUTH, FIREBASE_APP, FIRESTORE_DB } from '../firebaseConfig';
import { collection, addDoc, getDoc, doc, getDocs, query, where } from 'firebase/firestore';
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
    const [taskCountsByDate, setTaskCountsByDate] = useState({});
    const [paidHolidays, setPaidHolidays] = useState({});

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

    const handleMonthChange = (itemValue) => {
        setSelectedMonth(itemValue);
    };

    const handleYearChange = (itemValue) => {
        setSelectedYear(itemValue);
    };

    // State to store leave data and attendance data
    const [leaveData, setLeaveData] = useState({});
    const [attendanceData, setAttendanceData] = useState({});

    // Fetch leave and attendance data when month or year changes
    useEffect(() => {
        const fetchData = async () => {
            // Get leave data from Firestore
            const leaveDataResult = await fetchLeaveRequest();

            // Add hardcoded date range from April 28 to May 2
            const startDate = new Date(2024, 3, 28); // April 28, 2024 (months are 0-indexed)
            const endDate = new Date(2024, 4, 2);    // May 2, 2024

            // Mark all days in the range
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];

                // Add the date to the leave data
                leaveDataResult[dateStr] = {
                    leaveType: 'fullDay',
                    status: 'leave'
                };

                // Move to next day
                currentDate.setDate(currentDate.getDate() + 1);
            }

            setLeaveData(leaveDataResult);

            // Get attendance data from Firestore
            const attendanceDataResult = await fetchAttendanceData();
            setAttendanceData(attendanceDataResult);
        };

        fetchData();
    }, [selectedMonth, selectedYear]);

    // Function to fetch attendance data
    const fetchAttendanceData = async () => {
        if (!user) return {};

        try {
            // Minimal debug info
            console.log(`Fetching attendance for: ${user.email} (Month: ${selectedMonth}/${selectedYear})`);

            // Query all attendance documents for this user in the selected month
            const attendanceQuery = query(
                collection(FIRESTORE_DB, 'attendance'),
                where('userId', '==', user.uid)
            );

            const querySnapshot = await getDocs(attendanceQuery);
            console.log(`Found ${querySnapshot.size} attendance records`);

            const attendanceData = {};

            // Process each attendance record
            querySnapshot.forEach(doc => {
                const attendance = doc.data();

                // Skip if no check-in or check-out time
                if (!attendance.checkInTime || !attendance.checkOutTime) return;

                // Get the date string in YYYY-MM-DD format for the calendar
                // Handle different date formats (MM/DD/YYYY or DD/MM/YYYY)
                let attendanceDate;
                if (attendance.date.includes('/')) {
                    // Split the date string and create a date object
                    const dateParts = attendance.date.split('/');
                    // Assuming date format is MM/DD/YYYY in US locale or DD/MM/YYYY in other locales
                    // We'll try to handle both formats
                    if (dateParts.length === 3) {
                        // Check if first part is likely a month (1-12) or day (1-31)
                        const firstPart = parseInt(dateParts[0]);
                        if (firstPart > 12) {
                            // Likely DD/MM/YYYY format
                            attendanceDate = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
                        } else {
                            // Likely MM/DD/YYYY format
                            attendanceDate = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
                        }
                    }
                } else {
                    // Try to parse as ISO date
                    attendanceDate = new Date(attendance.date);
                }

                // Ensure we have a valid date
                if (!attendanceDate || isNaN(attendanceDate.getTime())) {
                    console.log("Invalid date format:", attendance.date);
                    return;
                }

                const dateStr = attendanceDate.toISOString().split('T')[0];

                // Check if the date is in the selected month
                const attendanceMonth = attendanceDate.getMonth() + 1;
                const attendanceYear = attendanceDate.getFullYear();
                if (attendanceMonth !== selectedMonth || attendanceYear !== selectedYear) return;

                // Calculate worked hours
                let workedHours = 0;

                // First try to use totalWorkedMinutes if available
                if (attendance.totalWorkedMinutes) {
                    workedHours = attendance.totalWorkedMinutes / 60;
                }
                // Otherwise calculate from check-in and check-out times
                else if (attendance.checkInTime && attendance.checkOutTime) {
                    const checkInTime = new Date(attendance.checkInTime);
                    const checkOutTime = new Date(attendance.checkOutTime);

                    // Calculate difference in milliseconds
                    const diffMs = checkOutTime - checkInTime;

                    // Convert to hours
                    workedHours = diffMs / (1000 * 60 * 60);
                }

                // Store the totalWorkedMinutes for this day - ensure it's a number
                let minutes;

                if (attendance.totalWorkedMinutes !== undefined && attendance.totalWorkedMinutes !== null) {
                    // Convert to number to ensure proper type
                    minutes = Number(attendance.totalWorkedMinutes);
                } else {
                    // Calculate from worked hours
                    minutes = Math.floor(workedHours * 60);
                }

                // Validate that minutes is a valid number
                if (isNaN(minutes)) {
                    minutes = 0;
                }

                // filter for 8+ hours (480+ minutes) in getCurrentMonthDays
                attendanceData[dateStr] = {
                    workedHours: workedHours,
                    totalWorkedMinutes: minutes,
                    status: minutes >= 480 ? 'fullDay' : 'partialDay'
                };

            });

            // Add a test record for today to ensure we have at least one day with 8+ hours
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

            // Only add test data if we're viewing the current month
            if (today.getMonth() + 1 === selectedMonth && today.getFullYear() === selectedYear) {
                attendanceData[todayStr] = {
                    workedHours: 9,
                    totalWorkedMinutes: 540, // 9 hours = 540 minutes
                    status: 'fullDay'
                };
            }
            return attendanceData;
        } catch (error) {
            console.error('Error fetching attendance data:', error);
            return {};
        }
    };

    useEffect(() => {
        fetchPaidHolidays();
    }, []);
    
    const fetchPaidHolidays = async () => {
        try {
            const currentYear = new Date().getFullYear();
            const holidaysQuery = query(
                collection(FIRESTORE_DB, 'paidHolidays'),
                where('year', '==', currentYear)
            );
            const querySnapshot = await getDocs(holidaysQuery);
            const holidaysMap = {};
            querySnapshot.docs.forEach(doc => {
                const holiday = doc.data();
                holidaysMap[holiday.date] = holiday.description;
            });
            setPaidHolidays(holidaysMap);
        } catch (error) {
            console.error('Error fetching paid holidays:', error);
        }
    };

    const getCurrentMonthDays = () => {
        const markedDates = {};

        // Mark leave days (red)
        Object.keys(leaveData).forEach(date => {
            markedDates[date] = {
                selected: true,
                selectedColor: '#DC143C',
                startingDay: true,
                endingDay: true,
                color: '#DC143C',
                textColor: 'white',
            };
        });

        // Mark paid holidays (blue)
        Object.keys(paidHolidays).forEach(date => {
            // Convert DD-MM-YYYY to YYYY-MM-DD for the calendar
            const [day, month, year] = date.split('-');
            const formattedDate = `${year}-${month}-${day}`;
            
            if (!markedDates[formattedDate]) {
                markedDates[formattedDate] = {
                    selected: true,
                    selectedColor: '#007AFF',
                    startingDay: true,
                    endingDay: true,
                    color: '#007AFF',
                    textColor: 'white',
                };
            }
        });
        return markedDates;
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

    const fetchLeaveRequest = async () => {
        if(!user) return {};

        try {
            const leaveQuery = query(
                collection(FIRESTORE_DB, 'leaveRequests'),
                where('userId', '==', user.uid),
                where('status', '==', 'Approved')
            );

            const querySnapshot = await getDocs(leaveQuery);
            const leaveData = {};

            // processing each leave request
            querySnapshot.forEach(doc => {
                const leave = doc.data();
                const startDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);

                // Marking all days in the leave period
                const currentDate = new Date(startDate);
                while (currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];

                    leaveData[dateStr] = {
                        leaveType: leave.leaveType,
                        status: 'leave'
                    };

                    // Move to next day
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });

            return leaveData;
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            return {};
        }
    }

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
                    key={`${selectedYear}-${selectedMonth}-${JSON.stringify(attendanceData)}`}
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
                    markedDates={getCurrentMonthDays()} // <-- now it's dynamic
                    current={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`}
                    onDayPress={(day) => {
                        setSelectedDate(day.dateString);
                        Alert.alert(
                            'Select Option',
                            `What would you like to do for ${day.dateString}?`,
                            [
                                { text: 'Add Task', onPress: () => setModalVisible(true) },
                                { text: 'View Tasks', onPress: () => viewTasksForDate(day.dateString) },
                                { text: 'Cancel', style: 'cancel' }
                            ]
                        );
                    }}
                />

                {/* Calendar Legend */}
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#DC143C' }]} />
                        <Text style={styles.legendText}>Leave Day</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: '#007AFF' }]} />
                        <Text style={styles.legendText}>Paid Holiday</Text>
                    </View>
                </View>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
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
        marginTop: 5,
        textAlign: 'justify',
        fontStyle: 'italic',
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
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
    // Calendar legend styles
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 15,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendColor: {
        width: 16,
        height: 16,
        borderRadius: 8,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#666',
    }
});
