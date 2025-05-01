import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { getDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks } from 'date-fns';
import { Icon } from 'react-native-elements';

export default function Attendance({ navigation }) {
    const [username, setUsername] = useState('');
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);
    const [workedHours, setWorkedHours] = useState(null);
    const [totalWorkedMinutes, setTotalWorkedMinutes] = useState(0); // Used in calculations
    const [isCheckInDisabled, setIsCheckInDisabled] = useState(false);
    const [isCheckOutDisabled, setIsCheckOutDisabled] = useState(true);

    // Week selection for attendance records
    const currentDate = new Date();
    const [selectedWeek, setSelectedWeek] = useState(currentDate);
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

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

    // Fetch weekly attendance records when selected week changes
    useEffect(() => {
        console.log('Selected week changed:', selectedWeek);
        fetchWeeklyAttendance();
    }, [selectedWeek]);

    const fetchAttendance = async () => {
        if (!user) return;

        try {
            const todayDate = new Date().toLocaleDateString();

            // document ID includes user ID and date. A unique document for each user for each day created
            const docId = `${user.uid}_${todayDate.replace(/\//g, '-')}`;

            // Reference to today's attendance document
            const docRef = doc(FIRESTORE_DB, 'attendance', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Document exists for today, use its data
                const data = docSnap.data();
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
            } else {
                // No document exists for today, reset UI
                console.log("No attendance record found for today.");
                setCheckInTime(null);
                setCheckOutTime(null);
                setWorkedHours('');
                setTotalWorkedMinutes(0);
                setIsCheckInDisabled(false);
                setIsCheckOutDisabled(true);
            }
        } catch (error) {
            console.error("Error fetching attendance:", error);
        }
    };

    // Check-In
    const handleCheckIn = async () => {
        if (!user) return;

        try {
            const checkInTimestamp = new Date().toISOString();
            const todayDate = new Date().toLocaleDateString();

            // Create a document ID that includes the user ID and date
            const docId = `${user.uid}_${todayDate.replace(/\//g, '-')}`;

            setCheckInTime(checkInTimestamp);
            setCheckOutTime(null);
            setIsCheckInDisabled(true);
            setIsCheckOutDisabled(false);

            // Reference to today's attendance document
            const docRef = doc(FIRESTORE_DB, 'attendance', docId);

            // Create a new document for today with check-in data
            await setDoc(docRef, {
                checkInTime: checkInTimestamp,
                checkOutTime: null,
                workedHours: '0 hrs 0 mins',
                totalWorkedMinutes: 0,
                userId: user.uid,
                email: user.email,
                username: username,
                date: todayDate,
                timestamp: new Date(),
                docId: docId,
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
            const todayDate = new Date().toLocaleDateString();

            // document ID that includes the user ID and date
            const docId = `${user.uid}_${todayDate.replace(/\//g, '-')}`;

            // Calculate time worked for this session
            const diffMs = new Date(checkOutTimestamp) - new Date(checkInTime);
            const session = Math.floor(diffMs / (1000 * 60));

            // Calculate total hours and minutes for display
            const totalHours = Math.floor(session / 60);
            const remainingMinutes = session % 60;
            const totalWorkedDuration = `${totalHours} hrs ${remainingMinutes} mins`;

            // Session duration calculation removed as it's not needed

            // Reference to today's attendance document
            const attendanceRef = doc(FIRESTORE_DB, 'attendance', docId);

            // Update today's document with check-out data
            await updateDoc(attendanceRef, {
                checkOutTime: checkOutTimestamp,
                workedHours: totalWorkedDuration,
                totalWorkedMinutes: session
            });

            setCheckOutTime(checkOutTimestamp);
            setWorkedHours(totalWorkedDuration);
            setTotalWorkedMinutes(session);

            Alert.alert(
                "Success",
                `Checked Out - ${formatDateTime(checkOutTimestamp)}!\nWorked Hours: ${totalWorkedDuration}`
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

    // function to format only time part of date strings
    const formatTimeOnly = (dateTimeString) => {
        if (!dateTimeString) return null;

        try {
            const date = new Date(dateTimeString);
            return format(date, 'HH:mm');
        } catch (error) {
            console.error('Error formatting time:', error);
            return null;
        }
    };

    /**
     * Fetches attendance record for a specific date
     * @param {string} date - The date in format MM/DD/YYYY or a Date object
     * @returns {Promise<Object|null>} - The attendance record or null if not found
     */
    const fetchAttendanceForDate = async (date) => {
        if (!user) return null;

        try {
            let formattedDate;

            // Handle different date formats
            if (date instanceof Date) {
                // If Date object, convert to local date string
                formattedDate = date.toLocaleDateString();
            }
            else if (typeof date === 'string') {
                // string, use directly
                formattedDate = date;
            }
            else {
                console.error('Invalid date format provided');
                return null;
            }

            // Format the date to match the document ID format
            const docId = `${user.uid}_${formattedDate.replace(/\//g, '-')}`;

            console.log(`Fetching attendance for date: ${formattedDate}, docId: ${docId}`);

            // Reference to the specific attendance document
            const docRef = doc(FIRESTORE_DB, 'attendance', docId);

            // Get the document
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                // Return the attendance data
                console.log(`Found attendance record for ${formattedDate}`);
                return docSnap.data();
            } else {
                console.log(`No attendance record found for ${formattedDate}`);
                return null;
            }
        } catch (error) {
            console.error('Error fetching attendance record:', error);
            return null;
        }
    };

    // Function to fetch weekly attendance records
    const fetchWeeklyAttendance = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            // Ensure selectedWeek is a valid Date object
            const weekDate = new Date(selectedWeek);

            // Create date range for the selected week (Sunday to Saturday)
            console.log('Fetching weekly attendance, selectedWeek:', selectedWeek);
            console.log('Converted weekDate:', weekDate);

            // Use consistent options for both start and end of week
            const start = startOfWeek(weekDate, { weekStartsOn: 0 });
            const end = endOfWeek(weekDate, { weekStartsOn: 0 });

            console.log('Week range:', start, 'to', end);

            // Get all days in the week
            const daysInWeek = eachDayOfInterval({ start, end });

            // Initialize attendance data with empty values for all days
            const initialAttendance = daysInWeek.map(day => ({
                date: format(day, 'yyyy-MM-dd'),
                formattedDate: format(day, 'dd-MM'), // day and month
                dayOfWeek: format(day, 'EEE'),
                checkInTime: null,
                checkOutTime: null,
                workedHours: 'N/A',
                totalWorkedMinutes: 0
            }));

            // More efficient approach: Fetch attendance records for each day in the week
            const attendanceData = {};

            // Process each day in the week
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
                            workedHours: attendanceRecord.workedHours || 'N/A',
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

    // Function to go to current week
    const goToCurrentWeek = () => {
        setSelectedWeek(new Date());
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
        <View style={styles.mainContainer}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Icon name="menu" size={25} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>Attendance</Text>
                    <TouchableOpacity onPress={handleLogout}>
                        <Icon name="logout" size={25} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scrollContainer}>
                    {/* Modern attendance card */}
                    <View style={styles.attendanceCard}>
                        <View style={styles.timeStatusItem}>
                            <Icon name="login" type="material-community" size={24} color="#007AFF" />
                            <View style={styles.timeStatusContent}>
                                <View>
                                    <Text style={styles.timeStatusLabel}>Check-In</Text>
                                </View>
                                <Text style={styles.timeStatusValue}>
                                    {checkInTime ? formatDateTime(checkInTime) : 'Not Checked In'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.timeStatusItem}>
                            <Icon name="logout" type="material-community" size={24} color="#007AFF" />
                            <View style={styles.timeStatusContent}>
                                <View>
                                    <Text style={styles.timeStatusLabel}>Check-Out</Text>
                                </View>
                                <Text style={styles.timeStatusValue}>
                                    {checkOutTime ? formatDateTime(checkOutTime) : 'Not Checked Out'}
                                </Text>
                            </View>
                        </View>

                        {/* Worked hours */}
                        <View style={[styles.timeStatusItem, { marginBottom: 0, paddingBottom: 0, borderBottomWidth: 0 }]}>
                            <Icon name="timer" type="material" size={24} color="#007AFF" />
                            <View style={styles.timeStatusContent}>
                                <View>
                                    <Text style={styles.timeStatusLabel}>Worked Hours</Text>
                                </View>
                                <Text style={styles.timeStatusValue}>
                                    {workedHours ? workedHours : 'N/A'}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Check-in/Check-out buttons */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.checkinButton, isCheckInDisabled && styles.disabledButton]}
                            onPress={handleCheckIn}
                            disabled={isCheckInDisabled}
                        >
                            <View style={styles.buttonContent}>
                                <Icon name="login" type="material-community" size={20} color="white" />
                                <Text style={styles.buttonText}>Check In</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.checkoutButton, isCheckOutDisabled && styles.disabledButton]}
                            onPress={handleCheckOut}
                            disabled={isCheckOutDisabled}
                        >
                            <View style={styles.buttonContent}>
                                <Icon name="logout" type="material-community" size={20} color="white" />
                                <Text style={styles.buttonText}>Check Out</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Weekly Attendance Records Section */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Icon name="calendar" type="material-community" size={24} color="#007AFF" />
                            <Text style={styles.sectionTitle}>Weekly Attendance Record</Text>
                        </View>

                        {/* Week Navigation */}
                        <View style={styles.weekNavigation}>
                            <TouchableOpacity
                                style={styles.weekNavButton}
                                onPress={goToPreviousWeek}
                            >
                                <Icon name="chevron-left" type="material-community" size={24} color="#007AFF" />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.currentWeekButton}
                                onPress={goToCurrentWeek}
                            >
                                <Text style={styles.currentWeekText}>
                                    {(() => {
                                        try {
                                            const weekDate = new Date(selectedWeek);
                                            // Ensure valid date
                                            if (isNaN(weekDate.getTime())) {
                                                return 'Current Week';
                                            }
                                            const start = startOfWeek(weekDate, { weekStartsOn: 0 });
                                            const end = endOfWeek(weekDate, { weekStartsOn: 0 });
                                            return `${format(start, 'dd MMM')} - ${format(end, 'dd MMM yyyy')}`;
                                        } catch (error) {
                                            console.error('Error formatting week dates:', error);
                                            return 'Current Week';
                                        }
                                    })()}
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.weekNavButton}
                                onPress={goToNextWeek}
                            >
                                <Icon name="chevron-right" type="material-community" size={24} color="#007AFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Attendance Records Table */}
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                        ) : (
                            <View style={styles.tableContainer}>
                                {/* Table Header */}
                                <View style={styles.tableHeader}>
                                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Day</Text>
                                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Date</Text>
                                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Check-In</Text>
                                    <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Check-Out</Text>
                                    <Text style={[styles.tableHeaderCell, { flex: 1.5 }]}>Hours</Text>
                                </View>

                                {/* Table Rows */}
                                {weeklyAttendance.map((record, index) => {
                                    // Check if it's a weekend (Saturday or Sunday)
                                    const isWeekend = record.dayOfWeek === 'Sat' || record.dayOfWeek === 'Sun';

                                    // Determine what to display for check-in
                                    let checkInDisplay;
                                    if (record.checkInTime) {
                                        // If checked in, always show the time
                                        checkInDisplay = formatTimeOnly(record.checkInTime);
                                    } else {
                                        // If not checked in, show "H" for weekends, "-" for weekdays
                                        checkInDisplay = isWeekend ? 'H' : '-';
                                    }

                                    // Determine what to display for check-out
                                    let checkOutDisplay;
                                    if (record.checkOutTime) {
                                        // If checked out, always show the time
                                        checkOutDisplay = formatTimeOnly(record.checkOutTime);
                                    } else {
                                        // If not checked out, show "H" for weekends, "-" for weekdays
                                        checkOutDisplay = isWeekend ? 'H' : '-';
                                    }

                                    // Determine what to display for worked hours
                                    let hoursDisplay;
                                    if (record.workedHours !== 'N/A') {
                                        // If there are worked hours, show them
                                        hoursDisplay = record.workedHours;
                                    } else {
                                        // If no worked hours, show "H" for weekends, "-" for weekdays
                                        hoursDisplay = isWeekend ? 'H' : '-';
                                    }

                                    return (
                                        <View
                                            key={record.date}
                                            style={[
                                                styles.tableRow,
                                                index % 2 === 0 ? styles.evenRow : styles.oddRow
                                            ]}
                                        >
                                            <Text style={[styles.tableCell, { flex: 1.5 }]}>{record.dayOfWeek}</Text>
                                            <Text style={[styles.tableCell, { flex: 1.5 }]}>{record.formattedDate}</Text>
                                            <Text style={[styles.tableCell, { flex: 2 }]}>
                                                {checkInDisplay}
                                            </Text>
                                            <Text style={[styles.tableCell, { flex: 2 }]}>
                                                {checkOutDisplay}
                                            </Text>
                                            <Text style={[styles.tableCell, { flex: 1.5 }]}>
                                                {hoursDisplay}
                                            </Text>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* Export Button */}
                        <TouchableOpacity
                            style={styles.exportButton}
                            onPress={() => Alert.alert('Export', 'Export functionality will be implemented soon!')}
                        >
                            <View style={styles.buttonContent}>
                                <Icon name="download" type="material-community" size={20} color="white" />
                                <Text style={styles.buttonText}>Export Records</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
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

    // Modern attendance card
    attendanceCard: {
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
        marginBottom: 10,
    },
    timeStatusItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    timeStatusContent: {
        marginLeft: 15,
        flex: 1,
    },
    timeStatusLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 0,
    },
    // timeStatusLabelSecondLine: {
    //     fontSize: 14,
    //     color: '#666',
    //     fontWeight: 'bold',
    //     marginBottom: 3,
    // },
    timeStatusValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },

    // Button styles
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    checkinButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        width: 155,
        shadowColor: '#007AFF',
    },
    checkoutButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        width: 155,
    },
    disabledButton: {
        backgroundColor: '#A9A9A9',
        shadowOpacity: 0.1,
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Weekly Attendance Records Section
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
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 10,
    },
    weekNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    weekNavButton: {
        padding: 8,
        borderRadius: 8,
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

    // Table styles
    tableContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 15,
        marginLeft: -5,
        marginRight: -5,
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
    evenRow: {
        backgroundColor: '#f9f9f9',
    },
    oddRow: {
        backgroundColor: 'white',
    },
    tableCell: {
        fontSize: 13,
        textAlign: 'center',
    },

    // Export button
    exportButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignSelf: 'center',
        width: '60%',
    },

    // Loading indicator
    loader: {
        marginVertical: 20,
    },
});
