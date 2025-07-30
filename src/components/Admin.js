import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
// import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
// import { collection, query, getDocs, where } from 'firebase/firestore';
import { Icon } from 'react-native-elements';
import { Calendar } from 'react-native-calendars';

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


    useEffect(() => {
        checkAdminAccess();
        fetchUsers();
    }, []);

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

    // Fetch all users except admins
    const fetchUsers = async () => {
        try {
            setLoading(true);
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
            Alert.alert('Error', 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
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
            userId: selectedUser.id,
            userEmail: selectedUser.email,
            username: selectedUser.username,
            date: date,
            isAdminView: true,
            timestamp: new Date().getTime()
        });
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

            <View style={styles.userPickerContainer}>
                <Text style={styles.label}>Select Employee:</Text>
                <Picker
                    selectedValue={selectedUser?.id}
                    style={styles.picker}
                    onValueChange={(itemValue) => {
                        const user = users.find(u => u.id === itemValue);
                        setSelectedUser(user);
                    }}
                >
                    <Picker.Item label="Select an Employee" value={null} />
                    {users.map(user => (
                        <Picker.Item
                            key={user.id}
                            label={user.username}
                            value={user.id}
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
                        current={`${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-01`}
                        onDayPress={(day) => viewUserTasks(day.dateString)}
                    />
                </View>
            )}
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

    // Month/Year picker container matching AdminTasks.js
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

    // Card container matching AdminTasks.js
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
    subtitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    calendar: {
        borderRadius: 10,
    }
});
