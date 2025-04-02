import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator} from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, query, where, getDoc, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { Icon } from 'react-native-elements';
import { format } from 'date-fns';

export default function Tasks({ route, navigation }) {

    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // separate modals for adding and editing tasks
    const [modalAddVisible, setModalAddVisible] = useState(false);
    const [modalEditVisible, setModalEditVisible] = useState(false);

    // task state
    const [editingTask, setEditingTask] = useState( null);
    const [editHeading, setEditHeading] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState('');

    // date and admin view
    const [selectedDate, setSelectedDate] = useState(null);
    const [isAdminView, setIsAdminView] = useState(false);
    const [viewingUserId, setViewingUserId] = useState(null);
    const [viewingUsername, setViewingUsername] = useState(null);

    // role
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            const user = FIREBASE_AUTH.currentUser;
            if (user) {
                const userDoc = await getDoc(doc(FIRESTORE_DB, "users", user.uid));
                if (userDoc.exists()) {
                    setUserRole(userDoc.data().role);
                }
            }
        };
        fetchUserRole();
    }, []);

    const showMenu = !(isAdminView || userRole === "admin");
    const user = FIREBASE_AUTH.currentUser;

    // useEffect(() => {
    //     if (route.params?.date) {
    //         setSelectedDate(route.params.date);
    //     }
    //     if (route.params?.isAdminView) {
    //         setIsAdminView(true);
    //         setViewingUserId(route.params.userId);
    //         // setViewingUserId(route.params.userId || FIREBASE_AUTH.currentUser?.uid);
    //         setViewingUsername(route.params.username);
    //     }
    //     // else{
    //     //     setViewingUserId(FIREBASE_AUTH.currentUser?.uid);
    //     // }
    // }, [route.params]);

    useEffect(() => {
        if (route.params?.date) {
            setSelectedDate(route.params.date);
        }
    
        if (route.params?.isAdminView) {
            setIsAdminView(true);
            setViewingUserId(route.params.userId);
            setViewingUsername(route.params.username);
        } else {
            setViewingUserId(FIREBASE_AUTH.currentUser?.uid); // Ensure users see their tasks properly
        }
    }, [route.params]);


    useEffect(() => {
        if (selectedDate && (viewingUserId || !isAdminView)) {
            fetchTasks();
        }
    }, [selectedDate, viewingUserId, isAdminView]);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                navigation.replace('Login');
                return;
            }
            
            // Determine which user's tasks to fetch
            const targetUserId = isAdminView ? viewingUserId : user.uid;

            const startDate = new Date(selectedDate);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(selectedDate);
            endDate.setHours(23, 59, 59, 999);
            
            console.log('Fetching tasks for:', {
                userId: targetUserId,
                date: selectedDate,
                isAdminView: isAdminView
            }, targetUserId, viewingUserId);
            
            const tasksQuery = query(
                collection(FIRESTORE_DB, 'tasks'),
                where('userId', '==', targetUserId),
                where('date', '>=', startDate.toISOString()),
                where('date', '<=', endDate.toISOString())
            );
        
            const querySnapshot = await getDocs(tasksQuery);
            const tasksList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Tasks found:', tasksList.length);
            setTasks(tasksList);
        } catch (error) {
            console.error('Error fetching tasks:', error);
            Alert.alert('Error', 'Failed to fetch tasks');
        } finally {
            setLoading(false);
        }
    };

    const handleAddTask = () => {
        setEditingTask(null);
        setEditHeading('');
        setEditDescription('');
        setEditDeadline('');
        setModalAddVisible(true);
    };

    const handleSaveTask = async () => {
        try {
            if (!editHeading.trim() || !editDescription.trim() || !editDeadline.trim()) {
                Alert.alert('Error', 'All fields are required');
                return;
            }
    
            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                Alert.alert('Error', 'No user logged in');
                return;
            }
    
            // Fetch the username from Firestore or use a default value
            let username = 'User';
            try {
                const userDoc = await getDoc(doc(FIRESTORE_DB, 'users', user.uid));
                if (userDoc.exists()) {
                    username = userDoc.data().username;
                }
            } catch (error) {
                console.error('Error fetching username:', error);
            }
    
            const newTask = {
                userId: isAdminView ? viewingUserId : user.uid,
                email: user.email,
                username: username,
                heading: editHeading.trim(),
                description: editDescription.trim(),
                deadline: editDeadline.trim(),
                date: selectedDate,
                completed: false,
                createdAt: new Date().toISOString(),
                createdBy: isAdminView ? "admin" : user.uid,
            };
    
            const docRef = await addDoc(collection(FIRESTORE_DB, 'tasks'), newTask);
            setTasks([...tasks, { id: docRef.id, ...newTask }]);
    
            Alert.alert('Success', 'Task added successfully');
            setModalAddVisible(false);
        } catch (error) {
            console.error('Error saving task:', error);
            Alert.alert('Error', 'Failed to save task');
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setEditHeading(task.heading);
        setEditDescription(task.description);
        setEditDeadline(task.deadline);
        setModalEditVisible(true);
    };

    const handleUpdateTask = async () => {
        try {
            // Form validation
            if (!editHeading.trim()) {
                Alert.alert('Error', 'Please enter a task heading');
                return;
            }
            if (!editDescription.trim()) {
                Alert.alert('Error', 'Please enter a task description');
                return;
            }
            if (!editDeadline.trim()) {
                Alert.alert('Error', 'Please enter a deadline');
                return;
            }

            const taskRef = doc(FIRESTORE_DB, 'tasks', editingTask.id);
            const updateData = {
                heading: editHeading.trim(),
                description: editDescription.trim(),
                deadline: editDeadline.trim(),
                updatedAt: new Date().toISOString()
            };

            await updateDoc(taskRef, updateData);

            // Update local state
            setTasks(tasks.map(task => 
                task.id === editingTask.id 
                    ? { ...task, ...updateData }
                    : task
            ));

            Alert.alert('Success', 'Task updated successfully');
            setModalEditVisible(false);
            setEditingTask(null);
        } catch (error) {
            console.error('Error updating task:', error);
            Alert.alert('Error', 'Failed to update task');
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            Alert.alert(
                'Confirm Delete',
                'Are you sure you want to delete this task?',
                [
                    {
                        text: 'Cancel',
                        style: 'cancel'
                    },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            await deleteDoc(doc(FIRESTORE_DB, 'tasks', taskId));
                            setTasks(tasks.filter(task => task.id !== taskId));
                            Alert.alert('Success', 'Task deleted successfully');
                        }
                    }
                ]
            );
        } catch (error) {
            console.error('Error deleting task:', error);
            Alert.alert('Error', 'Failed to delete task');
        }
    };

    const toggleTaskCompletion = async (taskId, currentStatus) => {
        try {
            const taskRef = doc(FIRESTORE_DB, 'tasks', taskId);
            await updateDoc(taskRef, {
                completed: !currentStatus,
                updatedAt: new Date().toISOString()
            });

            // Update local state
            setTasks(tasks.map(task => 
                task.id === taskId 
                    ? { ...task, completed: !currentStatus }
                    : task
            ));
        } catch (error) {
            console.error('Error updating task completion:', error);
            Alert.alert('Error', 'Failed to update task status');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const renderTask = ({ item }) => {
        const user = FIREBASE_AUTH.currentUser;
        const isAdminCreated = item.createdBy === "admin"; 
        const isCurrentUserAdmin = isAdminView;
        const isAdminViewUserTasks = isAdminView && viewingUserId !== user?.uid;

        return (
            <View style={styles.taskCard}>
            <View style={styles.taskHeader}>

                {/* admin viewing user tasks, task status (dot) else check-box */}
                {isAdminViewUserTasks ? (
                    <View style={styles.statusContainer}>
                        <Icon 
                            name="circle" 
                            type="font-awesome" 
                            size={14} 
                            color={item.completed ? "green" : "#FFDB58"} 
                            style={styles.statusDot}
                        />
                        <Text style={styles.statusText}>
                            {item.completed ? "Completed" : "In-progress"}
                        </Text>
                    </View>
                ) : (
                    <TouchableOpacity 
                        style={styles.checkbox}
                        onPress={() => toggleTaskCompletion(item.id, item.completed)}
                    >
                        <Icon 
                            name={item.completed ? "check-box" : "check-box-outline-blank"} 
                            size={18} 
                            color={item.completed ? "#007AFF" : "#666"}
                        />
                    </TouchableOpacity>
                )}

                <View style={styles.taskHeaderLeft}>
                    <Text style={styles.date}>
                        {format(new Date(item.date), 'dd/MM/yyyy')}
                    </Text>
                </View>

                <View style={styles.taskActions}>
                    {/* disable edit & delete if task is from Admin for users*/}
                    <TouchableOpacity 
                        onPress={() => !item.completed && (isCurrentUserAdmin || !isAdminCreated) && handleEditTask(item)}
                        disabled={item.completed || (!isCurrentUserAdmin && isAdminCreated)}
                    >
                        <Icon name="edit" size={15} color={(item.completed || (!isCurrentUserAdmin && isAdminCreated)) ? "#ccc" : "#007AFF"} />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        onPress={() => (isCurrentUserAdmin || !isAdminCreated) && handleDeleteTask(item.id)}
                        disabled={!isCurrentUserAdmin && isAdminCreated}
                    >
                        <Icon name="delete" size={15} color={(!isCurrentUserAdmin && isAdminCreated) ? "#ccc" : "#FF3B30"} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.taskContent}>
                <Text style={[
                    styles.heading,
                    item.completed && styles.completedText
                ]}>
                    {item.heading}
                </Text>
            </View>
            <Text style={[
                styles.description,
                item.completed && styles.completedText
            ]}>
                {item.description}
            </Text>
            <Text style={styles.deadline}>Deadline: {item.deadline}</Text>
        </View>
    );
}
    
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                {/* {showMenu && (
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Icon name="menu" size={22} color="#333" />
                    </TouchableOpacity>
                )} */}

                {/* back arrow for admin and users in tasks */}
                {/* {(isAdminView || viewingUserId === FIREBASE_AUTH.currentUser?.uid) ? (
                    <TouchableOpacity 
                        onPress={() => {
                            // navigation.navigate(
                            // isAdminView && viewingUserId !== FIREBASE_AUTH.currentUser?.uid
                            //     ? "Admin" 
                            //     : "AdminTasks"  
                            if (isAdminView && viewingUserId !== FIREBASE_AUTH.currentUser?.uid) {
                                navigation.navigate("Admin"); // Admin when viewing user tasks
                            } else {
                                navigation.navigate("AdminTasks"); // AdminTasks when viewing own tasks
                            }
                        }}
                        style={styles.backButton}  
                    >
                        <Icon name="arrow-left" type="feather" size={20} color="#333" />
                    </TouchableOpacity>
                ) : showMenu && (
                    <TouchableOpacity onPress={() => navigation.openDrawer()}>
                        <Icon name="menu" size={22} color="#333" />
                    </TouchableOpacity>
                )} */}

                {(isAdminView || userRole === "admin") ? (
                        <TouchableOpacity 
                            onPress={() => {
                                if (isAdminView && viewingUserId !== FIREBASE_AUTH.currentUser?.uid) {
                                    navigation.navigate("Admin"); // Admin viewing users' tasks → Go to Admin Dashboard
                                } else {
                                    // navigation.navigate("AdminTasks"); // Admin viewing their own tasks → Go to AdminTasks
                                    if (navigation.canGoBack()) {
                                        navigation.goBack();
                                    } else {
                                        navigation.navigate("AdminTasks");
                                    }

                                }
                            }}
                            style={styles.backButton}
                        >
                            <Icon name="arrow-left" type="feather" size={20} color="#333" />
                        </TouchableOpacity>
                    ) : showMenu && (
                        <TouchableOpacity onPress={() => navigation.openDrawer()}>
                            <Icon name="menu" size={22} color="#333" />
                        </TouchableOpacity>
                    )}

                <Text style={styles.title}>
                    {isAdminView 
                        ? `${viewingUsername}'s Tasks - ${format(new Date(selectedDate), 'dd/MM/yyyy')}`
                        : `Tasks for ${format(new Date(selectedDate), 'dd/MM/yyyy')}`
                    }
                </Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : tasks.length === 0 ? (
                <View style={styles.noTasksContainer}>
                    <Text style={styles.noTasksText}>No tasks for this date</Text>
                </View>
            ) : (
                <FlatList
                data={tasks}
                renderItem={renderTask}
                keyExtractor={(item) => item.id}
                />
            )}

            {/* floating "+" button */}
            <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
                <Icon name="add" size={30} color="white" />
            </TouchableOpacity>
    
           {/* add task modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalAddVisible}
                onRequestClose={() => setModalAddVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Task for {selectedDate}</Text>
                            <TouchableOpacity onPress={() => setModalAddVisible(false)}>
                                <Icon name="close" size={20} color="black" />
                            </TouchableOpacity>
                        </View>
    
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Task Heading</Text>
                            <TextInput
                                style={styles.input}
                                value={editHeading}
                                onChangeText={setEditHeading}
                            />
    
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                multiline={true}
                                numberOfLines={4}
                            />
    
                            <Text style={styles.inputLabel}>Deadline</Text>
                            <TextInput
                                style={styles.input}
                                value={editDeadline}
                                onChangeText={setEditDeadline}
                            />
                        </View>
    
                        <TouchableOpacity 
                            style={styles.saveButton} 
                            onPress={handleSaveTask}
                        >
                            <Text style={styles.saveButtonText}>Save Task</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* edit task modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalEditVisible}
                onRequestClose={() => setModalEditVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Task for {selectedDate}</Text>
                            <TouchableOpacity onPress={() => setModalEditVisible(false)}>
                                <Icon name="close" size={20} color="black" />
                            </TouchableOpacity>
                        </View>
    
                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Task Heading</Text>
                            <TextInput
                                style={styles.input}
                                value={editHeading}
                                onChangeText={setEditHeading}
                            />
    
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                value={editDescription}
                                onChangeText={setEditDescription}
                                multiline={true}
                                numberOfLines={4}
                            />
    
                            <Text style={styles.inputLabel}>Deadline</Text>
                            <TextInput
                                style={styles.input}
                                value={editDeadline}
                                onChangeText={setEditDeadline}
                            />
                        </View>
    
                        <TouchableOpacity 
                            style={styles.saveButton} 
                            onPress={handleUpdateTask}
                        >
                            <Text style={styles.saveButtonText}>Update Task</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );    
}

const styles = StyleSheet.create({
    backButton: {
        position: "absolute",
        left: 10,
        top: "50%",
        transform: [ {translateX: -10}], 
        padding: 10,
        zIndex: 10,  
    },    
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f0f0f0',
        marginTop: 25,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 15,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 20,
        color: '#333',
    },
    listContainer: {
        padding: 8,
    },
    taskCard: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.23,
        shadowRadius: 2.62,
        elevation: 4,
    },
    date: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    taskContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },   
    heading: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#333',
    },
    description: {
        fontSize: 16,
        color: '#444',
        marginBottom: 8,
    },
    deadline: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
    },
    taskHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    taskActions: {
        flexDirection: 'row',
        gap: 10,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 15,
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    inputContainer: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        marginBottom: 5,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    saveButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f0f0',
    },
    taskHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkbox: {
        padding: 5,
    },
    completedText: {
        textDecorationLine: 'line-through',
        color: '#999',
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noTasksContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noTasksText: {
        fontSize: 16,
        color: '#666',
    },
    addButton: {
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: '#007AFF',
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDot: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 4,
    },
    statusText: {
        fontSize: 14,
        fontStyle: 'italic', 
        color: '#666',
    },
});