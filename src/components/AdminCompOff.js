import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, FlatList, Modal, TextInput } from 'react-native';
// import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
// import { collection, query, where, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import axios from 'axios';
import { Icon } from 'react-native-elements';
import { format } from 'date-fns';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminCompOff({ navigation }) {
    const [compOffApplications, setCompOffApplications] = useState([]);
    const [filteredApplications, setFilteredApplications] = useState([]);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterCriteria, setFilterCriteria] = useState(({username: '', status: '',  date: '' }));
    const [activeFilter, setActiveFilter] = useState(false);
    const [username, setUsername] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [compOffUnsubscribe, setCompOffUnsubscribe] = useState(null);
    const [isAdmin, setIsAdmin] = useState(false); 
    const [users, setUsers] = useState([]); 

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

    useEffect(() => {
        checkAdminAccess();
        const fetchUserData = async () => {
                try {
                    setIsLoading(true);
                    const response = await axios.get('http://localhost:3000/api/admin/users');
                    setUsers(response.data);
                } catch (error) {
                    console.error('Error fetching users:', error);
                    Alert.alert('Error', 'Failed to fetch users');
                } finally {
                    setIsLoading(false);
                }
        };

        fetchUserData();
    }, []);

    useEffect(() => {
        fetchCompOffApplications();
        
        // Cleanup function
        return () => {
            if (compOffUnsubscribe) {
                compOffUnsubscribe();
            }
        };
    }, []);

    const fetchCompOffApplications = async () => {
        try {
            setIsLoading(true);
            
            // fetch comp-off applications 
            const response = await axios.get('http://localhost:3000/api/compoff/admin');
            
            // fetch usernames for all applications
            const applicationsWithUsernames = await Promise.all(
                response.data.map(async (app) => {
                    try {
                        const userResponse = await axios.get(`http://localhost:3000/api/user/${app.userId}`);
                        return {
                            ...app,
                            username: userResponse.data.username,
                            requestDate: app.createdAt ? new Date(app.createdAt) : new Date()
                        };
                    } catch (error) {
                        console.error('Error fetching user:', error);
                        return {
                            ...app,
                            username: 'Unknown',
                            requestDate: app.createdAt ? new Date(app.createdAt) : new Date()
                        };
                    }
                })
            );
            
            setCompOffApplications(applicationsWithUsernames);
        } catch (error) {
            console.error('Error fetching comp-off applications:', error);
            Alert.alert('Error', 'Failed to fetch applications');
        } finally {
            setIsLoading(false);
        }
    };

    const applyFilter = () => {
        let filtered = [...compOffApplications];
        
        // filter by username
        if (filterCriteria.username) {
            filtered = filtered.filter(item => 
                item.username.toLowerCase().includes(filterCriteria.username.toLowerCase())
            );
        }
        
        // filter by status
        if (filterCriteria.status && filterCriteria.status !== 'None') {
            filtered = filtered.filter(item => 
                item.status.toLowerCase() === filterCriteria.status.toLowerCase()
            );
        }
        
        // filter by date
        if (filterCriteria.date) {
            filtered = filtered.filter(item => {
                try {
                    const requestDate = new Date(item.createdAt);
                    const formattedDate = format(requestDate, 'yyyy-MM-dd');
                    return formattedDate.includes(filterCriteria.date);
                } catch (error) {
                    return false;
                }
            });
        }
        
        setFilteredApplications(filtered);
        setActiveFilter(true);
        setFilterModalVisible(false);  
    };

    const resetFilters = () => {
        setFilterCriteria({
            username: '',
            status: '',
            date: ''
        });
        setFilteredApplications([]);
        setActiveFilter(false);
    };

    // handleLocalDelete function
    const handleLocalDelete = (applicationId) => {
        Alert.alert(
            "Delete Request",
            "Are you sure you want to remove this request from view?",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        setCompOffApplications(prev => 
                            prev.filter(app => (app._id || app.id) !== applicationId)
                        );
                        setFilteredApplications(prev => 
                            prev.filter(app => (app._id || app.id) !== applicationId)
                        );
                    }
                }
            ]
        );
    };

    const handleUpdateStatus = async (applicationId, newStatus) => {
        try {
            await axios.put(`http://localhost:3000/api/compoff/${applicationId}`, {
                status: newStatus
            });
            
            Alert.alert('Success', `Comp-off request ${newStatus.toLowerCase()}`);
            
            fetchCompOffApplications();
        } catch (error) {
            console.error('Error updating comp-off status:', error);
            Alert.alert('Error', 'Failed to update status');
        }
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

    const renderCompOffApplication = ({ item }) => {
    // comp off type display
    const getCompOffTypeDisplay = () => {
        if (item.compOffType === 'half') {
            const period = item.halfDayPeriod === 'morning' ? 'Morning' : 'Afternoon';
            return `Half day (${period})`;
        }
        return 'Full day';
    };

    // safe date formatting
    const formatSafeDate = (dateValue) => {
        try {
            if (!dateValue) return 'N/A';
            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return 'Invalid Date';
            return format(date, 'dd/MM/yyyy');
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Invalid Date';
        }
    };
    
    return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.username}>CompOff Request - {item.username || 'Unknown'}</Text>
                    <TouchableOpacity 
                        style={styles.deleteButton}
                        onPress={() => handleLocalDelete(item._id || item.id)}
                    >
                        <Icon name="close" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.date}>User Id - {item.userId}</Text>
                <Text style={styles.date}>Request Date: {formatSafeDate(item.createdAt)}</Text>
                <Text style={styles.dateRange}>
                    Date Range: {formatSafeDate(item.startDateTime)} to {formatSafeDate(item.endDateTime)}
                </Text>
                <Text style={styles.duration}>CompOff Duration: {item.duration} days</Text>
                <Text style={styles.compOffType}>Type: {getCompOffTypeDisplay()}</Text>
                <Text style={styles.reason}>Reason: {item.reason}</Text>
                <Text style={[styles.status, { 
                    color: item.status === 'Approved' ? 'green' : 
                        item.status === 'Pending' ? 'gray' : 'orange' 
                }]}>
                    Status: {item.status}
                </Text>
                {item.status !== 'Approved' && (
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={[styles.button, styles.approveButton]}
                            onPress={() => handleUpdateStatus(item._id || item.id, 'Approved')}
                        >
                            <Text style={styles.buttonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.holdButton]}
                            onPress={() => handleUpdateStatus(item._id || item.id, 'OnHold')}
                        >
                            <Text style={styles.buttonText}>On Hold</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Icon name="menu" size={25} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>CompOff Applications</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={25} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={styles.filterButton}
                    onPress={() => setFilterModalVisible(true)}>
                        <Icon name="filter-list" size={20} color="#333" />
                        <Text style={styles.filterButtonText}>Filter</Text>
                </TouchableOpacity>

                {activeFilter && (
                    <TouchableOpacity 
                        style={styles.resetButton} 
                        onPress={resetFilters}
                    >
                        <Text style={styles.resetButtonText}>Reset</Text>
                    </TouchableOpacity>
                )}
            </View>

            <FlatList
                data={activeFilter ? filteredApplications : compOffApplications}
                renderItem={renderCompOffApplication}
                keyExtractor={item => item._id || item.id || Math.random().toString()}
                contentContainerStyle={styles.listContainer}
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
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter CompOff Requests</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Icon name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        <Text style={styles.filterLabel}>Filter by Username:</Text>
                        <TextInput
                            style={styles.filterInput}
                            placeholder="Enter username"
                            value={filterCriteria.username}
                            onChangeText={(text) => setFilterCriteria({...filterCriteria, username: text})}
                            placeholderTextColor="#000000"
                        />
                        
                        <Text style={styles.filterLabel}>Filter by Status:</Text>
                        <View style={styles.statusOptions}>
                            {['Pending', 'OnHold', 'Approved'].map((status) => (
                                <TouchableOpacity
                                    key={status}
                                    style={[
                                        styles.statusOption,
                                        filterCriteria.status === status && styles.selectedStatus
                                    ]}
                                    onPress={() => setFilterCriteria({...filterCriteria, status})}
                                >
                                    <Text style={[
                                        styles.statusOptionText,
                                        filterCriteria.status === status && styles.selectedStatusText
                                    ]}>
                                        {status}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        <Text style={styles.filterLabel}>Filter by Date:</Text>
                        <TextInput
                            style={styles.filterInput}
                            placeholder="YYYY-MM-DD"
                            value={filterCriteria.date}
                            onChangeText={(text) => setFilterCriteria({...filterCriteria, date: text})}
                            placeholderTextColor='#000000'
                        />
                        
                        <View style={styles.modalButtons}>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.cancelButton]} 
                                onPress={() => setFilterModalVisible(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.modalButton, styles.applyButton]} 
                                onPress={applyFilter}
                            >
                                <Text style={styles.applyButtonText}>Apply Filter</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 15,
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
        marginBottom: 6,
    },
    title: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    listContainer: {
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 15,
        marginBottom: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        marginLeft: -15,
        marginRight: -10
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    username: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#333',
        marginBottom: 2
    },
    status: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    date: { 
        fontSize: 15, 
        color: '#000',
        marginBottom: 2
    },
    dateRange: {
        fontSize: 15,
        color: '#000',
        marginBottom: 2,
    },
    duration: {
        fontSize: 15,
        marginBottom: 5,
    },
    reason: { 
        fontSize: 15, 
        color: '#444', 
        fontWeight: 'bold',
        marginBottom: 2
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flex: 1,
        padding: 10,
        borderRadius: 5,
        marginHorizontal: 5,
    },
    approveButton: {
        backgroundColor: '#4CAF50',
    },
    holdButton: {
        backgroundColor: 'orange',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: 6,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: -15,
    },
    filterButtonText: {
        marginLeft: 5,
        fontSize: 14,
        color: '#333',
    },
    resetButton: {
        marginLeft: 10,
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    resetButtonText: {
        fontSize: 14,
        color: '#666',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    filterLabel: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 10,
        marginBottom: 5,
        color: '#333',
    },
    filterInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 6,
        padding: 10,
        fontSize: 15,
        marginBottom: 10,
        color: '#000000'
    },
    statusOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 10,
    },
    statusOption: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#ddd',
        marginRight: 8,
        marginBottom: 8,
    },
    selectedStatus: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    statusOptionText: {
        color: '#333',
    },
    selectedStatusText: {
        color: 'white',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginLeft: 10,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
    },
    applyButton: {
        backgroundColor: '#007AFF',
    },
    cancelButtonText: {
        color: '#666',
    },
    applyButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    deleteButton: {
        padding: 5,
        borderRadius: 15,
        backgroundColor: '#FFE5E5',
    },
    compOffType: {
        marginBottom: 2,
        fontWeight: 'bold',
    }
});