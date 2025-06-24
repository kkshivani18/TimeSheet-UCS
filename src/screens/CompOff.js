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
        fetchMonthlyRecords();
        
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
            });

            setCompOffUnsubscribe(() => unsubscribe);
        } catch (error) {
            console.error('Error fetching comp-off applications:', error);
        }
    };

    const fetchMonthlyRecords = async () => {
        try {
            const user = FIREBASE_AUTH.currentUser;
            if (!user) return;
            
            // month's start and end day
            const startOfCurrentMonth = startOfMonth(selectedMonth);
            const endOfCurrentMonth = endOfMonth(selectedMonth);

            // available hours
            const availableHours = await calculateAvailableHours(user.uid, startOfCurrentMonth, endOfCurrentMonth);
            setTotalAvailableHours(availableHours);
    
            // fetch all paid holidays
            const paidHolidaysQuery = query(
                collection(FIRESTORE_DB, "paidHolidays"),
                where('year', '==', selectedMonth.getFullYear())
            );
            const paidHolidaysSnapshot = await getDocs(paidHolidaysQuery);
            const paidHolidays = {};

            console.log(`Paid Holidays Query Snapshot Size: ${paidHolidaysSnapshot.size}`); 

            paidHolidaysSnapshot.forEach(doc => {
                const holiday = doc.data();
                const [day, month, year] = holiday.date.split('-');
                const holidayDateFormatted = `${year}-${month}-${day}`;
                const holidayDate = startOfDay(new Date(holidayDateFormatted));
                
                if (holidayDate >= startOfDay(startOfCurrentMonth) && holidayDate <= startOfDay(endOfCurrentMonth)) {
                    paidHolidays[holidayDateFormatted] = holiday.description;
                }
            });
    
            // fetch approved leave days
            const leaveQuery = query(
                collection(FIRESTORE_DB, 'leaveRequests'),
                where('userId', '==', user.uid),
                where('status', '==', 'Approved')
            );
            const leaveSnapshot = await getDocs(leaveQuery);
            const leaveDays = {};
            leaveSnapshot.forEach(doc => {
                const leave = doc.data();
                const start = startOfDay(new Date(leave.startDate));
                const end = startOfDay(new Date(leave.endDate));
                let current = startOfDay(new Date(start));
                while (current <= end) {
                    if (current >= startOfDay(startOfCurrentMonth) && current <= startOfDay(endOfCurrentMonth)) {
                        leaveDays[format(current, 'yyyy-MM-dd')] = leave.leaveType;
                    }
                    current.setDate(current.getDate() + 1);
                }
            });
    
            // get all days in the month
            const daysInMonth = eachDayOfInterval({ start: startOfCurrentMonth, end: endOfCurrentMonth });
            const records = [];
            // let totalHours = 0;
    
            // process each day
            for (const day of daysInMonth) {
                const dateStr = format(day, 'yyyy-MM-dd');
                const docId = `${user.uid}_${day.toLocaleDateString().replace(/\//g, '-')}`;
                // const docId = `${user.uid}_${format(day, 'd-M-yyyy')}`;
                
                const docRef = doc(FIRESTORE_DB, 'attendance', docId);
                const docSnap = await getDoc(docRef);
    
                console.log(`Processing day: ${dateStr}, DocId: ${docId}`);

                if (docSnap.exists()) {
                    console.log(`Attendance record found for ${dateStr}`);
                    const data = docSnap.data();
                    const isWeekendDay = isWeekend(day);
                    const isPaidHoliday = paidHolidays[dateStr];
                    const isLeaveDay = leaveDays[dateStr];
                    const workedHours = parseFloat(data.workedHours || 0);
                    const overtimeHours = workedHours > 8 ? workedHours - 8 : 0;
    
                    console.log(`  isWeekendDay: ${isWeekendDay}, isPaidHoliday: ${!!isPaidHoliday}, isLeaveDay: ${!!isLeaveDay}, overtimeHours: ${overtimeHours.toFixed(2)}`);
                    console.log(`  Worked Hours from DB: ${data.workedHours}, CheckInTime: ${data.checkInTime}, CheckOutTime: ${data.checkOutTime}`);

                    // Only add record if employee worked on weekend, holiday, leave day or overtime
                    if (isWeekendDay || isPaidHoliday || isLeaveDay || overtimeHours > 0) {
                        let type = '';
                        let displayHours = '-';
    
                        if (isWeekendDay && workedHours > 0) {
                            type = 'Weekend';
                            displayHours = workedHours.toFixed(2);
                        } else if (isPaidHoliday && workedHours > 0) {
                            type = `Paid Holiday (${paidHolidays[dateStr]})`;
                            displayHours = workedHours.toFixed(2);
                        } else if (isLeaveDay && workedHours > 0) {
                            type = `Leave Day (${leaveDays[dateStr]})`;
                            displayHours = workedHours.toFixed(2);
                        } else if (overtimeHours > 0) {
                            type = `Overtime`;
                            displayHours = overtimeHours.toFixed(2);
                        }
    
                        const record = {
                            day: format(day, 'EEE'),
                            date: format(day, 'dd-MM'),
                            checkIn: data.checkInTime ? format(new Date(data.checkInTime), 'HH:mm') : '-',
                            checkOut: data.checkOutTime ? format(new Date(data.checkOutTime), 'HH:mm') : '-',
                            hours: displayHours,
                            type: type
                        };
                        records.push(record);
                        console.log(`  Record added: ${JSON.stringify(record)}`);
                    } else {
                        console.log(`  Conditions not met for adding record for ${dateStr}`);
                    }
                } else {
                    console.log(`  No attendance record found for ${dateStr}`);
                }
            }
    
            setMonthlyRecords(records);
            // setTotalAvailableHours(totalHours);
            console.log(`Final monthlyRecords length: ${records.length}`);
        } catch (error) {
            console.error('Error fetching monthly records:', error);
        }
    };

    useEffect(() => {
        fetchMonthlyRecords();
    }, [selectedMonth]);

    // func to calculate available hours 
    const calculateAvailableHours = async (userId, startDate, endDate) => {
        try {
            let totalHours = 0;
            console.log(`calculateAvailableHours: userId: ${userId}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);
    
            // Fetch paid holidays for the period
            const paidHolidaysQuery = query(
                collection(FIRESTORE_DB, "paidHolidays"),
                where('year', '==', startDate.getFullYear())
            );
            const paidHolidaysSnapshot = await getDocs(paidHolidaysQuery);
            const paidHolidays = {};
            paidHolidaysSnapshot.forEach(doc => {
                const holiday = doc.data();
                const [day, month, year] = holiday.date.split('-');
                const holidayDateFormatted = `${year}-${month}-${day}`;
                const holidayDate = startOfDay(new Date(holidayDateFormatted)); 

                if (holidayDate >= startOfDay(startDate) && holidayDate <= startOfDay(endDate)) { 
                    paidHolidays[holidayDateFormatted] = holiday.description;
                } 
            });
    
            // Fetch approved leave days
            const leaveQuery = query(
                collection(FIRESTORE_DB, 'leaveRequests'),
                where('userId', '==', userId),
                where('status', '==', 'Approved')
            );
            const leaveSnapshot = await getDocs(leaveQuery);
            const leaveDays = {};
            leaveSnapshot.forEach(doc => {
                const leave = doc.data();
                const start = startOfDay(new Date(leave.startDate));
                const end = startOfDay(new Date(leave.endDate));
                let current = startOfDay(new Date(start));
                while (current <= end) {
                    if (current >= startOfDay(startDate) && current <= startOfDay(endDate)) {
                        leaveDays[format(current, 'yyyy-MM-dd')] = leave.leaveType;
                    }
                    current.setDate(current.getDate() + 1);
                }
            });
    
            // Get all days in the period
            const daysInPeriod = eachDayOfInterval({ start: startDate, end: endDate });
    
            // Process each day
            for (const day of daysInPeriod) {
                const dateStr = format(day, 'yyyy-MM-dd');
                const docId = `${userId}_${day.toLocaleDateString().replace(/\//g, '-')}`;
                // const docId = `${user.uid}_${format(day, 'd-M-yyyy')}`;
                
                const docRef = doc(FIRESTORE_DB, 'attendance', docId);
                const docSnap = await getDoc(docRef);
    
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const isWeekendDay = isWeekend(day);
                    const isPaidHoliday = paidHolidays[dateStr];
                    const isLeaveDay = leaveDays[dateStr];
                    const workedHours = parseFloat(data.workedHours || 0);
                    const overtimeHours = workedHours > 8 ? workedHours - 8 : 0;
    
                    // Calculate hours based on different scenarios
                    if (isWeekendDay && workedHours > 0) {
                        // Full hours worked on weekend
                        totalHours += workedHours;
                    } else if (isPaidHoliday && workedHours > 0) {
                        // Full hours worked on holiday
                        totalHours += workedHours;
                    } else if (isLeaveDay && workedHours > 0) {
                        // Full hours worked during leave
                        totalHours += workedHours;
                    } else if (overtimeHours > 0) {
                        // Only overtime hours (hours worked beyond 8)
                        totalHours += overtimeHours;
                    }
                }
            }
    
            // Subtract approved comp-off hours
            const approvedCompOffQuery = query(
                collection(FIRESTORE_DB, 'compOff'),
                where('userId', '==', userId),
                where('status', '==', 'Approved')
            );
            const approvedCompOffSnapshot = await getDocs(approvedCompOffQuery);
            let totalApprovedHours = 0;
            
            approvedCompOffSnapshot.forEach(doc => {
                const compOff = doc.data();
                const compOffStart = new Date(compOff.startDateTime);
                if (compOffStart >= startOfDay(startDate) && compOffStart <= endOfDay(endDate)) {
                    totalApprovedHours += parseFloat(compOff.duration || 0);
                }
            });

            // available hours (total earned - approved)
            return totalHours - totalApprovedHours;
        } catch (error) {
            console.error('Error calculating available hours:', error);
            return 0;
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
            // Even if there's an error, try to navigate to login
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

    const handleHoursChange = (text) => {
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
            
            // available hours
            const monthStart = startOfMonth(new Date());  
            const monthEnd = endOfMonth(new Date());
            const availableHours = await calculateAvailableHours(user.uid, monthStart, monthEnd);

            // Check if user has enough hours
            if (availableHours < parseFloat(hours)) {
                Alert.alert('Error', `Not enough available comp-off hours. You have ${availableHours.toFixed(2)} hours available.`);
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
                {/* <Text style={styles.requestId}>Request ID: {item.id}</Text> */}
                <Text style={[styles.status, { color: item.status === 'Approved' ? 'green' : item.status === 'Pending' ? 'grey' : 'orange' }]}>
                    {item.status}
                </Text>
            </View>
            <Text style={styles.requestDate}>Request Date: {format(item.requestDate, 'dd-MM-yyyy')}</Text>
            <Text style={styles.dateRange}>
                Date Range: {format(new Date(item.startDateTime), 'dd-MM-yyyy')} to {format(new Date(item.endDateTime), 'dd-MM-yyyy')}
            </Text>
            <Text style={styles.duration}>CompOff Duration: {item.duration} hours</Text>
            <Text style={styles.reason}>Reason: {item.reason}</Text>
        </View>
    );

    const renderMonthlyRecord = ({ item }) => (
        <View style={styles.recordRow}>
            <Text style={styles.recordCell}>{item.day}</Text>
            <Text style={styles.recordCell}>{item.date}</Text>
            <Text style={styles.recordCell}>{item.checkIn}</Text>
            <Text style={styles.recordCell}>{item.checkOut}</Text>
            <Text style={styles.recordCell}>{item.hours}</Text>
            <Text style={styles.recordCell}>{item.type}</Text>
        </View>
    );

    const handlePreviousMonth = () => {
        setSelectedMonth(prev => subMonths(prev, 1));
    };

    const handleNextMonth = () => {
        setSelectedMonth(prev => addMonths(prev, 1));
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

                    <View style={styles.dateContainer}>
                        <Text style={{fontWeight: 'bold'}}>Apply for Hours:</Text>
                        <TextInput
                            style={styles.hoursInput}
                            value={hours}
                            onChangeText={handleHoursChange}
                            placeholder="Enter hours"
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

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Monthly CompOff Record</Text>
                <View style={styles.monthHeader}>
                    <TouchableOpacity onPress={handlePreviousMonth} style={styles.monthArrow}>
                        <Ionicons name="chevron-back" size={24} color="#007AFF" />
                    </TouchableOpacity>
                    <Text style={styles.monthTitle}>
                        {format(selectedMonth, 'MMMM yyyy')}
                    </Text>
                    <TouchableOpacity onPress={handleNextMonth} style={styles.monthArrow}>
                        <Ionicons name="chevron-forward" size={24} color="#007AFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.tableHeader}>
                    <Text style={styles.headerCell}>Day</Text>
                    <Text style={styles.headerCell}>Date</Text>
                    <Text style={styles.headerCell}>Check In</Text>
                    <Text style={styles.headerCell}>Check Out</Text>
                    <Text style={styles.headerCell}>Hours</Text>
                    <Text style={styles.headerCell}>Type</Text>
                </View>
                <FlatList
                    data={monthlyRecords.slice((currentPage - 1) * recordsPerPage, currentPage * recordsPerPage)}
                    renderItem={renderMonthlyRecord}
                    keyExtractor={(item, index) => index.toString()}
                    scrollEnabled={false}
                />
                <View style={styles.pagination}>
                    <TouchableOpacity 
                        onPress={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        <Text style={styles.paginationButton}>Previous</Text>
                    </TouchableOpacity>
                    <Text style={styles.pageNumber}>Page {currentPage}</Text>
                    <TouchableOpacity 
                        onPress={() => setCurrentPage(prev => 
                            prev < Math.ceil(monthlyRecords.length / recordsPerPage) ? prev + 1 : prev
                        )}
                        disabled={currentPage >= Math.ceil(monthlyRecords.length / recordsPerPage)}
                    >
                        <Text style={styles.paginationButton}>Next</Text>
                    </TouchableOpacity>
                </View>
                <View style={styles.totalHoursContainer}>
                    <Text style={styles.totalHours}>Total Available CompOff Hours: {totalAvailableHours.toFixed(2)}</Text>
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
        marginTop: 25,
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
    hoursInput: {
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
    totalHoursContainer: {
        marginTop: 15,
        padding: 10,
        backgroundColor: '#f0f8ff',
        borderRadius: 5,
    },
    totalHours: {
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
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