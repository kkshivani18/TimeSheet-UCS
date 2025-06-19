import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, Alert, FlatList } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { Dimensions } from 'react-native';
import { Icon } from 'react-native-elements';
import {Ionicons, MaterialIcons} from '@expo/vector-icons/Ionicons';

const screenWidth = Dimensions.get('window').width;

export default function AdminLeave({ navigation }) { 
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [filteredRequests, setFilteredRequests] = useState([]);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterCriteria, setFilterCriteria] = useState({ username: '', status: '', date: ''});
    const [activeFilter, setActiveFilter] = useState(false);
    const [username, setUsername] = useState('');

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

    // Fetch leave applications from Firestore
    useEffect(() => {
        const fetchLeaves = async () => {
            try {
                const querySnapshot = await getDocs(collection(FIRESTORE_DB, 'leaveRequests'));
                setLeaveRequests(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } catch (error) {
                console.error('Error fetching leave requests:', error);
                Alert.alert('Error', 'Could not load leave applications');
            }
        };
        fetchLeaves();
    }, []);

    // Handle status update (Approve, On Hold, Disapprove)
    const handleUpdateStatus = async (id, status) => {
        try {
            // Fetching the current document to check its status
            const docRef = doc(FIRESTORE_DB, 'leaveRequests', id);
            const docSnap = await getDoc(docRef);
    
            if (docSnap.exists()) {
                const currentStatus = docSnap.data().status;
    
                // If status is "approved", no further updates allowed
                if (currentStatus.toLowerCase() === "approved") {
                    Alert.alert("Action Denied", "Approved requests cannot be modified.");
                    return;
                }
    
                // Update status if it's not approved
                await updateDoc(docRef, { status });
    
                setLeaveRequests(prev =>
                    prev.map(req => (req.id === id ? { ...req, status } : req))
                );
    
                Alert.alert("Success", `Leave request ${status}`);
            } else {
                Alert.alert("Error", "Leave request not found.");
            }
        } catch (error) {
            console.error("Error updating leave request status:", error);
            Alert.alert("Error", "Failed to update leave request status");
        }
    };    

    // filter function
    const applyFilter = () => {
        let filtered = [...leaveRequests];
        
        // Filter by username if provided
        if (filterCriteria.username) {
            filtered = filtered.filter(item => 
                item.username.toLowerCase().includes(filterCriteria.username.toLowerCase())
            );
        }
        
        // Filter by status if provided and not 'None'
        if (filterCriteria.status && filterCriteria.status !== 'None') {
            // Convert status names to match database format
            let statusToFilter = filterCriteria.status;
            
            if(filterCriteria.status === 'Approved') {
                statusToFilter = 'approved';
            } else if(filterCriteria.status === 'On Hold') {
                statusToFilter = 'on hold';
            } else if(filterCriteria.status === 'Disapproved') {
                statusToFilter = 'disapproved';
            }
            
            filtered = filtered.filter(item => 
                item.status.toLowerCase() === statusToFilter.toLowerCase()
            );
        }
        
        // Filter by date if provided
        if (filterCriteria.date) {
            filtered = filtered.filter(item => 
                item.startDate.includes(filterCriteria.date) || 
                item.endDate.includes(filterCriteria.date)
            );
        }
        
        setFilteredRequests(filtered);
        setActiveFilter(true);
        setFilterModalVisible(false);
    };

    // Add this function after the applyFilter function
    const resetFilters = () => {
        // Reset filter criteria
        setFilterCriteria({username: '', status: '', date: ''});
        
        // Reset filtered requests to show all requests
        setFilteredRequests([]);
        
        // Deactivate filter flag
        setActiveFilter(false);
    };

    // handle local deletion
    const handleLocalDelete = (requestId) => {
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
                        // Remove from both main and filtered lists
                        setLeaveRequests(prev => 
                            prev.filter(req => req.id !== requestId)
                        );
                        setFilteredRequests(prev => 
                            prev.filter(req => req.id !== requestId)
                        );
                    }
                }
            ]
        );
    };

    // Handle Logout
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

    const formatDate = (dateString) => {
        const [year, month, day] = dateString.split("-");
        return `${day}-${month}-${year}`;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>  
                    <Icon name="menu" size={25} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Leave Applications</Text>
                <TouchableOpacity onPress={handleLogout}>
                    <Icon name="logout" size={25} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.filterContainer}>
                <TouchableOpacity 
                    style={styles.filterButton} 
                    onPress={() => setFilterModalVisible(true)}
                >
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

            {leaveRequests.length === 0 ? (
                <Text style={styles.noRequests}>No leave applications available</Text>
            ) : (
                <FlatList
                    data={activeFilter ? filteredRequests : leaveRequests}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.username}>Leave Request - {item.username}</Text>
                                <TouchableOpacity 
                                    style={styles.deleteButton}
                                    onPress={() => handleLocalDelete(item.id)}
                                >
                                    <Icon name="close" size={20} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.date}>User Id - {item.userId}</Text>
                            <Text style={styles.date}>Date: {formatDate(item.startDate)} to {formatDate(item.endDate)}</Text>
                            <Text style={styles.date}>Days: {item.numberOfDays}</Text>
                            <Text style={styles.reason}>Reason: {item.reason}</Text>
                            <Text style={[styles.status, getStatusStyle(item.status)]}>
                                Status: {item.status}
                            </Text>
                            <View style={styles.buttonRow}>
                                <TouchableOpacity
                                    style={styles.approveButton}
                                    onPress={() => handleUpdateStatus(item.id, 'Approved')}
                                >
                                    <Text style={styles.buttonText}>Approve</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.holdButton}
                                    onPress={() => handleUpdateStatus(item.id, 'On Hold')}
                                >
                                    <Text style={styles.buttonText}>On Hold</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.disapproveButton}
                                    onPress={() => handleUpdateStatus(item.id, 'Disapproved')}
                                >
                                    <Text style={styles.buttonText}>Disapprove</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                />
            )}

            {/* filter modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={filterModalVisible}
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Leave Requests</Text>
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
                        />
                        
                        <Text style={styles.filterLabel}>Filter by Status:</Text>
                        <View style={styles.statusOptions}>
                            {['Approved', 'On Hold', 'Disapproved', 'pending'].map((status) => (
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

// Helper function for styling status text dynamically
const getStatusStyle = (status) => {
    switch (status) {
        case 'Approved':
            return { color: 'green', fontWeight: 'bold' };
        case 'On Hold':
            return { color: 'orange', fontWeight: 'bold' };
        case 'Disapproved':
            return { color: '#DC143C', fontWeight: 'bold' };
        default:
            return { color: 'gray' };
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 25,
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#f0f0f0',
    },
    header: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 15,
        paddingHorizontal: 10,
        backgroundColor: '#f8f8f8',
        marginBottom: 6,
    },
    title: {
        fontSize: 19,
        fontWeight: 'bold',
    },
    noRequests: { 
        textAlign: 'center', 
        fontSize: 16, 
        color: '#666' 
    },
    // card: {
    //     flex: 1,
    //     backgroundColor: 'white',
    //     borderRadius: 10,
    //     padding: 15,
    //     marginBottom: 15,
    //     elevation: 3,   
    //     alignSelf: 'center',
    //     // marginHorizontal: 10,
    //     width: screenWidth - 30, // leave some margin
    // },
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
        marginRight: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    deleteButton: {
        padding: 5,
        borderRadius: 15,
        backgroundColor: '#FFE5E5',
    },
    username: { 
        fontSize: 16, 
        fontWeight: 'bold', 
        color: '#333',
        marginBottom: 2
    },
    date: { 
        fontSize: 15, 
        color: '#000',
        marginBottom: 2
    },
    reason: { 
        fontSize: 15, 
        color: '#444', 
        fontWeight: 'bold',
        marginBottom: 2
    },
    status: { 
        fontSize: 15, 
        marginBottom: 10 
    },
    buttonRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between' 
    },
    approveButton: {
        backgroundColor: 'green',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginRight: 10,
    },
    holdButton: {
        backgroundColor: 'orange',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
        marginRight: 10,
    },
    disapproveButton: {
        backgroundColor: '#DC143C',
        padding: 8,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
    },
    buttonText: { 
        color: 'white', 
        fontSize: 14, 
        fontWeight: 'bold' 
    },

    // filter
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
    },
    filterButtonText: {
        marginLeft: 5,
        fontSize: 14,
        color: '#333',
    },
    resetButton: {
        marginLeft: 10,
        backgroundColor: '#f0f0f0',
        paddingVertical: 8,
        paddingHorizontal: 12,
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
        width: screenWidth - 40,
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
    },
    statusOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 15,
    },
    statusOption: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    selectedStatus: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    statusOptionText: {
        fontSize: 14,
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
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 6,
        marginLeft: 10,
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#ddd',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 15,
    },
    applyButton: {
        backgroundColor: '#007AFF',
    },
    applyButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '500',
    },
});

//----------------------------------------------------------------------------------------------------------------------------

// functional but without filter

// import React, { useState, useEffect } from 'react';
// import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, Alert, FlatList } from 'react-native';
// import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
// import { collection, addDoc, serverTimestamp, getDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
// import { Dimensions } from 'react-native';
// import { Icon } from 'react-native-elements';
// import Ionicons from '@expo/vector-icons/Ionicons';

// const screenWidth = Dimensions.get('window').width;

// export default function AdminLeave({ navigation }) { 
//     const [leaveRequests, setLeaveRequests] = useState([]);
//     const [filteredRequests, setFilteredRequests] = useState([]);
//     const [filterModalVisible, setFilterModalVisible] = useState(false);
//     const [filterCriteria, setFilterCriteria] = useState({ username: '', status: '', days: '', date: '' });

//     useEffect(() => {
//             const fetchUserData = async () => {
//                 const user = FIREBASE_AUTH.currentUser;
//                 if (user) {
//                     const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
//                     if (userDoc.exists()) {
//                         setUsername(userDoc.data().username);
//                     } else {
//                         setUsername('User');
//                     }
//                 } else {
//                     setUsername('Guest');
//                 }
//             };
    
//             fetchUserData();
//         }, []);

//     // Fetch leave applications from Firestore
//     useEffect(() => {
//         const fetchLeaves = async () => {
//             try {
//                 const querySnapshot = await getDocs(collection(FIRESTORE_DB, 'leaveRequests'));
//                 setLeaveRequests(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
//             } catch (error) {
//                 console.error('Error fetching leave requests:', error);
//                 Alert.alert('Error', 'Could not load leave applications');
//             }
//         };
//         fetchLeaves();
//     }, []);

//     // Handle status update (Approve, On Hold, Disapprove)
//     const handleUpdateStatus = async (id, status) => {
//         try {
//             // Fetching the current document to check its status
//             const docRef = doc(FIRESTORE_DB, 'leaveRequests', id);
//             const docSnap = await getDoc(docRef);
    
//             if (docSnap.exists()) {
//                 const currentStatus = docSnap.data().status;
    
//                 // If status is "approved", no further updates allowed
//                 if (currentStatus.toLowerCase() === "approved") {
//                     Alert.alert("Action Denied", "Approved requests cannot be modified.");
//                     return;
//                 }
    
//                 // Update status if it's not approved
//                 await updateDoc(docRef, { status });
    
//                 setLeaveRequests(prev =>
//                     prev.map(req => (req.id === id ? { ...req, status } : req))
//                 );
    
//                 Alert.alert("Success", `Leave request ${status}`);
//             } else {
//                 Alert.alert("Error", "Leave request not found.");
//             }
//         } catch (error) {
//             console.error("Error updating leave request status:", error);
//             Alert.alert("Error", "Failed to update leave request status");
//         }
//     };    

//     // Handle Logout
//     const handleLogout = () => {
//         FIREBASE_AUTH.signOut()
//             .then(() => {
//                 console.log('User logged out');
//                 navigation.navigate('Login'); 
//             })
//             .catch((error) => {
//                 console.error('Error logging out:', error);
//             });
//     };

//     const formatDate = (dateString) => {
//         const [year, month, day] = dateString.split("-");
//         return `${day}-${month}-${year}`;
//     };

//     return (
//         <View style={styles.container}>
//             <View style={styles.header}>
//                 <TouchableOpacity onPress={() => navigation.openDrawer()}>  
//                     <Icon name="menu" size={25} color="#333" />
//                 </TouchableOpacity>
//                 <Text style={styles.title}>Leave Applications</Text>
//                 <TouchableOpacity onPress={handleLogout}>
//                     <Icon name="logout" size={25} color="#333" />
//                 </TouchableOpacity>
//             </View>

//             {leaveRequests.length === 0 ? (
//                 <Text style={styles.noRequests}>No leave applications available</Text>
//             ) : (
//                 <FlatList
//                     data={leaveRequests}
//                     keyExtractor={(item) => item.id}
//                     renderItem={({ item }) => (
//                         <View style={styles.card}>
//                             <Text style={styles.username}>Leave Request - {item.username}</Text>
//                             <Text style={styles.date}>Date: {formatDate(item.startDate)} to {formatDate(item.endDate)}</Text>
//                             <Text style={styles.date}>Days: {item.numberOfDays}</Text>
//                             <Text style={styles.reason}>Reason: {item.reason}</Text>
//                             <Text style={[styles.status, getStatusStyle(item.status)]}>
//                                 Status: {item.status}
//                             </Text>
//                             <View style={styles.buttonRow}>
//                                 <TouchableOpacity
//                                     style={styles.approveButton}
//                                     onPress={() => handleUpdateStatus(item.id, 'Approved')}
//                                 >
//                                     <Text style={styles.buttonText}>Approve</Text>
//                                 </TouchableOpacity>
//                                 <TouchableOpacity
//                                     style={styles.holdButton}
//                                     onPress={() => handleUpdateStatus(item.id, 'On Hold')}
//                                 >
//                                     <Text style={styles.buttonText}>On Hold</Text>
//                                 </TouchableOpacity>
//                                 <TouchableOpacity
//                                     style={styles.disapproveButton}
//                                     onPress={() => handleUpdateStatus(item.id, 'Disapproved')}
//                                 >
//                                     <Text style={styles.buttonText}>Disapprove</Text>
//                                 </TouchableOpacity>
//                             </View>
//                         </View>
//                     )}
//                 />
//             )}
//         </View>
//     );
// }

// // Helper function for styling status text dynamically
// const getStatusStyle = (status) => {
//     switch (status) {
//         case 'Approved':
//             return { color: 'green', fontWeight: 'bold' };
//         case 'On Hold':
//             return { color: 'orange', fontWeight: 'bold' };
//         case 'Disapproved':
//             return { color: '#DC143C', fontWeight: 'bold' };
//         default:
//             return { color: 'gray' };
//     }
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         marginTop: 25,
//         alignItems: 'center',
//         padding: 15,
//         backgroundColor: '#f0f0f0',
//     },
//     header: {
//         width: '100%',
//         height: 50,
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'space-between',
//         paddingHorizontal: 10,
//         backgroundColor: '#f8f8f8',
//         marginBottom: 20,
//     },
//     title: {
//         fontSize: 19,
//         fontWeight: 'bold',
//     },
//     noRequests: { 
//         textAlign: 'center', 
//         fontSize: 16, 
//         color: '#666' 
//     },
//     card: {
//         flex: 1,
//         backgroundColor: 'white',
//         borderRadius: 10,
//         padding: 15,
//         marginBottom: 15,
//         elevation: 3,   
//         alignSelf: 'center',
//         width: screenWidth - 30, // leave some margin
//     },
//     username: { 
//         fontSize: 16, 
//         fontWeight: 'bold', 
//         color: '#333',
//         marginBottom: 2
//     },
//     date: { 
//         fontSize: 15, 
//         color: '#000',
//         marginBottom: 2
//     },
//     reason: { 
//         fontSize: 15, 
//         color: '#444', 
//         fontWeight: 'bold',
//         marginBottom: 2
//     },
//     status: { 
//         fontSize: 15, 
//         marginBottom: 10 
//     },
//     buttonRow: { 
//         flexDirection: 'row', 
//         justifyContent: 'space-between' 
//     },
//     approveButton: {
//         backgroundColor: 'green',
//         padding: 8,
//         borderRadius: 5,
//         flex: 1,
//         alignItems: 'center',
//         marginRight: 10,
//     },
//     holdButton: {
//         backgroundColor: 'orange',
//         padding: 8,
//         borderRadius: 5,
//         flex: 1,
//         alignItems: 'center',
//         marginRight: 10,
//     },
//     disapproveButton: {
//         backgroundColor: '#DC143C',
//         padding: 8,
//         borderRadius: 5,
//         flex: 1,
//         alignItems: 'center',
//     },
//     buttonText: { 
//         color: 'white', 
//         fontSize: 14, 
//         fontWeight: 'bold' 
//     },
// });
