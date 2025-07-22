import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Modal, Share, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
// import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
// import { getDoc, doc, setDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isWeekend } from 'date-fns';
import XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Icon } from 'react-native-elements';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios'; 

export default function Attendance({ navigation }) {
    const [username, setUsername] = useState('');
    const [checkInTime, setCheckInTime] = useState(null);
    const [checkOutTime, setCheckOutTime] = useState(null);
    const [workedHours, setWorkedHours] = useState(null);
    const [totalWorkedMinutes, setTotalWorkedMinutes] = useState(0);
    const [isCheckInDisabled, setIsCheckInDisabled] = useState(false);
    const [isCheckOutDisabled, setIsCheckOutDisabled] = useState(true);

    // Week and month selection for attendance records
    const currentDate = new Date();
    const [selectedWeek, setSelectedWeek] = useState(currentDate);
    const [selectedMonth, setSelectedMonth] = useState(currentDate);
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);
    const [monthlyAttendance, setMonthlyAttendance] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [leaveDays, setLeaveDays] = useState({});
    const [paidHolidays, setPaidHolidays] = useState({});

    // View type and modal state
    const [viewType, setViewType] = useState('weekly');
    const [modalVisible, setModalVisible] = useState(false);

    // Pagination for monthly view
    const [recordsPerPage] = useState(7);
    const [currentPage, setCurrentPage] = useState(1);

    // regularize attendance
    const [regularizationDate, setRegularizationDate] = useState(new Date())
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isRegularizing, setIsRegularizing] = useState(false);
    const [mode, setMode] = useState('date');
    const [user, setUser] = useState(null);

    // const user = FIREBASE_AUTH.currentUser;

    // useEffect(() => {
    //     const fetchUserData = async () => {
    //         const user = FIREBASE_AUTH.currentUser;
    //         if (user) {
    //             const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
    //             if (userDoc.exists()) {
    //                 setUsername(userDoc.data().username);
    //             } else {
    //                 setUsername('User');
    //             }
    //         } else {
    //             setUsername('Guest');
    //         }
    //     };

    //     fetchUserData();
    //     fetchPaidHolidays();
    // }, []);

    // useEffect(() => {
    //     fetchAttendance();
    // }, []);

    // // fetch weekly attendance 
    // useEffect(() => {
    //     if (viewType === 'weekly') {
    //         fetchWeeklyAttendance();
    //     }
    // }, [selectedWeek, viewType]);

    // // fetch weekly attendance when component first loads
    // useEffect(() => {
    //     fetchWeeklyAttendance();
    // }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const token = await AsyncStorage.getItem('token');
                const userId = await AsyncStorage.getItem('userId');
                if (!userId) {
                  setUsername('Guest');
                  setUser(null);
                  return;
                }
                const response = await axios.get(`http://localhost:3000/api/user/${userId}`, {
                  headers: { Authorization: `Bearer ${token}` }
                });
                setUsername(response.data.username || 'User');
                setUser(response.data)
              } catch (error) {
                setUsername('User');
                console.error('Error fetching user data:', error);
            }
        };

        fetchUserData();
        fetchPaidHolidays();
    }, []);

    useEffect(() => {
        fetchAttendance();
    }, []);

    // fetch monthly attendance
    useEffect(() => {
        if (viewType === 'monthly') {
            fetchMonthlyAttendance();
        }
    }, [selectedMonth, viewType]);

    // fetch weekly attendance 
    useEffect(() => {
        if (viewType === 'weekly') {
            fetchWeeklyAttendance();
        }
    }, [selectedWeek, viewType]);

    // fetch weekly attendance when component first loads
    useEffect(() => {
        fetchWeeklyAttendance();
    }, []);

    const fetchAttendance = async () => {
        try {
            let userId = null;
            if (user && user.userId) {
                userId = user.userId;
            } else {
                userId = await AsyncStorage.getItem('userId');
            }
            if (!userId) {
                console.log('No userId found');
                return;
            }
    
            const today = new Date();
            const formattedDate = format(today, 'yyyy-MM-dd');
            console.log(`Fetching attendance for userId: ${userId}, date: ${formattedDate}`);
            
            const response = await axios.get(`http://localhost:3000/api/attendance/user/${userId}/date/${formattedDate}`, {
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });
            console.log('fetchAttendance response:', response.data);
            const data = response.data;
    
            if (data) {
                console.log('Setting state:', {
                    checkInTime: data.checkInTime,
                    checkOutTime: data.checkOutTime,
                    workedHours: data.workedHours,
                    totalWorkedMinutes: data.totalWorkedMinutes,
                    isCheckInDisabled: !!data.checkInTime,
                    isCheckOutDisabled: !data.checkInTime || !!data.checkOutTime
                });
                setCheckInTime(data.checkInTime || null);
                setCheckOutTime(data.checkOutTime || null);
                setWorkedHours(data.workedHours || null);
                setTotalWorkedMinutes(data.totalWorkedMinutes || 0);
                setIsCheckInDisabled(!!data.checkInTime);
                setIsCheckOutDisabled(!data.checkInTime);
            } else {
                console.log('No attendance data found');
                setCheckInTime(null);
                setCheckOutTime(null);
                setWorkedHours('');
                setTotalWorkedMinutes(0);
                setIsCheckInDisabled(false);
                setIsCheckOutDisabled(true);
            }
        } catch (error) {
            console.error('Error fetching attendance:', error.response?.data || error.message);
            setCheckInTime(null);
            setCheckOutTime(null);
            setWorkedHours('');
            setTotalWorkedMinutes(0);
            setIsCheckInDisabled(false);
            setIsCheckOutDisabled(true);
        }
    };

    // check-in
    const handleCheckIn = async () => {
        try {
            setIsLoading(true);
            const userId = user?.userId || await AsyncStorage.getItem('userId');
            if (!userId) {
                Alert.alert('Error', 'User not authenticated.');
                return;
            }
    
            const now = new Date();
            const formattedDate = format(now, 'yyyy-MM-dd');
            const checkInTime = now.toISOString();
    
            const attendanceData = {
                userId,
                date: formattedDate,
                checkInTime,
                checkOutTime: null,
                workedHours: null,
                totalWorkedMinutes: 0,
            };
            console.log('Sending check-in:', attendanceData);
            const response = await axios.post('http://localhost:3000/api/attendance', attendanceData, {
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });
            console.log('Check-in response:', response.data);
    
            setCheckInTime(checkInTime);
            setIsCheckInDisabled(true);
            setIsCheckOutDisabled(false);
            Alert.alert('Success', 'Check-in successful!');
            
            // Wait briefly to ensure backend sync
            setTimeout(() => {
                fetchAttendance();
            }, 500);
        } catch (error) {
            console.error('Error during check-in:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to check in. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // check-out
    const handleCheckOut = async () => {
        try {
            setIsLoading(true);
            const userId = user?.userId || await AsyncStorage.getItem('userId');
            if (!userId || !checkInTime) return;

            const now = new Date();
            const formattedDate = format(now, 'yyyy-MM-dd');
            const checkOutTime = now.toISOString();
            const checkInDate = new Date(checkInTime);
            const workedMinutes = Math.floor((now - checkInDate) / (1000 * 60));
            const workedHoursNumeric = parseFloat((workedMinutes / 60).toFixed(2));

            const attendanceData = {
                userId,
                date: formattedDate,
                checkInTime, 
                checkOutTime,
                workedHours: workedHoursNumeric,
                totalWorkedMinutes: workedMinutes,
            };

            console.log('Sending check-out:', attendanceData);
            const response = await axios.post('http://localhost:3000/api/attendance', attendanceData, {
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });
            console.log('Check-out response:', response.data);

            setCheckOutTime(checkOutTime);
            setWorkedHours(workedHoursNumeric);
            setTotalWorkedMinutes(workedMinutes);
            Alert.alert('Success', 'Check-out successful!');
            
            setTimeout(() => {
                fetchAttendance();
            }, 500);
        } catch (error) {
            console.error('Error during check-out:', error.response?.data || error.message);
            Alert.alert('Error', 'Failed to check out. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // regularize attendance
    const requestRegularization = async(date) => {
        if (!user) return;
        setIsRegularizing(true);
        try {
            const dateObj = regularizationDate;
            const formattedDate = dateObj.toLocaleDateString();
        
            const docId = `${user.uid}_${formattedDate.replace(/\//g, '-')}`;
            const docRef = doc(FIRESTORE_DB, 'attendance', docId);
            const docSnap = await getDoc(docRef);
        
            const baseData = {
                userId: user.uid,
                docId: docId,
                date: formattedDate,
                checkInTime: null,
                checkOutTime: null,
                workedHours: null,
                totalWorkedMinutes: 0,
                regularization_requested: true,
                regularization_date: formattedDate,
                regularization_status: 'Pending'
            };
        
            if (docSnap.exists()) {
                await updateDoc(docRef, {
                    regularization_requested: true,
                    regularization_date: formattedDate,
                    regularization_status: 'Pending'
                });
            } else {
                await setDoc(docRef, baseData);
            }
            Alert.alert('Request Sent', 'Your regularization request has been sent to admin');
            } catch (e) {
                Alert.alert('Error', 'Failed to send request.');
            } finally {
                setIsRegularizing(false);
            }
    }

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
        if (!dateTimeString) return '-';

        try {
            const date = new Date(dateTimeString);
            return format(date, 'HH:mm');
        } catch (error) {
            console.error('Error formatting time:', error);
            return '-';
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

    // Function to fetch paid holidays
    // const fetchPaidHolidays = async () => {
    //     try {
    //         const currentYear = new Date().getFullYear();
    //         const holidaysQuery = query(
    //             collection(FIRESTORE_DB, 'paidHolidays'),
    //             where('year', '==', currentYear)
    //         );
    //         const querySnapshot = await getDocs(holidaysQuery);
    //         const holidaysMap = {};
    //         querySnapshot.docs.forEach(doc => {
    //             const holiday = doc.data();
    //             // Parse date string "DD-MM-YYYY" and format to "YYYY-MM-DD" for consistency
    //             const [day, month, year] = holiday.date.split('-');
    //             const holidayDateFormatted = `${year}-${month}-${day}`;
    //             holidaysMap[holidayDateFormatted] = holiday.description;
    //         });
    //         setPaidHolidays(holidaysMap);
    //     } catch (error) {
    //         console.error('Error fetching paid holidays:', error);
    //     }
    // };

    const fetchPaidHolidays = async () => {
        try {
            const currentYear = new Date().getFullYear();
            const response = await axios.get(`http://localhost:3000/api/holidays?year=${currentYear}`);
            // response.data should be an array of holidays
            // Process and setPaidHolidays as needed
            setPaidHolidays(response.data);
        } catch (error) {
            console.error('Error fetching paid holidays:', error);
        }
    };

    // Function to fetch weekly attendance records
    const fetchWeeklyAttendance = async () => {
        setIsLoading(true);
        try {
            const userId = user?.userId || await AsyncStorage.getItem('userId');
            if (!userId) return;

            const start = startOfWeek(selectedWeek, { weekStartsOn: 0 });
            const end = endOfWeek(selectedWeek, { weekStartsOn: 0 });
            
            const startDate = format(start, 'yyyy-MM-dd');
            const endDate = format(end, 'yyyy-MM-dd');

            console.log(`Fetching weekly attendance for ${userId} from ${startDate} to ${endDate}`);
            const response = await axios.get(`http://localhost:3000/api/attendance/user/${userId}/range`, {
                params: { startDate, endDate },
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });

            const attendanceRecords = response.data || [];
            
            // Get all days in the week
            const daysInWeek = [];
            const currentDay = new Date(start);
            while (currentDay <= end) {
                daysInWeek.push(new Date(currentDay));
                currentDay.setDate(currentDay.getDate() + 1);
            }

            // Initialize attendance data with empty values for all days
            const initialAttendance = daysInWeek.map(day => {
                const formattedDate = format(day, 'yyyy-MM-dd');
                return {
                    date: formattedDate,
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

            // Map attendance records to dates
            const attendanceMap = {};
            attendanceRecords.forEach(record => {
                attendanceMap[record.date] = record;
            });

            // Update the initialAttendance array with actual data
            const updatedAttendance = initialAttendance.map(day => {
                const dateKey = day.date;
                if (attendanceMap[dateKey]) {
                    const record = attendanceMap[dateKey];
                    return {
                        ...day,
                        checkInTime: record.checkInTime,
                        checkOutTime: record.checkOutTime,
                        workedHours: record.workedHours || '-',
                        totalWorkedMinutes: record.totalWorkedMinutes || 0
                    };
                }
                return day;
            });

            setWeeklyAttendance(updatedAttendance);
        } catch (error) {
            console.error('Error fetching weekly attendance:', error);
            Alert.alert('Error', 'Failed to load weekly attendance records');
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

    // Function to fetch monthly attendance records
    const fetchMonthlyAttendance = async () => {
        setIsLoading(true);
        try {
            const userId = user?.userId || await AsyncStorage.getItem('userId');
            if (!userId) return;

            // Get the year and month from selectedMonth
            const year = selectedMonth.getFullYear();
            const month = selectedMonth.getMonth();

            // Create the first and last day of the month
            const firstDayOfMonth = new Date(year, month, 1);
            const lastDayOfMonth = new Date(year, month + 1, 0);

            const startDate = format(firstDayOfMonth, 'yyyy-MM-dd');
            const endDate = format(lastDayOfMonth, 'yyyy-MM-dd');

            console.log(`Fetching monthly attendance for ${userId} from ${startDate} to ${endDate}`);

            // Fetch attendance data from MongoDB
            const response = await axios.get(`http://localhost:3000/api/attendance/user/${userId}/range`, {
                params: { startDate, endDate },
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });

            const attendanceRecords = response.data || [];

            // Get all days in the month
            const daysInMonth = [];
            const currentDay = new Date(firstDayOfMonth);
            while (currentDay <= lastDayOfMonth) {
                daysInMonth.push(new Date(currentDay));
                currentDay.setDate(currentDay.getDate() + 1);
            }

            // Initialize attendance data with empty values for all days
            const initialAttendance = daysInMonth.map(day => {
                const formattedDate = format(day, 'yyyy-MM-dd');
                return {
                    date: formattedDate,
                    formattedDate: format(day, 'dd-MM'),
                    dayOfWeek: format(day, 'EEE'),
                    checkInTime: null,
                    checkOutTime: null,
                    workedHours: 'N/A',
                    totalWorkedMinutes: 0,
                    isHoliday: !!paidHolidays[formattedDate],
                    holidayDescription: paidHolidays[formattedDate] || null
                };
            });

            // Fetch leave data for the month
            await fetchMonthLeaveData(firstDayOfMonth, lastDayOfMonth);

            // Map attendance records to dates
            const attendanceMap = {};
            attendanceRecords.forEach(record => {
                attendanceMap[record.date] = record;
            });

            // Update the initialAttendance array with actual data
            const updatedAttendance = initialAttendance.map(day => {
                const dateKey = day.date;
                if (attendanceMap[dateKey]) {
                    const record = attendanceMap[dateKey];
                    return {
                        ...day,
                        checkInTime: record.checkInTime,
                        checkOutTime: record.checkOutTime,
                        workedHours: record.workedHours || 'N/A',
                        totalWorkedMinutes: record.totalWorkedMinutes || 0
                    };
                }
                return day;
            });

            setMonthlyAttendance(updatedAttendance);
            setCurrentPage(1);
        } catch (error) {
            console.error('Error fetching monthly attendance:', error);
            Alert.alert('Error', 'Failed to load monthly attendance records');
        } finally {
            setIsLoading(false);
        }
    };

    // Function to fetch leave data for the entire month
    const fetchMonthLeaveData = async (startDate, endDate) => {
        if (!user) return;

        try {
            console.log('Fetching leave data for month:', format(startDate, 'yyyy-MM-dd'), 'to', format(endDate, 'yyyy-MM-dd'));

            // Query approved leave requests for the current user
            const leaveQuery = query(
                collection(FIRESTORE_DB, 'leaveRequests'),
                where('userId', '==', user.uid),
                where('status', '==', 'Approved')
            );

            const querySnapshot = await getDocs(leaveQuery);
            console.log('Found', querySnapshot.size, 'approved leave requests');

            const leaveData = {};

            // Process each leave request
            querySnapshot.forEach(doc => {
                const leave = doc.data();
                console.log('Processing leave request:', leave);

                // Convert string dates to Date objects
                const leaveStartDate = new Date(leave.startDate);
                const leaveEndDate = new Date(leave.endDate);

                console.log('Leave period:', format(leaveStartDate, 'yyyy-MM-dd'), 'to', format(leaveEndDate, 'yyyy-MM-dd'));

                // Mark all days in the leave period
                const currentDate = new Date(leaveStartDate);
                while (currentDate <= leaveEndDate) {
                    const dateStr = format(currentDate, 'yyyy-MM-dd');

                    // Check if the leave day is within the selected month
                    if (currentDate >= startDate && currentDate <= endDate) {
                        leaveData[dateStr] = leave.leaveType; // Store the actual leaveType
                        console.log('Marked leave day:', dateStr, 'Type:', leave.leaveType);
                    }

                    // Move to next day
                    currentDate.setDate(currentDate.getDate() + 1);
                }
            });

            console.log('Final leave days data for month:', leaveData);
            setLeaveDays(leaveData);
        } catch (error) {
            console.error('Error fetching leave data for month:', error);
        }
    };

    // Function to go to current month
    const goToCurrentMonth = () => {
        setSelectedMonth(new Date());
    };

    // Function to go to previous month
    const goToPreviousMonth = () => {
        setSelectedMonth(prevMonth => {
            const newMonth = new Date(prevMonth);
            newMonth.setMonth(newMonth.getMonth() - 1);
            return newMonth;
        });
    };

    // Function to go to next month
    const goToNextMonth = () => {
        setSelectedMonth(prevMonth => {
            const newMonth = new Date(prevMonth);
            newMonth.setMonth(newMonth.getMonth() + 1);
            return newMonth;
        });
    };

    // Function to export attendance records as Excel file
    const exportAttendanceRecords = async () => {
        try {
            setIsLoading(true);

            // Determine which data to export based on current view
            const dataToExport = viewType === 'weekly' ? weeklyAttendance : monthlyAttendance;

            if (!dataToExport || dataToExport.length === 0) {
                Alert.alert('No Data', 'There are no attendance records to export.');
                setIsLoading(false);
                return;
            }

            // Create worksheet data
            const wsData = [
                ['Day', 'Date', 'Check-In', 'Check-Out', 'Worked Hours'] // Header row
            ];

            // Add data rows
            dataToExport.forEach(record => {
                // Format values for Excel
                const isWeekend = record.dayOfWeek === 'Sat' || record.dayOfWeek === 'Sun';
                const isLeaveDay = leaveDays[record.date] === true;
                const hasCheckedIn = record.checkInTime !== null;
                const hasCheckedOut = record.checkOutTime !== null;

                let checkInValue = hasCheckedIn ? formatTimeOnly(record.checkInTime) :
                                  isLeaveDay ? 'L' : isWeekend ? 'H' : '-';
                let checkOutValue = hasCheckedOut ? formatTimeOnly(record.checkOutTime) :
                                   isLeaveDay ? 'L' : isWeekend ? 'H' : '-';
                let hoursValue = hasCheckedIn && hasCheckedOut ? record.workedHours :
                               isLeaveDay ? 'L' : isWeekend ? 'H' : '-';

                wsData.push([
                    record.dayOfWeek,
                    record.formattedDate,
                    checkInValue,
                    checkOutValue,
                    hoursValue
                ]);
            });

            // Create workbook and worksheet
            const ws = XLSX.utils.aoa_to_sheet(wsData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

            // Define styles for different row types
            const headerStyle = { fill: { fgColor: { rgb: "007AFF" }, patternType: "solid" }, font: { color: { rgb: "FFFFFF" }, bold: true } };
            const evenRowStyle = { fill: { fgColor: { rgb: "F9F9F9" }, patternType: "solid" } };
            const leaveDayStyle = { fill: { fgColor: { rgb: "FFEBEE" }, patternType: "solid" } };
            const weekendWorkStyle = { fill: { fgColor: { rgb: "E3F2FD" }, patternType: "solid" } };
            const partialDayStyle = { fill: { fgColor: { rgb: "FFF3E0" }, patternType: "solid" } };

            // Apply header style
            const headerRange = XLSX.utils.decode_range(ws['!ref']);
            for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ r: 0, c: C });
                if (!ws[cellRef]) continue;
                if (!ws[cellRef].s) ws[cellRef].s = {};
                Object.assign(ws[cellRef].s, headerStyle);
            }

            // Apply row styles based on conditions
            dataToExport.forEach((record, idx) => {
                const rowIdx = idx + 1; // +1 because header is row 0
                const isWeekend = record.dayOfWeek === 'Sat' || record.dayOfWeek === 'Sun';
                const isLeaveDay = leaveDays[record.date] === true;
                const hasCheckedIn = record.checkInTime !== null;
                const hasCheckedOut = record.checkOutTime !== null;

                // Calculate worked hours for partial day check
                let workedHoursNumeric = 0;
                if (record.totalWorkedMinutes) {
                    workedHoursNumeric = record.totalWorkedMinutes / 60;
                }

                const isPartialDay = hasCheckedIn && hasCheckedOut &&
                                    workedHoursNumeric > 0 &&
                                    workedHoursNumeric < 9;

                // Determine which style to apply based on priority
                let rowStyle;
                if (isLeaveDay && (hasCheckedIn || hasCheckedOut)) {
                    rowStyle = leaveDayStyle;
                } else if (isWeekend && (hasCheckedIn || hasCheckedOut)) {
                    rowStyle = weekendWorkStyle;
                } else if (!isWeekend && !isLeaveDay && isPartialDay) {
                    rowStyle = partialDayStyle;
                } else if (isLeaveDay) {
                    rowStyle = leaveDayStyle;
                } else if (rowIdx % 2 === 0) {
                    rowStyle = evenRowStyle;
                }

                // Apply the style to each cell in the row
                if (rowStyle) {
                    for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: C });
                        if (!ws[cellRef]) ws[cellRef] = { v: "" };
                        if (!ws[cellRef].s) ws[cellRef].s = {};
                        Object.assign(ws[cellRef].s, rowStyle);
                    }
                }
            });

            // Generate Excel file
            const fileType = 'xlsx';
            const fileName = `Attendance_${viewType === 'weekly' ? 'Weekly' : 'Monthly'}_${new Date().getTime()}.${fileType}`;

            // Write the workbook as a base64 string
            const wbout = XLSX.write(wb, { bookType: fileType, type: 'base64' });

            // Create a temporary file path
            const filePath = `${FileSystem.cacheDirectory}${fileName}`;

            // Write the base64 data to a file
            await FileSystem.writeAsStringAsync(filePath, wbout, {
                encoding: FileSystem.EncodingType.Base64
            });

            // Check if sharing is available
            const isSharingAvailable = await Sharing.isAvailableAsync();

            if (isSharingAvailable) {
                // Share the file
                await Sharing.shareAsync(filePath, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Export Attendance Records',
                    UTI: 'com.microsoft.excel.xlsx'
                });

                Alert.alert(
                    'Export Successful',
                    'Your attendance records have been exported successfully.'
                );
            } else {
                Alert.alert(
                    'Sharing Not Available',
                    'Sharing is not available on this device.'
                );
            }
        } catch (error) {
            console.error('Error exporting attendance records:', error);
            Alert.alert('Export Failed', 'There was an error exporting the attendance records.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userId', 'username', 'role'])
            navigation.replace('Login');
        } catch(error) {
            console.log("Error logging out", error);
            Alert.alert('Error', 'Failed to log out. Please try again.');
        }
    };

    // function to format worked hours 
    const formatHoursToHMS = (hoursDecimal) => {
        if (typeof hoursDecimal !== 'number' || isNaN(hoursDecimal) || hoursDecimal < 0) {
            return '-'; 
        }

        const totalMinutes = Math.round(hoursDecimal * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        if (hours === 0 && minutes === 0) {
            return '0h 0m';
        } else if (hours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    };

    const renderAttendanceRow = ({ item, index }) => {
        const isWeekend = item.dayOfWeek === 'Sun' || item.dayOfWeek === 'Sat';
        const isHoliday = item.isHoliday;
        const isLeaveDay = leaveDays[item.date] === true;
        const hasCheckedIn = item.checkInTime !== null && item.checkInTime !== undefined && item.checkInTime !== '';
        const hasCheckedOut = item.checkOutTime !== null && item.checkOutTime !== undefined && item.checkOutTime !== '';

        // Calculate worked hours in numeric form for comparison
        let workedHoursNumeric = 0;
        if (item.totalWorkedMinutes) {
            workedHoursNumeric = item.totalWorkedMinutes / 60;
        }

        // Check if it's a partial day (< 9 hours worked)
        const isPartialDay = hasCheckedIn && hasCheckedOut &&
                            workedHoursNumeric > 0 &&
                            workedHoursNumeric < 9;

        // Determine what to display for check-in
        let checkInDisplay;
        if (hasCheckedIn) {
            checkInDisplay = formatTimeOnly(item.checkInTime);
        } else if (isLeaveDay) {
            checkInDisplay = 'L';
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
            checkOutDisplay = formatTimeOnly(item.checkOutTime);
        } else if (isLeaveDay) {
            checkOutDisplay = 'L';
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
            // hoursDisplay = item.workedHours != 'N/A' ? item.workedHours: '-'

            // func to format the numeric worked hours
            hoursDisplay = formatHoursToHMS(item.workedHours); 
        } else if (isLeaveDay) {
            hoursDisplay = 'L';
        } else if (isHoliday) {
            hoursDisplay = 'H';
        } else if (isWeekend) {
            hoursDisplay = 'H';
        } else {
            hoursDisplay = '-';
        }

        // Determine row style based on various conditions
        let rowStyle = [styles.tableRow];

        // Apply background colors based on priority
        if (isLeaveDay && (hasCheckedIn || hasCheckedOut)) {
            // Leave day with check-in/out - light red background
            rowStyle.push(styles.leaveDayRow);
        } else if (isHoliday && (hasCheckedIn || hasCheckedOut)) {
            // Holiday with check-in/out - light blue background
            rowStyle.push(styles.holidayWorkRow);
        } else if (isWeekend && (hasCheckedIn || hasCheckedOut)) {
            // Weekend with check-in/out - light blue background
            rowStyle.push(styles.weekendWorkRow);
        } else if (!isWeekend && !isHoliday && !isLeaveDay && isPartialDay) {
            // Partial day (< 9 hours) on regular weekday - light orange background
            rowStyle.push(styles.partialDayRow);
        } else if (isLeaveDay) {
            // Leave day without check-in/out - light red background
            rowStyle.push(styles.leaveDayRow);
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
            if (content === 'L' && isLeaveDay) {
                return styles.leaveText;
            } else if (content === 'H' && (isHoliday || isWeekend)) {
                return styles.weekendText;
            } else if (isPartialDay && !isLeaveDay && !isHoliday && !isWeekend) {
                return styles.partialDayText;
            }
            return null;
        };

        return (
            <View key={item.date} style={rowStyle}>
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

                    {/* Regularize attendance */}
                    <View style={styles.regularizationCard}>
                        <Text style={styles.regularizationTitle}>Regularization Request</Text>
                        <TouchableOpacity
                            style={styles.regularizationDatePicker}
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={styles.regularizationDateText}>
                                {regularizationDate.toDateString()}
                            </Text>
                        </TouchableOpacity>
                        {showDatePicker && (
                            <DateTimePicker
                                value={regularizationDate}
                                mode="date"
                                display="default"
                                onChange={(event, selectedDate) => {
                                    setShowDatePicker(false);
                                    if (selectedDate) setRegularizationDate(selectedDate);
                                }}
                                maximumDate={new Date()}
                            />
                        )}
                        <TouchableOpacity
                            style={[
                                styles.regularizationButton,
                                isRegularizing && styles.regularizationButtonDisabled
                            ]}
                            onPress={requestRegularization}
                            disabled={isRegularizing}
                        >
                            <Text style={styles.regularizationButtonText}>
                                {isRegularizing ? 'Submitting...' : 'Regularize'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Attendance Records Section */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Icon name="calendar" type="material-community" size={24} color="#007AFF" />
                            <TouchableOpacity
                                style={styles.viewTypeButton}
                                onPress={() => setModalVisible(true)}
                            >
                                <Text style={styles.sectionTitle}>
                                    {viewType === 'weekly' ? 'Weekly Attendance Record' : 'Monthly Attendance Record'}
                                </Text>
                                <Icon name="chevron-down" type="material-community" size={20} color="#007AFF" />
                            </TouchableOpacity>
                        </View>

                        {/* View Type Selection Modal */}
                        <Modal
                            animationType="fade"
                            transparent={true}
                            visible={modalVisible}
                            onRequestClose={() => setModalVisible(false)}
                        >
                            <TouchableOpacity
                                style={styles.modalOverlay}
                                activeOpacity={1}
                                onPress={() => setModalVisible(false)}
                            >
                                <View style={styles.modalContent}>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            viewType === 'weekly' && styles.selectedOption
                                        ]}
                                        onPress={() => {
                                            setViewType('weekly');
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.modalOptionText,
                                            viewType === 'weekly' && styles.selectedOptionText
                                        ]}>
                                            Weekly Attendance Record
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.modalOption,
                                            viewType === 'monthly' && styles.selectedOption
                                        ]}
                                        onPress={() => {
                                            setViewType('monthly');
                                            fetchMonthlyAttendance();
                                            setModalVisible(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.modalOptionText,
                                            viewType === 'monthly' && styles.selectedOptionText
                                        ]}>
                                            Monthly Attendance Record
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        </Modal>

                        {/* Conditional Navigation based on view type */}
                        {viewType === 'weekly' ? (
                            // Weekly View Navigation
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
                        ) : (
                            // Monthly View Navigation
                            <View style={styles.weekNavigation}>
                                <TouchableOpacity
                                    style={styles.weekNavButton}
                                    onPress={goToPreviousMonth}
                                >
                                    <Icon name="chevron-left" type="material-community" size={24} color="#007AFF" />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.currentWeekButton}
                                    onPress={goToCurrentMonth}
                                >
                                    <Text style={styles.currentWeekText}>
                                        {(() => {
                                            try {
                                                const monthDate = new Date(selectedMonth);
                                                // Ensure valid date
                                                if (isNaN(monthDate.getTime())) {
                                                    return 'Current Month';
                                                }
                                                return format(monthDate, 'MMMM yyyy');
                                            } catch (error) {
                                                console.error('Error formatting month date:', error);
                                                return 'Current Month';
                                            }
                                        })()}
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.weekNavButton}
                                    onPress={goToNextMonth}
                                >
                                    <Icon name="chevron-right" type="material-community" size={24} color="#007AFF" />
                                </TouchableOpacity>
                            </View>
                        )}

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

                                {/* Table Rows - based on view type */}
                                {viewType === 'weekly' ? (

                                    // Weekly Attendance Records
                                    weeklyAttendance.length > 0 ? (
                                    weeklyAttendance.map((record) => {
                                        return renderAttendanceRow({ item: record});
                                    })  
                                ) :  (
                                    <View style={styles.noDataContainer}>
                                        <Text style={styles.noDataText}>No attendance records for the selected week.</Text>
                                    </View>
                                )
                            ) : (
                                // Monthly Attendance Records with Pagination
                                (() => {
                                    // Calculate pagination
                                    const indexOfLastRecord = currentPage * recordsPerPage;
                                    const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
                                    const currentRecords = monthlyAttendance.slice(indexOfFirstRecord, indexOfFirstRecord + recordsPerPage);
                                    const totalPages = Math.ceil(monthlyAttendance.length / recordsPerPage);
                                    return (
                                        <>
                                            {/* Monthly records */}
                                            {currentRecords.map((record) => {
                                                return renderAttendanceRow({ item: record});
                                            })}
                                            {/* Pagination Controls */}
                                            <View style={styles.paginationContainer}>
                                                <TouchableOpacity
                                                    style={[styles.paginationButton, currentPage === 1 && styles.disabledButton]}
                                                    onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    <Text style={styles.paginationButtonText}>Previous</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.paginationText}>
                                                    Page {currentPage} of {totalPages}
                                                </Text>
                                                <TouchableOpacity
                                                    style={[styles.paginationButton, currentPage === totalPages && styles.disabledButton]}
                                                    onPress={() => setCurrentPage(prev =>
                                                        Math.min(totalPages, prev + 1)
                                                    )}
                                                    disabled={currentPage === totalPages}
                                                >
                                                    <Text style={styles.paginationButtonText}>Next</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </>
                                    );
                                })()
                            )}
                            </View>
                        )}

                        {/* Export Button */}
                        <TouchableOpacity
                            style={styles.exportButton}
                            onPress={exportAttendanceRecords}
                        >
                            <View style={styles.buttonContent}>
                                <Icon name="file-export" type="material-community" size={20} color="white" />
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
        marginBottom: 13,
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
        fontSize: 15,
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
    leaveDayRow: {
        backgroundColor: '#FFEBEE',
    },
    leaveText: {
        color: '#F44336',
        fontWeight: 'bold',
    },
    weekendWorkRow: {
        backgroundColor: '#E3F2FD',
    },
    weekendText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },
    partialDayRow: {
        backgroundColor: '#FFF3E0',
    },
    partialDayText: {
        color: '#FF9800',
        fontWeight: 'bold',
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

    // View type button
    viewTypeButton: {
        flexDirection: 'row',
        alignItems: 'justify-center',
        marginLeft: 10,
        paddingVertical: 5,
        paddingHorizontal: 5,
        borderRadius: 5,
        backgroundColor: '#f0f0f0',
    },

    // Modal styles
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '80%',
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
    },
    modalOption: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    selectedOption: {
        backgroundColor: '#E3F2FD',
    },
    modalOptionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOptionText: {
        color: '#007AFF',
        fontWeight: 'bold',
    },

    // Pagination styles
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        // marginTop: 10,
        paddingTop: 5,
        borderTopWidth: 1,
        borderTopColor: '#ddd',
    },
    paginationButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 5,
    },
    paginationButtonText: {
        color: 'white',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    paginationText: {
        fontSize: 14,
        color: '#666',
    },

    // No data styles
    noDataContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        marginVertical: 10,
    },
    noDataText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // styles for holiday rows
    holidayWorkRow: {
        backgroundColor: '#E3F2FD',
    },
    holidayRow: {
        backgroundColor: '#E3F2FD',
    },

    // styles for regularize
    regularizationCard: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
        width: '100%',
        marginBottom: 16,
    },
    regularizationTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 10,
        // alignSelf: 'center'
    },
    regularizationDatePicker: {
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
        alignItems: 'center',
        width: 260,
        alignSelf: 'center'
    },
    regularizationDateText: {
        color: '#007AFF',
        fontSize: 15,
    },
    regularizationButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        width: 260,
        alignSelf: 'center'
    },
    regularizationButtonDisabled: {
        backgroundColor: '#A9A9A9',
    },
    regularizationButtonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
});




