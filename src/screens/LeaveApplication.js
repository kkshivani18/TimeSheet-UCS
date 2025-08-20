import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, FlatList, Modal, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
// import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
// import { collection, addDoc, serverTimestamp, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Icon } from 'react-native-elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import {API_URL} from '@env';

export default function LeaveApplication({ navigation }) {
    const [leaveReason, setLeaveReason] = useState('');
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [showStartPicker, setShowStartPicker] = useState(false);
    const [showEndPicker, setShowEndPicker] = useState(false);
    const [leaveApplications, setLeaveApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [userRole, setUserRole] = useState('user');
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [isFiltered, setIsFiltered] = useState(false);
    const [leaveApplicationsUnsubscribe, setLeaveApplicationsUnsubscribe] = useState(null);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchUserAndLeaves = async () => {
        setIsLoading(true);
        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                console.log('No userId found');
                return;
            }
            console.log('Fetching leaves for user: ', userId);

            // fetch leave applications first
            const leavesResponse = await axios.get(
                `${API_URL}/api/leaves/user/all/${userId}`,
                { 
                    headers: { 
                        Authorization: `Bearer ${token}` 
                    }
                }
            );
            console.log('Leaves response:', leavesResponse.data);
            setLeaveApplications(leavesResponse.data);
    
            // fetch user info if needed
            const userResponse = await axios.get(`${API_URL}/api/user/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
            });
            setUser(userResponse.data);
            } catch (error) {
                console.error('Error fetching leave applications:', error);
                Alert.alert('Error', 'Failed to fetch leave applications');
            } finally {
                setIsLoading(false);
            }
        };
      
        fetchUserAndLeaves();
      }, []);

    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0'); // 0-indexed
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleStartDateChange = (event, selectedDate) => {
        setShowStartPicker(false);
        if (selectedDate) {
            if (selectedDate > endDate) {
                Alert.alert('error', 'Start date cannot be later than end date');
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

    const handleSubmit = async () => {
        // Validation
        if (!leaveReason.trim()) {
            Alert.alert('Error', 'Please provide a reason for leave');
            return;
        }

        try {
            const token = await AsyncStorage.getItem('token');
            const userId = await AsyncStorage.getItem('userId');
            
            if (!userId || !token) {
                Alert.alert('Error', 'User not authenticated');
                return;
            }

            // Calculate days of leave
            const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)) + 1;

            // Prepare leave request for backend
            const leaveRequest = {
                userId: userId,
                userEmail: user?.email || 'N/A',
                username: user?.username || 'User',
                reason: leaveReason,
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                status: 'pending',
                numberOfDays: days
            };

            // Submit to backend API
            const response = await axios.post(
                `${API_URL}/api/leaves`,
                leaveRequest,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.status === 201) {
                Alert.alert('Success', 'Leave request submitted successfully');
                
                // Reset form
                setLeaveReason('');
                setStartDate(new Date());
                setEndDate(new Date());
                
                // Refresh leave applications list
                const leavesResponse = await axios.get(
                    `${API_URL}/api/leaves/user/${userId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                setLeaveApplications(leavesResponse.data);
            }
        } catch (error) {
            console.error('Error submitting leave:', error);
            Alert.alert('Error', 'Could not submit leave request. Please try again.');
        }
    };

    // status color mapping
    const getStatusColor = (status) => {
        switch(status.toLowerCase()) {
            case 'approved': return 'green';
            case 'disapproved': return '#DC143C';
            case 'pending': return 'gray';
            case 'on hold': return 'orange';
            default: return 'gray';
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

    // Render individual leave application
    const renderLeaveApplication = ({ item }) => {

        console.log('Rendering leave application:', {
            id: item._id,
            status: item.status,
            startDate: item.startDate,
            endDate: item.endDate
        });
        
        return (
            <View style={styles.leaveApplicationCard}>
                <View style={styles.leaveApplicationHeader}>
                    <Text style={styles.leaveApplicationDates}>
                        {item.startDate} to {item.endDate}
                    </Text>
                    <View
                        style={[
                            styles.statusDot,
                            { backgroundColor: getStatusColor(item.status) }
                        ]}
                    />
                </View>
                <Text style={styles.leaveApplicationReason}>
                    Reason: {item.reason}
                </Text>
                <Text style={styles.leaveApplicationStatus}>
                    Status: {item.status.toUpperCase()}
                </Text>
                {item.adminComment && (
                    <Text style={styles.adminComment}>
                        Admin Comment: {item.adminComment}
                    </Text>
                )}
            </View>
        )
    };


    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Icon name="menu" size={22} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Apply for Leave</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={22} color="#333" />
                </TouchableOpacity>
            </View>

            {userRole === 'user' && (
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

                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter reason for leave"
                        value={leaveReason}
                        onChangeText={setLeaveReason}
                        multiline
                        placeholderTextColor="#000000"
                    />
                    
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                    >
                        <Text style={styles.buttonText}>Submit Leave Request</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* DatePicker modals rendered outside the view hierarchy */}

            {showStartPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={startDate}
                    mode="date"
                    display="calendar"
                    onChange={handleStartDateChange}
                />
            )}

            {showEndPicker && Platform.OS === 'android' && (
                <DateTimePicker
                    value={endDate}
                    mode="date"
                    display="calendar"
                    onChange={handleEndDateChange}
                />
            )}

            {/* for iOS */}
            {Platform.OS === 'ios' && (
                <>
                    {showStartPicker && (
                        <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="spinner"
                            onChange={handleStartDateChange}
                        />
                    )}
                    {showEndPicker && (
                        <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="spinner"
                            onChange={handleEndDateChange}
                        />
                    )}
                </>
            )}

            <View style={styles.leaveApplicationsContainer}>
                <View style={styles.leaveApplicationsHeader}>
                    <Text style={styles.leaveApplicationsTitle}>Previous Leave Applications</Text>
                    <TouchableOpacity
                        style={styles.filterButton}
                        onPress={() => setFilterModalVisible(true)}
                    >
                        <Text style={styles.filterButtonText}>Filter</Text>
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={isFiltered ? filteredApplications : leaveApplications}
                    renderItem={renderLeaveApplication}
                    keyExtractor={(item) => item._id}
                    ListEmptyComponent={
                        isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                                <Text style={styles.loadingText}>Loading leave applications...</Text>
                            </View>
                        ) : (
                            <Text style={styles.noApplicationsText}>
                                No leave applications found
                            </Text>
                        )
                    }
                />

                {/* Filter Modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={filterModalVisible}
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Filter by Status</Text>

                            <View style={styles.pickerContainer}>
                                <Picker
                                    selectedValue={selectedFilter}
                                    style={styles.picker}
                                    onValueChange={(itemValue) => setSelectedFilter(itemValue)}
                                >
                                    <Picker.Item label="All" value="all" />
                                    <Picker.Item label="Approved" value="approved" />
                                    <Picker.Item label="Disapproved" value="disapproved" />
                                    <Picker.Item label="On Hold" value="on hold" />
                                    <Picker.Item label="Pending" value="pending" />
                                </Picker>
                            </View>

                            <View style={styles.modalButtonsContainer}>
                                <TouchableOpacity
                                    style={[styles.modalButton, styles.applyButton]}
                                    onPress={() => {
                                        if (selectedFilter === 'all') {
                                            setIsFiltered(false);
                                        } else {
                                            const filtered = leaveApplications.filter(
                                                app => app.status.toLowerCase() === selectedFilter.toLowerCase()
                                            );
                                            setFilteredApplications(filtered);
                                            setIsFiltered(true);
                                        }
                                        setFilterModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.modalButtonText}>Apply</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.modalButton, styles.cancelButton]}
                                    onPress={() => setFilterModalVisible(false)}
                                >
                                    <Text style={styles.modalButtonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f0f0f0',
        marginTop: 5,
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
    leaveApplicationsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    filterButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 5,
    },
    filterButtonText: {
        color: 'white',
        fontWeight: '500',
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
    dateContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        padding: 10,
        backgroundColor: 'white',
        borderRadius: 5,
    },
    input: {
        // borderWidth: 1,
        padding: 10,
        marginBottom: 10,
        borderRadius: 5,
        backgroundColor: 'white',
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
    },
    buttonText: {
        color: 'white',
        fontSize: 16
    },
    leaveApplicationsContainer: {
        flex: 1,
    },
    leaveApplicationsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    leaveApplicationCard: {
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
    leaveApplicationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    leaveApplicationDates: {
        fontWeight: 'bold',
    },
    leaveApplicationReason: {
        marginBottom: 5,
    },
    leaveApplicationStatus: {
        fontStyle: 'italic',
    },
    adminComment: {
        marginTop: 5,
        fontStyle: 'italic',
        color: '#666',
    },
    statusDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    noApplicationsText: {
        textAlign: 'center',
        color: 'gray',
        marginTop: 20,
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
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
    },
    pickerContainer: {
        width: '100%',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        marginBottom: 15,
    },
    picker: {
        width: '100%',
        height: 52,
    },
    modalButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    modalButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
        minWidth: 100,
        alignItems: 'center',
    },
    applyButton: {
        backgroundColor: 'green',
    },
    cancelButton: {
        backgroundColor: '#DC143C',
    },
    modalButtonText: {
        color: 'white',
        fontWeight: '400',
    },
    datePickerContainer: {
        backgroundColor: '#fff',
        padding: 5,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16
    }
});