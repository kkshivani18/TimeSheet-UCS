import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, FlatList, Platform, ScrollView } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, query, getDocs, where, orderBy, addDoc, updateDoc, doc } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { Icon } from 'react-native-elements';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { parse, isValid } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {API_URL} from '@env';

export default function AdminAttendance({ navigation }) {
    const [isAdmin, setIsAdmin] = useState(false);
    const [username, setUsername] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    // Week selection for attendance records
    const currentDate = new Date();
    const [selectedWeek, setSelectedWeek] = useState(currentDate);
    const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);
    const [paidHolidays, setPaidHolidays] = useState({});

    // regularize requests
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loadingRequests, setLoadingRequests] = useState(false);

    useEffect(() => {
        checkAdminAccess();
        fetchUsers();
        fetchPendingRequests();
    }, []);

    useEffect(() => {
        fetchPaidHolidays();
    }, [selectedYear]);

    useEffect(() => {
        if (selectedUser) {
            fetchWeeklyAttendance();
        }
    }, [selectedUser, selectedWeek]);

    // Check if current user is admin
    const checkAdminAccess = async () => {
        try {
            const role = await AsyncStorage.getItem('role');
            const userId = await AsyncStorage.getItem('userId');
            
            if (!userId) {
                navigation.replace('Login');
                return;
            }

            setIsAdmin(role === 'admin');
            if (role !== 'admin') {
                Alert.alert('Access Denied', 'Only admins can access this screen');
                navigation.replace('Dashboard');
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
            Alert.alert('Error', 'Failed to verify admin access');
        }
    };

    // fetch all users
    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/admin/users`);
            const usersList = response.data.map(user => ({
                id: user._id || user.userId,
                userId: user.userId || user._id,
                username: user.username || 'User',
                email: user.email,
                ...user
            }));
            setUsers(usersList);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to load users');
        }
    };

    // handle user selection
    const handleUserChange = (userId) => {
        console.log('Selected userId:', userId);
        const user = users.find(u => u.userId === userId || u.id === userId);
        console.log('Found user:', user);
        setSelectedUser(user);
    };

    // fetch attendance for a specific date
    const fetchAttendanceForDate = async (formattedDate) => {
        if (!selectedUser) return null;

        try {
            const response = await axios.get(`${API_URL}/api/attendance/user/${selectedUser.id}/date/${formattedDate}`);
            return response.data;
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

    // fetch paid holidays
    const fetchPaidHolidays = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/holidays/${selectedYear}`);
            
            const holidaysMap = {};
            response.data.forEach(holiday => {
                const [day, month] = holiday.date.split('-');
                const holidayDateFormatted = `${selectedYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                holidaysMap[holidayDateFormatted] = holiday.description;
            });
            setPaidHolidays(holidaysMap);
        } catch (error) {
            console.error('Error fetching holidays:', error);
        }
    };

    // fetch weekly attendance records
    const fetchWeeklyAttendance = async () => {
        if (!selectedUser) return;

        try {
            setIsLoading(true);
            const start = startOfWeek(selectedWeek, { weekStartsOn: 1 });
            const end = endOfWeek(selectedWeek, { weekStartsOn: 1 });
            const daysInWeek = eachDayOfInterval({ start, end });

            console.log('Fetching attendance for user:', selectedUser);
            console.log('Date range:', format(start, 'yyyy-MM-dd'), 'to', format(end, 'yyyy-MM-dd'));

            const response = await axios.get(`${API_URL}/api/attendance/user/${selectedUser.userId}/range`, {
                params: {
                    startDate: format(start, 'yyyy-MM-dd'),
                    endDate: format(end, 'yyyy-MM-dd')
                },
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });

            console.log('Attendance API response:', response.data);
            const attendanceRecords = response.data || [];
            
            // initial attendance structure - matching your renderAttendanceRow expectations
            const initialAttendance = daysInWeek.map(day => {
                const dateKey = format(day, 'yyyy-MM-dd');
                const dayName = format(day, 'EEEE');
                const isWeekend = dayName === 'Saturday' || dayName === 'Sunday';
                const holidayDescription = paidHolidays[dateKey];

                return {
                    date: dateKey,
                    day: dayName,
                    dayOfWeek: format(day, 'EEE'), // This matches your renderAttendanceRow
                    formattedDate: format(day, 'dd-MM'), // This matches your renderAttendanceRow
                    checkInTime: null,
                    checkOutTime: null,
                    workedHours: null,
                    totalWorkedMinutes: 0,
                    isWeekend,
                    isHoliday: !!holidayDescription,
                    holidayDescription
                };
            });

            // map attendance records to the structure
            const updatedAttendance = initialAttendance.map(day => {
                const record = attendanceRecords.find(r => r.date === day.date);
                if (record) {
                    return {
                        ...day,
                        checkInTime: record.checkInTime,
                        checkOutTime: record.checkOutTime,
                        workedHours: record.workedHours,
                        totalWorkedMinutes: record.totalWorkedMinutes || 0
                    };
                }
                return day;
            });

            console.log('Final attendance data:', updatedAttendance);
            setWeeklyAttendance(updatedAttendance);
        } catch (error) {
            console.error('Error fetching weekly attendance:', error);
            Alert.alert('Error', 'Failed to load attendance records');
        } finally {
            setIsLoading(false);
        }
    };

    // navigate to previous week
    const goToPreviousWeek = () => {
        setSelectedWeek(prevWeek => subWeeks(prevWeek, 1));
    };

    // navigate to next week
    const goToNextWeek = () => {
        setSelectedWeek(prevWeek => addWeeks(prevWeek, 1));
    };

    // format date-time for display
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString || dateTimeString === '-' || dateTimeString === null) return '-';
        
        try {
            // Handle both ISO strings and timestamps
            const date = new Date(dateTimeString);
            if (isNaN(date.getTime())) return '-';
            return format(date, 'HH:mm');
        } catch (error) {
            console.error('Error formatting date:', error, 'Input:', dateTimeString);
            return '-';
        }
    };

    // handle logout
    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userId', 'username', 'role']);
            navigation.replace('Login');
        } catch (error) {
            console.error('Error logging out:', error);
            navigation.replace('Login');
        }
    };

    // const handleHolidaysUpload = async (holidays) => {
    //     try {
    //         console.log('Starting file picker...');
    //         setIsLoading(true);

    //         // expo DocumentPicker for mobile platforms
    //         const result = await DocumentPicker.getDocumentAsync({
    //             type: '*/*', 
    //             copyToCacheDirectory: true
    //         });

    //         console.log('DocumentPicker result:', result);

    //         if (result.canceled) {
    //             console.log('File picking cancelled');
    //             setIsLoading(false);
    //             return;
    //         }

    //         let file = null;

    //         if (Platform.OS === 'web') {
    //             if (result.output && result.output.length > 0) {
    //                 file = result.output[0]; 
    //             } else if (result.assets && result.assets.length > 0) {
    //                 file = result.assets[0];
    //             }
    //         } else { 
    //             // Native (iOS/Android)
    //             if (result.assets && result.assets.length > 0) {
    //                 file = result.assets[0];
    //             }
    //         }

    //         if (!file) {
    //             console.log('No file selected or file selection failed.');
    //             Alert.alert('File Selection Failed', 'No file was selected or there was an issue picking the file. Please try again.');
    //             setIsLoading(false);
    //             return;
    //         }

    //         let fileContent;

    //         if (Platform.OS === 'web') {
    //             if (file && file.uri) {
    //                try {
    //                     const response = await fetch(file.uri);
    //                     if (!response.ok) {
    //                         throw new Error(`HTTP error! status: ${response.status}`);
    //                     }
    //                     fileContent = await response.text();
    //                 } catch (fetchError) {
    //                     console.error('Error fetching file content from URI:', fetchError);
    //                     Alert.alert('Error', 'Failed to read file content from URI.');
    //                     setIsLoading(false);
    //                     return;
    //                 }
    //             } else if (file instanceof Blob) {
    //                 // Fallback to FileReader if it's a plain Blob/File without a readable URI
    //                 fileContent = await new Promise((resolve, reject) => {
    //                     const reader = new FileReader();
    //                     reader.onload = (event) => resolve(event.target.result);
    //                     reader.onerror = (error) => reject(error);
    //                     reader.readAsText(file);
    //                 });
    //             } else {
    //                 Alert.alert('Error', 'Invalid file object for web processing. Missing URI or Blob.');
    //                 setIsLoading(false);
    //                 return;
    //             }
    //         } else { 
    //             // Native
    //             fileContent = await FileSystem.readAsStringAsync(file.uri);
    //         }
            
    //         console.log('File content:', fileContent);
            
    //         const lines = fileContent.split('\n');
    //         console.log('Number of lines:', lines.length);
            
    //         let successCount = 0;
    //         let errorCount = 0;
    //         let processedHolidays = [];
            
    //         // Skip header row
    //         for (let i = 1; i < lines.length; i++) {
    //             const line = lines[i].trim();
    //             if (!line) continue;

    //             console.log('Processing line:', line);
    //             const [date, description] = line.split(',').map(item => item.trim());
                
    //             if (!date || !description) {
    //                 console.log('Skipping invalid line - missing date or description');
    //                 errorCount++;
    //                 continue;
    //             }

    //             // Parse date (DD/MM/YYYY)
    //             const parsedDate = parse(date, 'dd/MM/yyyy', new Date());
    //             if (!isValid(parsedDate)) {
    //                 console.error(`Invalid date format: ${date}`);
    //                 errorCount++;
    //                 continue;
    //             }

    //             const formattedDate = format(parsedDate, 'dd-MM');
    //             const year = parsedDate.getFullYear();

    //             const holidayData = {
    //                 date: formattedDate,
    //                 description,
    //                 year,
    //                 createdAt: new Date().toISOString(),
    //                 createdBy: FIREBASE_AUTH.currentUser?.email
    //             };

    //             console.log('Adding holidays to MongoDB:', holidayData);

    //             try {
    //                 const response = await axios.post('http://localhost:3000/api/holidays/upload', { holidays });
    //                 if (response.data.success) {
    //                     Alert.alert('Success', 'Holidays uploaded successfully');
    //                 } else {
    //                     Alert.alert('Error', response.data.message || 'Failed to upload holidays');
    //                 }
    //             } catch (error) {
    //                 console.error('Error uploading holidays:', error);
    //                 Alert.alert('Error', 'Failed to upload holidays');
    //             }
    //         };

    //         console.log(`Upload complete. Success: ${successCount}, Errors: ${errorCount}`);
    //         console.log('Processed holidays:', processedHolidays);
            
    //         if (successCount > 0) {
    //             Alert.alert(
    //                 'Success', 
    //                 `Successfully uploaded ${successCount} holidays${errorCount > 0 ? ` (${errorCount} errors)` : ''}\n\nFirst few holidays:\n${processedHolidays.slice(0, 3).map(h => `${h.date}: ${h.description}`).join('\n')}`
    //             );
                
    //             // Verify the upload by fetching the holidays
    //             console.log('Verifying upload by fetching holidays...');
    //             await fetchPaidHolidays();
    //             console.log('Current paid holidays:', paidHolidays);
                
    //             await fetchWeeklyAttendance();
    //         } else {
    //             Alert.alert('Error', 'No holidays were uploaded');
    //         }
    //     } catch (error) {
    //         console.error('Error in handleHolidaysUpload:', error);
    //         Alert.alert('Error', `Failed to upload holidays file: ${error.message}`);
    //     } finally {
    //         setIsLoading(false);
    //     }
    // };


    // holiday upload
    const handleHolidaysUpload = async () => {
        try {
            console.log('Starting file picker...');
            setIsLoading(true);

            // expo DocumentPicker for mobile platforms
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*', 
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
                    file = result.output[0]; 
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
            
            // skip header row
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

                const userId = await AsyncStorage.getItem('userId');
                const formattedDate = format(parsedDate, 'dd-MM');
                const year = parsedDate.getFullYear();

                const holidayData = {
                    date: formattedDate,
                    description,
                    year,
                    createdAt: new Date().toISOString(),
                    createdBy: `${userId}`
                };

                processedHolidays.push(holidayData);
                successCount++;
            }

            console.log('Processed holidays:', processedHolidays);

            if (processedHolidays.length === 0) {
                Alert.alert('Error', 'No valid holidays found in the file');
                setIsLoading(false);
                return;
            }

            // Send the processed holidays array to the backend
            try {
                const response = await axios.post(`${API_URL}/api/holidays/upload`, { 
                    holidays: processedHolidays 
                });
                
                if (response.data.success) {
                    Alert.alert('Success', `Successfully uploaded ${successCount} holidays${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
                    
                    // Refresh the holidays data
                    await fetchPaidHolidays();
                    if (selectedUser) {
                        await fetchWeeklyAttendance();
                    }
                } else {
                    Alert.alert('Error', response.data.message || 'Failed to upload holidays');
                }
            } catch (uploadError) {
                console.error('Error uploading holidays:', uploadError);
                Alert.alert('Error', 'Failed to upload holidays to server');
            }

        } catch (error) {
            console.error('Error in handleHolidaysUpload:', error);
            Alert.alert('Error', `Failed to upload holidays file: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };


    // renderAttendanceRow func to include holiday styling
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

        // worked hours
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

        // row style based on various conditions
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

        // text style based on the content
        const getTextStyle = (content) => {
            if (content === 'H' && (isHoliday || isWeekend)) {
                return styles.weekendText;
            } else if (isPartialDay && !isHoliday && !isWeekend) {
                return styles.partialDayText;
            }
            return null;
        };

        return (
            <View style={rowStyle} key={item.date || index}>
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

    // regularize attendance
    useEffect(() => {
        const getRequests = async () => {
            setLoadingRequests(true);
            try {
                const response = await axios.get(`${API_URL}/api/attendance/regularization/pending`);
                setPendingRequests(response.data);
            } catch (error) {
                console.error('Error fetching regularization requests:', error);
            } finally {
                setLoadingRequests(false);
            }
        };
        getRequests();
    }, []);

    const getUsernameById = (userId) => {
        const user = users.find(u => u.userId === userId || u._id === userId || u.id === userId);
        return user ? user.username : 'Unknown User';
    };

    // fetch pending reg reqs
    const fetchPendingRequests = async () => {
        try {
            setLoadingRequests(true);
            const response = await axios.get(`${API_URL}/api/attendance/regularization/pending`);
            setPendingRequests(response.data);
        } catch (error) {
            console.error('Error fetching regularization requests:', error);
            setPendingRequests([]);
        } finally {
            setLoadingRequests(false);
        }
    };

    const approveRegularizationRequest = async (request) => {
        try {
            // Parse the regularization date properly
            const [month, day, year] = request.regularization_date.split('/');
            const requestDate = new Date(year, month - 1, day);
            
            // Create proper ISO strings
            const checkInDate = new Date(requestDate);
            checkInDate.setHours(9, 0, 0, 0);
            
            const checkOutDate = new Date(requestDate);
            checkOutDate.setHours(18, 0, 0, 0);
            
            await axios.put(`${API_URL}/api/attendance/regularization/${request._id}`, {
                status: 'Approved',
                checkInTime: checkInDate.toISOString(),
                checkOutTime: checkOutDate.toISOString(),
                workedHours: 9,
                totalWorkedMinutes: 540
            });
            
            Alert.alert('Success', 'Regularization approved.');
            fetchPendingRequests();
            // Refresh the attendance data
            if (selectedUser) {
                fetchWeeklyAttendance();
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to approve regularization.');
            console.error(error);
        }
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

            <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
            >
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

                {/* regularize attendance requests */}
                <View style={styles.regularizationSection}>
                    <Text style={[styles.regularizationTitle, { marginBottom: 10 }]}>Pending Regularization Requests</Text>
                    {loadingRequests ? (
                        <ActivityIndicator size="small" color="#007AFF" />
                    ) : pendingRequests.length === 0 ? (
                        <Text style={{ color: '#888', fontStyle: 'italic', marginVertical: 10 }}>No pending requests.</Text>
                    ) : (
                        pendingRequests.map((req) => (
                            <View key={req._id} style={styles.regularizationCard}>
                                <View style={{ marginBottom: 6 }}>
                                    <Text>
                                        <Text style={{ fontWeight: 'bold' }}>User: </Text>
                                        <Text style={{ fontWeight: 'bold' }}>{getUsernameById(req.userId)}</Text>
                                    </Text>
                                    <Text>
                                        <Text style={{ fontWeight: 'normal' }}>UserId: </Text>
                                        <Text style={{ fontWeight: 'normal' }}>{req.userId}</Text>
                                    </Text>
                                    <Text>
                                        <Text style={{ fontWeight: 'normal' }}>Date: </Text>
                                        <Text style={{ fontWeight: 'normal' }}>{req.regularization_date}</Text>
                                    </Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.approveButton}
                                    onPress={() => approveRegularizationRequest(req)}
                                >
                                    <Text style={styles.approveButtonText}>Approve</Text>
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
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
                                    {format(startOfWeek(selectedWeek, { weekStartsOn: 1 }), 'dd MMM')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 1 }), 'dd MMM yyyy')}
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
                            {/* <FlatList
                                data={weeklyAttendance}
                                keyExtractor={(item) => item.date}
                                renderItem={renderAttendanceRow}
                                showsVerticalScrollIndicator={false}
                            /> */}
                            <View style={styles.tableContainer}>
                              {weeklyAttendance.map((item, index) => renderAttendanceRow({ item, index }))}
                            </View>
                        </View>
                    )}
                    </View>
                )}
            </ScrollView>
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
        // width: '100%'
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
        width: '100%',
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
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        width: '100%'
    },
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
        maxWidth: 900,
        alignSelf: 'center',
        // flex: 1,
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
        maxWidth: 500,
        alignSelf: 'center',
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
    regularizationSection: {
        width: '100%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.10,
        shadowRadius: 3,
        elevation: 2,
        maxWidth: 500,
        alignSelf: 'center',
    },
    regularizationTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    regularizationCard: {
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        backgroundColor: '#F3F8FF',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        elevation: 1,
    },
    regularizationText: {
        fontSize: 15,
        color: '#333',
        marginBottom: 6,
    },
    approveButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 18,
        borderRadius: 6,
        alignItems: 'center',
        marginRight: 10,
    },
    approveButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
});
