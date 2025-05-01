import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, FlatList } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, query, getDocs, where, orderBy } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { Icon } from 'react-native-elements';
import { Picker } from '@react-native-picker/picker';

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

    useEffect(() => {
        checkAdminAccess();
        fetchUsers();
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
            const querySnapshot = await getDocs(collection(FIRESTORE_DB, 'users'));
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
            const initialAttendance = daysInWeek.map(day => ({
                date: format(day, 'yyyy-MM-dd'),
                formattedDate: format(day, 'dd-MM'), // day and month
                dayOfWeek: format(day, 'EEE'),
                checkInTime: null,
                checkOutTime: null,
                workedHours: '-',
                totalWorkedMinutes: 0
            }));

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
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={23} color="#333" />
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
                <View style={styles.attendanceContainer}>
                    <Text style={styles.sectionTitle}>
                        Attendance Records for {selectedUser.username}
                    </Text>

                    <View style={styles.weekSelector}>
                        <TouchableOpacity onPress={goToPreviousWeek} style={styles.weekButton}>
                            <Icon name="chevron-left" size={24} color="#007AFF" />
                        </TouchableOpacity>
                        <Text style={styles.weekText}>
                            {format(startOfWeek(selectedWeek, { weekStartsOn: 0 }), 'dd MMM')} - {format(endOfWeek(selectedWeek, { weekStartsOn: 0 }), 'dd MMM yyyy')}
                        </Text>
                        <TouchableOpacity onPress={goToNextWeek} style={styles.weekButton}>
                            <Icon name="chevron-right" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                    ) : (
                        <ScrollView horizontal={true} style={styles.tableContainer}>
                            <View>
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.headerCell, { width: 80 }]}>Date</Text>
                                    <Text style={[styles.headerCell, { width: 80 }]}>Day</Text>
                                    <Text style={[styles.headerCell, { width: 100 }]}>Check In</Text>
                                    <Text style={[styles.headerCell, { width: 100 }]}>Check Out</Text>
                                    <Text style={[styles.headerCell, { width: 120 }]}>Worked Hours</Text>
                                </View>
                                <FlatList
                                    data={weeklyAttendance}
                                    keyExtractor={(item) => item.date}
                                    renderItem={({ item }) => {
                                        // Determine if it's a weekend
                                        const isWeekend = item.dayOfWeek === 'Sat' || item.dayOfWeek === 'Sun';
                                        
                                        // For weekends with no attendance, show 'H'
                                        const displayedHours = isWeekend && !item.checkInTime ? 'H' : item.workedHours;
                                        
                                        return (
                                            <View style={styles.tableRow}>
                                                <Text style={[styles.cell, { width: 80 }]}>{item.formattedDate}</Text>
                                                <Text style={[styles.cell, { width: 80 }]}>{item.dayOfWeek}</Text>
                                                <Text style={[styles.cell, { width: 100 }]}>
                                                    {item.checkInTime ? formatDateTime(item.checkInTime) : '-'}
                                                </Text>
                                                <Text style={[styles.cell, { width: 100 }]}>
                                                    {item.checkOutTime ? formatDateTime(item.checkOutTime) : '-'}
                                                </Text>
                                                <Text style={[styles.cell, { width: 120 }]}>
                                                    {displayedHours}
                                                </Text>
                                            </View>
                                        );
                                    }}
                                />
                            </View>
                        </ScrollView>
                    )}
                </View>
            )}
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
        marginBottom: 10,
        alignSelf: 'center',
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
    attendanceContainer: {
        flex: 1,
    },
    weekSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    weekButton: {
        padding: 5,
    },
    weekText: {
        fontSize: 16,
        fontWeight: '500',
    },
    tableContainer: {
        flex: 1,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    headerCell: {
        fontWeight: 'bold',
        paddingHorizontal: 10,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    cell: {
        paddingHorizontal: 10,
    },
    loader: {
        marginTop: 50,
    },
});
