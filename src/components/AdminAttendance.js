import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList, Platform } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, query, getDocs, where, orderBy, addDoc } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { Icon } from 'react-native-elements';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parse, isValid } from 'date-fns';

export default function AdminAttendance({ navigation }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [username, setUsername] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Week selection for attendance records
    const currentDate = new Date();
    const [selectedWeek, setSelectedWeek] = useState(currentDate);
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);
    const [paidHolidays, setPaidHolidays] = useState({});

    useEffect(() => {
        checkAdminAccess();
        fetchUsers();
        fetchPaidHolidays();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            fetchWeeklyAttendance();
        }
    }, [selectedUser, selectedWeek]);

    // Check if current user is admin
    const checkAdminAccess = async () => {
        try {
            const currentUser = FIREBASE_AUTH.currentUser;
            if (!currentUser) {
                navigation.replace('Login');
                return;
            }

            const userDoc = await getDocs(
                query(
                    collection(FIRESTORE_DB, 'users'),
                    where('email', '==', currentUser.email)
                )
            );

            if (!userDoc.empty) {
                const userData = userDoc.docs[0].data();
                setUsername(userData.username);
                setIsAdmin(userData.role === 'admin');
                if (userData.role !== 'admin') {
                    Alert.alert('Access Denied', 'Only admins can access this screen');
                    navigation.replace('Dashboard');
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            Alert.alert('Error', 'Failed to verify admin access');
        }
    };

    // Fetch all users
    const fetchUsers = async () => {
        try {
            const usersQuery = query(
                collection(FIRESTORE_DB, 'users'),
                where('role', '==', 'user')
            );
            
            const querySnapshot = await getDocs(usersQuery);
            const usersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users');
        }
    };

    // Function to fetch attendance for a specific date
    const fetchAttendanceForDate = async (formattedDate) => {
        if (!selectedUser) return null;

        try {
            // Format the date to match the document ID format
            const docId = `${selectedUser.id}_${formattedDate.replace(/\//g, '-')}`;

            // Query the attendance collection
            const q = query(
                collection(FIRESTORE_DB, 'attendance'),
                where('docId', '==', docId)
            );
            
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                return querySnapshot.docs[0].data();
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error fetching attendance record:', error);
            return null;
        }
    };

    const formatDecimalHoursToHMS = (decimalHours) => {
        if (typeof decimalHours !== 'number' || isNaN(decimalHours)) {
            return '-';
        }

        const totalMinutes = Math.round(decimalHours * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0 && minutes === 0) {
            return '-'; 
        }

        return `${hours}h ${minutes}m`;
    };

    // Function to fetch paid holidays
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

    // Function to fetch weekly attendance records
    const fetchWeeklyAttendance = async () => {
        if (!selectedUser) return;

        setIsLoading(true);
        try {
            // Ensure selectedWeek is a valid Date object
            const weekDate = new Date(selectedWeek);

            // Create date range for the selected week (Sunday to Saturday)
            const start = startOfWeek(weekDate, { weekStartsOn: 0 });
            const end = endOfWeek(weekDate, { weekStartsOn: 0 });

            // Get all days in the week
            const daysInWeek = eachDayOfInterval({ start, end });

            // Initialize attendance data with empty values for all days
            const initialAttendance = daysInWeek.map(day => {
                const formattedDate = format(day, 'dd-MM-yyyy');
                return {
                    date: format(day, 'yyyy-MM-dd'),
                    formattedDate: format(day, 'dd-MM'),
                    dayOfWeek: format(day, 'EEE'),
                    checkInTime: null,
                    checkOutTime: null,
                    workedHours: '-',
                    totalWorkedMinutes: 0,
                    isHoliday: !!paidHolidays[formattedDate],
                    holidayDescription: paidHolidays[formattedDate] || null
                };
            });

            // Process each day in the week
            const attendanceData = {};
            for (const day of daysInWeek) {
                try {
                    // Format the date to match what's stored in Firestore
                    const dateFormatted = day.toLocaleDateString();

                    // Fetch attendance for this specific day
                    const attendanceRecord = await fetchAttendanceForDate(dateFormatted);

                    if (attendanceRecord) {
                        // If record exists, add it to our data
                        const dateKey = format(day, 'yyyy-MM-dd');
                        attendanceData[dateKey] = {
                            checkInTime: attendanceRecord.checkInTime,
                            checkOutTime: attendanceRecord.checkOutTime,
                            workedHours: attendanceRecord.workedHours || '-',
                            totalWorkedMinutes: attendanceRecord.totalWorkedMinutes || 0
                        };
                    }
                } catch (error) {
                    console.error(`Error fetching attendance for ${format(day, 'yyyy-MM-dd')}:`, error);
                }
            }

            // Update the initialAttendance array with actual data
            const updatedAttendance = initialAttendance.map(day => {
                const dateKey = day.date;
                if (attendanceData[dateKey]) {
                    return {
                        ...day,
                        checkInTime: attendanceData[dateKey].checkInTime,
                        checkOutTime: attendanceData[dateKey].checkOutTime,
                        workedHours: attendanceData[dateKey].workedHours,
                        totalWorkedMinutes: attendanceData[dateKey].totalWorkedMinutes
                    };
                }
                return day;
            });

            setWeeklyAttendance(updatedAttendance);
        } catch (error) {
            console.error('Error fetching weekly attendance:', error);
            Alert.alert('Error', 'Failed to load attendance records');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to navigate to previous week
    const goToPreviousWeek = () => {
        setSelectedWeek(prevWeek => subWeeks(prevWeek, 1));
    };

    // Function to navigate to next week
    const goToNextWeek = () => {
        setSelectedWeek(prevWeek => addWeeks(prevWeek, 1));
    };

    // Format date-time for display
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return '-';
        const date = new Date(dateTimeString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Handle user selection
    const handleUserChange = (userId) => {
        const user = users.find(u => u.id === userId);

        setSelectedUser(user);
    };

    // Handle logout
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

    const handleHolidaysUpload = async () => {
        try {
            console.log('Starting file picker...');
            setIsLoading(true);

            // Expo DocumentPicker for mobile platforms
            const result = await DocumentPicker.getDocumentAsync({
                type: 'text/csv',
                copyToCacheDirectory: true
            });

            console.log('DocumentPicker result:', result);

            if (result.canceled) {
                console.log('File picking cancelled');
                setIsLoading(false);
                return;
            }

            let file = null;

            if (Platform.OS === 'web') {
                if (result.output && result.output.length > 0) {
                    file = result.output[0]; // File/Blob
                } else if (result.assets && result.assets.length > 0) {
                    file = result.assets[0];
                }
            } else { 
                // Native (iOS/Android)
                if (result.assets && result.assets.length > 0) {
                    file = result.assets[0];
                }
            }

            if (!file) {
                console.log('No file selected or file selection failed.');
                Alert.alert('File Selection Failed', 'No file was selected or there was an issue picking the file. Please try again.');
                setIsLoading(false);
                return;
            }

            let fileContent;

            if (Platform.OS === 'web') {
                if (file && file.uri) {
                   try {
                        const response = await fetch(file.uri);
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        fileContent = await response.text();
                    } catch (fetchError) {
                        console.error('Error fetching file content from URI:', fetchError);
                        Alert.alert('Error', 'Failed to read file content from URI.');
                        setIsLoading(false);
                        return;
                    }
                } else if (file instanceof Blob) {
                    // Fallback to FileReader if it's a plain Blob/File without a readable URI
                    fileContent = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (event) => resolve(event.target.result);
                        reader.onerror = (error) => reject(error);
                        reader.readAsText(file);
                    });
                } else {
                    Alert.alert('Error', 'Invalid file object for web processing. Missing URI or Blob.');
                    setIsLoading(false);
                    return;
                }
            } else { 
                // Native
                fileContent = await FileSystem.readAsStringAsync(file.uri);
            }
            
            console.log('File content:', fileContent);
            
            const lines = fileContent.split('\n');
            console.log('Number of lines:', lines.length);
            
            let successCount = 0;
            let errorCount = 0;
            let processedHolidays = [];
            
            // Skip header row
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                console.log('Processing line:', line);
                const [date, description] = line.split(',').map(item => item.trim());
                
                if (!date || !description) {
                    console.log('Skipping invalid line - missing date or description');
                    errorCount++;
                    continue;
                }

                // Parse date (DD/MM/YYYY)
                const parsedDate = parse(date, 'dd/MM/yyyy', new Date());
                if (!isValid(parsedDate)) {
                    console.error(`Invalid date format: ${date}`);
                    errorCount++;
                    continue;
                }

                const formattedDate = format(parsedDate, 'dd-MM-yyyy');
                const year = parsedDate.getFullYear();

                const holidayData = {
                    date: formattedDate,
                    description,
                    year,
                    createdAt: new Date().toISOString(),
                    createdBy: FIREBASE_AUTH.currentUser?.email
                };

                console.log('Adding holiday to Firestore:', holidayData);

                try {
                    // Add to Firestore
                    const docRef = await addDoc(collection(FIRESTORE_DB, 'paidHolidays'), holidayData);
                    console.log('Successfully added holiday with ID:', docRef.id);
                    successCount++;
                    processedHolidays.push(holidayData);
                } catch (firestoreError) {
                    console.error('Error adding to Firestore:', firestoreError);
                    errorCount++;
                }
            }

            console.log(`Upload complete. Success: ${successCount}, Errors: ${errorCount}`);
            console.log('Processed holidays:', processedHolidays);
            
            if (successCount > 0) {
                Alert.alert(
                    'Success', 
                    `Successfully uploaded ${successCount} holidays${errorCount > 0 ? ` (${errorCount} errors)` : ''}\n\nFirst few holidays:\n${processedHolidays.slice(0, 3).map(h => `${h.date}: ${h.description}`).join('\n')}`
                );
                
                // Verify the upload by fetching the holidays
                console.log('Verifying upload by fetching holidays...');
                await fetchPaidHolidays();
                console.log('Current paid holidays:', paidHolidays);
                
                await fetchWeeklyAttendance();
            } else {
                Alert.alert('Error', 'No holidays were uploaded');
            }
        } catch (error) {
            console.error('Error in handleHolidaysUpload:', error);
            Alert.alert('Error', `Failed to upload holidays file: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Modify the renderAttendanceRow function to include holiday styling
    const renderAttendanceRow = ({ item, index }) => {
        const isWeekend = item.dayOfWeek === 'Sun' || item.dayOfWeek === 'Sat';
        const isHoliday = item.isHoliday;
        const hasCheckedIn = item.checkInTime !== null && item.checkInTime !== undefined && item.checkInTime !== '';
        const hasCheckedOut = item.checkOutTime !== null && item.checkOutTime !== undefined && item.checkOutTime !== '';

        // Calculate worked hours in numeric form for comparison
        let workedHoursNumeric = 0;
        if (item.totalWorkedMinutes) {
            workedHoursNumeric = item.totalWorkedMinutes / 60;
        }

        // Check if it's a partial day (≤ 4 hours worked)
        const isPartialDay = hasCheckedIn && hasCheckedOut &&
                            workedHoursNumeric > 0 &&
                            workedHoursNumeric <= 4;

        // Determine what to display for check-in
        let checkInDisplay;
        if (hasCheckedIn) {
            checkInDisplay = formatDateTime(item.checkInTime);
        } else if (isHoliday) {
            checkInDisplay = 'H';
        } else if (isWeekend) {
            checkInDisplay = 'H';
        } else {
            checkInDisplay = '-';
        }

        // Determine what to display for check-out
        let checkOutDisplay;
        if (hasCheckedOut) {
            checkOutDisplay = formatDateTime(item.checkOutTime);
        } else if (isHoliday) {
            checkOutDisplay = 'H';
        } else if (isWeekend) {
            checkOutDisplay = 'H';
        } else {
            checkOutDisplay = '-';
        }

        // Determine what to display for worked hours
        let hoursDisplay;
        if (hasCheckedIn && hasCheckedOut) {
            // hoursDisplay = item.workedHours !== 'N/A' ? item.workedHours : '-';
            hoursDisplay = formatDecimalHoursToHMS(workedHoursNumeric);
        } else if (isHoliday) {
            hoursDisplay = 'H';
        } else if (isWeekend) {
            hoursDisplay = 'H';
        } else {
            hoursDisplay = '-';
        }

        // Determine row style based on various conditions
        let rowStyle = [styles.tableRow];

        // background colors based on priority
        if (isHoliday && (hasCheckedIn || hasCheckedOut)) {
            // Holiday with check-in/out - light blue background
            rowStyle.push(styles.holidayWorkRow);
        } else if (isWeekend && (hasCheckedIn || hasCheckedOut)) {
            // Weekend with check-in/out - light blue background
            rowStyle.push(styles.weekendWorkRow);
        } else if (!isWeekend && !isHoliday && isPartialDay) {
            // Partial day (≤ 4 hours) on regular weekday - light orange background
            rowStyle.push(styles.partialDayRow);
        } else if (isHoliday) {
            // Holiday without check-in/out - light blue background
            rowStyle.push(styles.holidayRow);
        } else if (index % 2 === 0) {
            // Even rows - light gray
            rowStyle.push(styles.evenRow);
        } else {
            // Odd rows - white
            rowStyle.push(styles.oddRow);
        }

        // Determine text style based on the content
        const getTextStyle = (content) => {
            if (content === 'H' && (isHoliday || isWeekend)) {
                return styles.weekendText;
            } else if (isPartialDay && !isHoliday && !isWeekend) {
                return styles.partialDayText;
            }
            return null;
        };

        return (
            <View style={rowStyle}>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.dayOfWeek}</Text>
                <Text style={[styles.tableCell, { flex: 1.5 }]}>{item.formattedDate}</Text>
                <Text style={[styles.tableCell, { flex: 2 }, getTextStyle(checkInDisplay)]}>
                    {checkInDisplay}
                </Text>
                <Text style={[styles.tableCell, { flex: 2 }, getTextStyle(checkOutDisplay)]}>
                    {checkOutDisplay}
                </Text>
                <Text style={[styles.tableCell, { flex: 1.5 }, getTextStyle(hoursDisplay)]}>
                    {hoursDisplay}
                </Text>
            </View>
        );
    };

    if (!isAdmin) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Icon name="menu" size={23} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Attendance Management</Text>
                <View style={styles.headerButtons}>
                    <TouchableOpacity onPress={handleLogout}>
                        <Icon name="logout" size={23} color="#333" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.holidayUploadCard}>
                <Text style={styles.holidayUploadTitle}>Upload Holidays (.csv)</Text>
                <TouchableOpacity 
                    style={styles.uploadButton}
                    onPress={handleHolidaysUpload}
                >
                    <Icon name="upload" size={20} color="#007AFF" />
                    <Text style={styles.uploadButtonText}>Upload CSV File</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.userSelectionContainer}>
                <Text style={styles.sectionTitle}>Select Employee:</Text>
                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedUser?.id}
                        onValueChange={handleUserChange}
                        style={styles.picker}
                    >
                        <Picker.Item label="Select an employee" value="" />
                        {users.map(user => (
                            <Picker.Item key={user.id} label={user.username} value={user.id} />
                        ))}
                    </Picker>
                </View>
            </View>

            {selectedUser && (
                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Icon name="access-time" size={20} color="#007AFF" />
                        <Text style={styles.sectionTitle}>
                            Attendance Records for {selectedUser.username}
                        </Text>
                    </View>

                    <View style={styles.weekNavigation}>
                        <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekNavButton}>
                            <Icon name="chevron-left" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.currentWeekButton}>
                            <Text style={styles.currentWeekText}>
                                {format(startOfWeek(selectedWeek, { weekStartsOn: 0 }), 'dd MMM')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 0 }), 'dd MMM yyyy')}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavButton}>
                            <Icon name="chevron-right" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                    ) : (
                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Day</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 1.3 }]}>Date</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Check In</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Check Out</Text>
                                <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Worked Hours</Text>
                            </View>
                            <FlatList
                                data={weeklyAttendance}
                                keyExtractor={(item) => item.date}
                                renderItem={renderAttendanceRow}
                                showsVerticalScrollIndicator={false}
                            />
                        </View>
                    )}
                </View>
            )}
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
        marginBottom: 15,
    },
    title: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    userSelectionContainer: {
        width: '90%',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        marginBottom: 10,
    },
    picker: {
        height: 50,
    },

    // Section container matching Attendance.js
    sectionContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
        width: '100%',
        marginTop: -5,
        marginBottom: 20,
        flex: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    weekNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    weekNavButton: {
        padding: 5,
        borderRadius: 5,
        backgroundColor: '#f0f0f0',
    },
    currentWeekButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
        flex: 1,
        marginHorizontal: 10,
        alignItems: 'center',
    },
    currentWeekText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
    },

    // Table styles matching Attendance.js
    tableContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 15,
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#007AFF',
        padding: 10,
    },
    tableHeaderCell: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        padding: 5,
    },
    tableCell: {
        fontSize: 13,
        textAlign: 'center',
    },
    evenRow: {
        backgroundColor: '#f9f9f9',
    },
    oddRow: {
        backgroundColor: 'white',
    },
    holidayRow: {
        backgroundColor: '#E3F2FD',
    },
    holidayWorkRow: {
        backgroundColor: '#E3F2FD',
    },
    weekendWorkRow: {
        backgroundColor: '#E3F2FD',
    },
    partialDayRow: {
        backgroundColor: '#FFF3E0',
    },
    weekendText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    partialDayText: {
        color: '#FF9800',
        fontWeight: 'bold',
    },

    loader: {
        marginTop: 50,
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        marginRight: 15,
    },
    holidayText: {
        fontSize: 12,
        color: '#1976D2',
        fontStyle: 'italic',
        marginTop: 2,
    },
    holidayUploadCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
        width: '100%',
        marginBottom: 20,
    },
    holidayUploadTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 5,
    },
    uploadButtonText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#007AFF',
        marginLeft: 10,
    },
});
