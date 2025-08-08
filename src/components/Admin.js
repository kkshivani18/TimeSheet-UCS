import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import { Icon } from 'react-native-elements';
import { Calendar } from 'react-native-calendars';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

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

export default function Admin({ navigation }) {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(true);
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [paidHolidays, setPaidHolidays] = useState({});
    const [userLeaves, setUserLeaves] = useState({});

    useEffect(() => {
        checkAdminAccess();
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchPaidHolidays();
    }, [selectedYear])

    useEffect(() => {
        if (selectedUser) {
            fetchPaidHolidays();
            fetchUserLeaves();
        } else {
            setUserLeaves({}); 
        }
    }, [selectedUser, selectedMonth, selectedYear]);

    // check if current user is admin
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
            setLoading(true);
            const response = await axios.get('http://localhost:3000/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            Alert.alert('Error', 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    // fetch paid holidays
    const fetchPaidHolidays = async () => {
        try {
            const response = await axios.get(`http://localhost:3000/api/holidays/${selectedYear}`);
            
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

    // fetch user leaves
    const fetchUserLeaves = async () => {
        if (!selectedUser || !selectedUser.userId) {
            setUserLeaves({});
            return;
        }

        try {

            const response = await axios.get(`http://localhost:3000/api/leaves?userId=${selectedUser.userId}&year=${selectedYear}&month=${selectedMonth.toString().padStart(2, '0')}`);
            const leavesMap = {};
            response.data.forEach(leave => {
                const startDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    leavesMap[dateStr] = leave.leaveType || 'Leave';
                }
            });
            setUserLeaves(leavesMap);
        } catch (error) {
            console.error('Error fetching user leaves:', error);
            setUserLeaves({});
        }
    };

    // marked dates for calendar
    const getMarkedDates = () => {
        const markedDates = {};
        
        // paid holidays
        Object.keys(paidHolidays).forEach(date => {
            const [year, month, day] = date.split('-');
            if (parseInt(year) === selectedYear && parseInt(month) === parseInt(selectedMonth)) {
                markedDates[date] = {
                    selected: true,
                    selectedColor: '#007AFF',
                    startingDay: true,
                    endingDay: true,
                    color: '#007AFF',
                    textColor: 'white',
                };
            }
        });
        
        // user leaves 
        Object.keys(userLeaves).forEach(date => {
            const [year, month, day] = date.split('-');
            if (parseInt(year) === selectedYear && parseInt(month) === parseInt(selectedMonth)) {
                markedDates[date] = {
                    selected: true,
                    selectedColor: '#DC143C',
                    color: '#DC143C',
                    textColor: 'white',
                };
            }
        });
        return markedDates;
    };

    const handleUserChange = (userId) => {
        const user = users.find(u => u.userId === userId || u.id === userId);
        setSelectedUser(user);
    };

    const handleMonthChange = (itemValue) => {
        setSelectedMonth(itemValue);
    };

    const handleYearChange = (itemValue) => {
        setSelectedYear(itemValue);
    };

    const viewUserTasks = (date) => {
        if (!selectedUser) {
            Alert.alert('Error', 'Please select an employee first');
            return;
        }

        navigation.navigate('Tasks', {
            date,
            userId: selectedUser?.userId,
            username: selectedUser?.username,
            isAdminView: true
        });
    };

    const handleLogout = async () => {
        try {
            await AsyncStorage.multiRemove(['token', 'userId', 'username', 'role']);
            navigation.replace('Login');
        } catch (error) {
            console.error('Error logging out:', error);
            navigation.replace('Login');
        }
    };

    if (!isAdmin) {
        return null; 
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}> 
                <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
                    <Icon name="menu" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Employee Management</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={25} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.scrollContainer}
                contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}
            >
                <View style={styles.userPickerContainer}>
                    <Text style={styles.label}>Select Employee:</Text>
                    <Picker
                        selectedValue={selectedUser?.userId}
                        style={styles.picker}
                        onValueChange= {handleUserChange}
                        // {(itemValue) => {
                        //     const user = users.find(u => u.userId === itemValue);
                        //     setSelectedUser(user);
                        // }}
                    >
                    <Picker.Item label="Select an Employee" value={null} />
                        {users.map(user => (
                            <Picker.Item
                                key={user.userId}
                                label={user.username}
                                value={user.userId}
                            />
                        ))}
                    </Picker>
                </View>

                <View style={styles.pickerContainer}>
                    <Picker
                        selectedValue={selectedMonth}
                        style={styles.pickerMonYr} 
                        onValueChange={handleMonthChange}
                    >
                        {months.map((month) => (
                            <Picker.Item key={month.value} label={month.label} value={month.value} />
                        ))}
                    </Picker>
                    <Picker
                        selectedValue={selectedYear}
                        style={styles.pickerMonYr}
                        onValueChange={handleYearChange}
                    >
                        {[...Array(20).keys()].map(year => (
                            <Picker.Item key={year} label={`${selectedYear - 10 + year}`} value={selectedYear - 10 + year} />
                        ))}
                    </Picker>
                </View>

                {selectedUser && (
                    <View style={styles.card}>
                        <Text style={styles.subtitle}>
                            {selectedUser.username}'s Calendar
                        </Text>

                        <Calendar
                            key={`${selectedYear}-${selectedMonth}-${selectedUser?.userId || 'none'}`}
                            style={styles.calendar}
                            hideArrows={true}
                            markedDates={getMarkedDates()}
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
                            current={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`}
                            onDayPress={(day) => viewUserTasks(day.dateString)}
                        />
                        {/* Legend */}
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
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        padding: 16,
        marginTop: 5,
        alignItems: 'center',
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
    scrollContainer: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        width: '100%'
    },
    userPickerContainer: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        marginBottom: 15,
        elevation: 2,
        width: '100%',
    },
    label: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        color: '#333',
    },
    picker: {
        backgroundColor: '#f8f8f8',
        borderRadius: 8
    },
    pickerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 10,
    },
    pickerMonYr: {
        height: 55,
        width: 160,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
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
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 10,
        color: '#333',
    },
    calendar: {
        borderRadius: 10,
    },
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
    },
    viewMonthlyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 15,
    },
    viewMonthlyButtonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '600',
    },
    assignTaskButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#28A745',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginTop: 10,
    },
    assignTaskButtonText: {
        color: 'white',
        marginLeft: 5,
        fontSize: 14,
        fontWeight: '600',
    }
});
