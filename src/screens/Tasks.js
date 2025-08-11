import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
// import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
// import { collection, query, where, getDoc, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, serverTimestamp } from 'firebase/firestore';
import { Icon } from 'react-native-elements';
import { format } from 'date-fns';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    // const [editDeadline, setEditDeadline] = useState('');
    const [deadlineDate, setDeadlineDate] = useState(new Date());
    const [showPicker, setShowPicker] = useState(false);
    const [pickerMode, setPickerMode] = useState('date');

    // date and admin view
    const [selectedDate, setSelectedDate] = useState(null);
    const [monthlyTasks, setMonthlyTasks] = useState([]);
    const [monthlyTasksLoaded, setMonthlyTasksLoaded] = useState(false);
    const [isAdminView, setIsAdminView] = useState(false);
    const [viewingUserId, setViewingUserId] = useState(null);
    const [viewingUsername, setViewingUsername] = useState(null);

    // Month selection for monthly tasks view
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // user
    const [user, setUser] = useState(null);
    const [username, setUsername] = useState('');
    const [userId, setUserId] = useState(null);

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
        }, []);

    // role
    const [userRole, setUserRole] = useState(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            try {
                const userId = await AsyncStorage.getItem('userId');
                if (userId) {
                    const response = await axios.get(`http://localhost:3000/api/user/${userId}`, {
                        headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
                    });
                    setUserRole(response.data.role);
                }
            } catch (error) {
                console.error('Error fetching user role:', error);
            }
        };
        fetchUserRole();
    }, []);

    const showMenu = !(isAdminView || userRole === "admin");

    useEffect(() => {
        if (route.params?.date) {
            setSelectedDate(route.params.date);
        }

        const setUserId = async () => {
            const currentUserId = await AsyncStorage.getItem('userId');
            if (route.params?.isAdminView) {
                setIsAdminView(true);
                setViewingUserId(route.params.userId);
                setViewingUsername(route.params.username);
            }
            else {
                setIsAdminView(false);
                setViewingUserId(currentUserId);
            }
        }
        setUserId();
    }, [route.params]);


    useEffect(() => {
        if (selectedDate && (viewingUserId || !isAdminView)) {
            fetchTasks();
        } else if (!selectedDate && (viewingUserId || !isAdminView)) {
            fetchMonthlyTasks();
        }
    }, [selectedDate, viewingUserId, isAdminView]);

    // fetch monthly tasks when month or year changes
    useEffect(() => {
        if (!selectedDate && (viewingUserId || !isAdminView) && !monthlyTasksLoaded) {
            fetchMonthlyTasks();
        }
    }, [selectedMonth, selectedYear, monthlyTasksLoaded]);
    

    // fetch monthly tasks
    const fetchMonthlyTasks = async () => {
        try {
            setLoading(true);
            const userId = await AsyncStorage.getItem('userId');
            if (!userId) {
                navigation.replace('Login');
                return;
            }

            // determines which user's tasks to fetch
            const targetUserId = isAdminView ? viewingUserId : userId;

            // selected month's start and end dates
            const startOfMonth = new Date(selectedYear, selectedMonth, 1);
            startOfMonth.setHours(0, 0, 0, 0);

            const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);

            console.log('Fetching monthly tasks for:', {
                userId: targetUserId,
                month: selectedMonth + 1,
                year: selectedYear,
                isAdminView: isAdminView
            });

            const response = await axios.get(
                `http://localhost:3000/api/tasks/user/${targetUserId}/monthly`,
                {
                    params: {
                        startDate: startOfMonth.toISOString(),
                        endDate: endOfMonth.toISOString()
                    },
                    headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
                }
            );

            console.log('Monthly tasks found:', response.data.length);
            setMonthlyTasks(response.data);
            setMonthlyTasksLoaded(true);
        } catch (error) {
            console.error('Error fetching monthly tasks:', error);
            Alert.alert('Error', 'Failed to fetch monthly tasks');
        } finally {
            setLoading(false);
        }
    };

    // fetch tasks
    const fetchTasks = async () => {
    try {
        setLoading(true);
        const userId = await AsyncStorage.getItem('userId');
        if (!userId) {
            navigation.replace('Login');
            return;
        }

        // determine which user's tasks to fetch
        const targetUserId = isAdminView ? viewingUserId : userId;

        console.log('Fetching tasks for:', {
            userId: targetUserId,
            date: selectedDate,
            isAdminView: isAdminView
        });

        const response = await axios.get(
            `http://localhost:3000/api/tasks/user/${targetUserId}/date/${selectedDate}`,
            {
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            }
        );

        setTasks(response.data);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        Alert.alert('Error', 'Failed to fetch tasks');
    } finally {
        setLoading(false);
        setMonthlyTasksLoaded(false);
    }
    };

    const handleAddTask = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const selected = new Date(selectedDate);
        selected.setHours(0, 0, 0, 0);

        if (selected < today) {
            Alert.alert('Invalid Date', 'Cannot add tasks for past dates');
            return;
        }

        if (!selectedDate) {
            Alert.alert(
                'Select a Date',
                'Select a date from the calendar to add a task.',
                [{
                    text: 'OK',
                    onPress: () => {
                        if (isAdminView) {
                            navigation.navigate('Admin');
                        } else if (userRole === 'admin') {
                            navigation.navigate('AdminTasks');
                        } else {
                            navigation.navigate('Dashboard');
                        }
                    }
                }]
            );
            return;
        }

        // navigation buttons section
        if (isAdminView) {
            navigation.navigate('Admin');
        } else if (userRole === 'admin') {
            navigation.navigate('Admin');
        } else if(userRole !== 'admin') {
            navigation.navigate('Dashboard');
        }

        setEditingTask(null);
        setEditHeading('');
        setEditDescription('');
        setDeadlineDate(new Date());
        setShowPicker(false);
        setModalAddVisible(true);
    };

    // save task
    const handleSaveTask = async () => {
        try {

            if (!editHeading.trim() || !editDescription.trim()) {
                Alert.alert('Error', 'Heading and description are required');
                return;
            }

            const currentUserId = await AsyncStorage.getItem('userId');
            
            if (!currentUserId) {
                Alert.alert('Error', 'No user logged in');
                return;
            }
            
            // get the target user 
            const targetUserId = isAdminView ? viewingUserId : currentUserId;
            
            if (!targetUserId) {
                Alert.alert('Error', 'No target user identified');
                console.log('ERROR: targetUserId is null/undefined');
                return;
            }
            const formattedDeadline = format(deadlineDate, 'dd/MM/yyyy - hh:mm a');
            let apiEndpoint, taskData;
            
            if (isAdminView) {
                // admin creating task for another user - admin/create endpoint
                let targetUsername = viewingUsername || 'User';
                let targetUserEmail = 'user@example.com';
                
                try {
                    const userResponse = await axios.get(`http://localhost:3000/api/user/${targetUserId}`, {
                        headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
                    });
                    targetUsername = userResponse.data.username;
                    targetUserEmail = userResponse.data.email;
                } catch (error) {
                    console.error('Error fetching target user details:', error);
                }

                apiEndpoint = 'http://localhost:3000/api/tasks/admin/create';
                taskData = {
                    userId: targetUserId,
                    email: targetUserEmail,
                    username: targetUsername,
                    heading: editHeading.trim(),
                    description: editDescription.trim(),
                    deadline: formattedDeadline,
                    date: selectedDate,
                    completed: false,
                    createdBy: currentUserId
                };
            } else {
                // user or admin creating task for oneself - user/create endpoint
                
                apiEndpoint = 'http://localhost:3000/api/tasks/user/create';
                taskData = {
                    heading: editHeading.trim(),
                    description: editDescription.trim(),
                    deadline: formattedDeadline,
                    date: selectedDate,
                    completed: false
                };
            }

            const response = await axios.post(apiEndpoint, taskData, {
                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
            });
            setTasks([...tasks, response.data]);
            
            const successMessage = isAdminView 
                ? `Task added successfully for ${taskData.username || viewingUsername}`
                : 'Task added successfully';
            Alert.alert('Success', successMessage);
            
            setModalAddVisible(false);
            setEditHeading('');
            setEditDescription('');
            setDeadlineDate(new Date());
        } catch (error) {
            console.error('Error saving task:', error);
            console.error('Error details:', error.response?.data);
            Alert.alert('Error', 'Failed to save task');
        }
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setEditHeading(task.heading);
        setEditDescription(task.description);

        // parse the deadline string to date obj
        try {
            if (!task.deadline || typeof task.deadline !== 'string') {
                console.log('Deadline is undefined or not a string, using current date');
                setDeadlineDate(new Date());
                setShowPicker(false);
                setModalEditVisible(true);
                return;
            }

            if (!task.deadline.includes(' - ')) {
                console.log('Deadline format is not as expected, using current date');
                setDeadlineDate(new Date());
                setShowPicker(false);
                setModalEditVisible(true);
                return;
            }

            // If the deadline is in the format "DD/MM/YYYY - HH:MM AM/PM"
            const deadlineParts = task.deadline.split(' - ');
            const datePart = deadlineParts[0].split('/');
            const timePart = deadlineParts[1].split(' ');
            const timeValues = timePart[0].split(':');

            const day = parseInt(datePart[0]);
            const month = parseInt(datePart[1]) - 1;
            const year = parseInt(datePart[2]);
            let hours = parseInt(timeValues[0]);
            const minutes = parseInt(timeValues[1]);
            const isPM = timePart[1].toUpperCase() === 'PM';

            // convert 12-hour format to 24-hour format
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;

            const deadlineDate = new Date(year, month, day, hours, minutes);

            // check if the date is valid
            if (isNaN(deadlineDate.getTime())) {
                throw new Error('Invalid date created');
            }

            setDeadlineDate(deadlineDate);
        } catch (error) {
            console.error('Error parsing deadline date:', error);
            setDeadlineDate(new Date());
        }

        setShowPicker(false);
        setModalEditVisible(true);
    };

    const handleUpdateTask = async () => {
        try {
            if (!editHeading.trim()) {
                Alert.alert('Error', 'Please enter a task heading');
                return;
            }
            if (!editDescription.trim()) {
                Alert.alert('Error', 'Please enter a task description');
                return;
            }

            const formattedDeadline = format(deadlineDate, 'dd/MM/yyyy - hh:mm a');

            const updateData = {
                heading: editHeading.trim(),
                description: editDescription.trim(),
                deadline: formattedDeadline,
                updatedAt: new Date().toISOString()
            };

            const response = await axios.put(
                `http://localhost:3000/api/tasks/${editingTask._id}`,
                updateData,
                {
                    headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
                }
            );

            // Update local state
            setTasks(tasks.map(task =>
                task._id === editingTask._id
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
                            await axios.delete(`http://localhost:3000/api/tasks/${taskId}`, {
                                headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
                            });
                            setTasks(tasks.filter(task => task._id !== taskId));
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
            
            const response = await axios.patch(
                `http://localhost:3000/api/tasks/${taskId}/toggle`,
                {},
                {
                    headers: { Authorization: `Bearer ${await AsyncStorage.getItem('token')}` }
                }
            );

            // update local state only if request succeeds
            setTasks(tasks.map(task =>
                task._id === taskId
                    ? { ...task, completed: !currentStatus }
                    : task
            ));

            // update monthly tasks if in monthly view
            if (monthlyTasks.length > 0) {
                setMonthlyTasks(monthlyTasks.map(task =>
                    task._id === taskId
                        ? { ...task, completed: !currentStatus }
                        : task
                ));
            }
        } catch (error) {
            console.error('Error updating task completion:', error);
            if (error.response?.status === 404) {
                Alert.alert('Error', 'Task not found');
            } else {
                Alert.alert('Error', 'Failed to update task status');
            }
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
        const userId = AsyncStorage.getItem('userId');
        const isAdminCreated = item.createdBy === "admin";
        const isCurrentUserAdmin = isAdminView;
        const isAdminViewUserTasks = isAdminView && viewingUserId !== userId;
        const isMonthlyView = !selectedDate;

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
                        onPress={() => toggleTaskCompletion(item._id, item.completed)}
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
                        disabled={item.completed || (!isCurrentUserAdmin && isAdminCreated) || isMonthlyView}
                    >
                        <Icon
                            name="edit"
                            size={15}
                            color={(item.completed || (!isCurrentUserAdmin && isAdminCreated) || isMonthlyView) ? "#ccc" : "#007AFF"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => (isCurrentUserAdmin || !isAdminCreated) && handleDeleteTask(item._id)}
                        disabled={(!isCurrentUserAdmin && isAdminCreated) || isMonthlyView}
                    >
                        <Icon
                            name="delete"
                            size={15}
                            color={(!isCurrentUserAdmin && isAdminCreated) || isMonthlyView ? "#ccc" : "#FF3B30"}
                        />
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

            {isMonthlyView && (
                <TouchableOpacity
                    style={styles.viewTaskButton}
                    onPress={() => {
                        // Pass along all the necessary information for proper navigation
                        const navigationParams = {
                            date: item.date,
                            // If this is an admin view, pass the user information
                            ...(isAdminView && {
                                isAdminView: true,
                                userId: viewingUserId,
                                username: viewingUsername
                            })
                        };
                        navigation.navigate('Tasks', navigationParams);
                    }}
                >
                    <Text style={styles.viewTaskButtonText}>View Details</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

    // function to get selected month name
    const getSelectedMonthName = () => {
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[selectedMonth];
    };

    // Function to navigate to previous month
    const goToPreviousMonth = () => {
        let newMonth = selectedMonth - 1;
        let newYear = selectedYear;

        if (newMonth < 0) {
            newMonth = 11; // December
            newYear -= 1;
        }

        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
        setMonthlyTasksLoaded(false); 
    };

    // Function to navigate to next month
    const goToNextMonth = () => {
        let newMonth = selectedMonth + 1;
        let newYear = selectedYear;

        if (newMonth > 11) {
            newMonth = 0; // January
            newYear += 1;
        }

        setSelectedMonth(newMonth);
        setSelectedYear(newYear);
        setMonthlyTasksLoaded(false); // Reset to trigger a new fetch
    };

    // Helper function to sort tasks by date
    const sortTasksByDate = (tasks) => {
        return [...tasks].sort((a, b) => new Date(a.date) - new Date(b.date));
    };

    // Render monthly tasks as individual cards
        const renderMonthlyTasksList = () => {
            return (
                <>
                    <View style={styles.monthSelectorContainer}>
                        <TouchableOpacity
                            style={styles.monthNavigationButton}
                            onPress={goToPreviousMonth}
                        >
                            <Icon name="chevron-left" type="feather" size={24} color="#007AFF" />
                        </TouchableOpacity>

                        <View style={styles.monthYearContainer}>
                            <Text style={styles.monthTitle}>{getSelectedMonthName()}</Text>
                            <Text style={styles.yearText}>{selectedYear}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.monthNavigationButton}
                            onPress={goToNextMonth}
                        >
                            <Icon name="chevron-right" type="feather" size={24} color="#007AFF" />
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                    ) : (
                        <FlatList
                            data={sortTasksByDate(monthlyTasks)}
                            renderItem={renderTask}
                            keyExtractor={(item) => item._id}
                            contentContainerStyle={styles.flatListContent}
                            style={styles.flatListStyle} 
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                            removeClippedSubviews={false}
                            ListEmptyComponent={() => (
                                <View style={styles.noTasksContainer}>
                                    <Text style={styles.noTasksText}>No tasks for {getSelectedMonthName()} {selectedYear}</Text>
                                </View>
                            )}
                        />
                    )}
                </>
            );
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

    return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        {(isAdminView || userRole === "admin") ? (
                            <TouchableOpacity
                                onPress={() => {
                                    if (isAdminView && viewingUserId !== user?.userId) {
                                        navigation.navigate("Admin");
                                    } else {
                                        if (navigation.canGoBack()) {
                                            navigation.goBack();
                                        } else {
                                            navigation.navigate("AdminTasks");
                                        }
                                    }
                                }}
                                style={styles.backButton}
                            >
                                <Icon name="arrow-left" type="feather" size={18} color="#333" />
                            </TouchableOpacity>
                        ) : showMenu && (
                            <TouchableOpacity onPress={() => navigation.openDrawer()}>
                                <Icon name="menu" size={25} color="#333" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.headerCenter}>
                        <Text style={styles.title}>
                            {selectedDate ? (
                                isAdminView
                                    ? `${viewingUsername}'s Tasks - ${format(new Date(selectedDate), 'dd/MM/yyyy')}`
                                    : `Tasks for ${format(new Date(selectedDate), 'dd/MM/yyyy')}`
                            ) : (
                                isAdminView
                                    ? `${viewingUsername}'s Tasks`
                                    : 'Tasks'
                            )}
                        </Text>
                    </View>

                    <View style={styles.headerRight}>
                        <TouchableOpacity onPress={handleLogout}>
                            <Icon name="logout" size={25} color="#333" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Navigation buttons */}
                <View style={styles.navigationButtonsContainer}>
                    <TouchableOpacity
                        style={[styles.navigationButton, selectedDate ? styles.activeNavigationButton : {}]}
                        onPress={() => {
                            if (isAdminView) {
                                navigation.navigate('Admin');
                            } else if (userRole === 'admin') {
                                navigation.navigate('Admin');
                            } else if(userRole !== 'admin') {
                                navigation.navigate('Dashboard');
                            }
                        }}
                    >
                        <Icon name="calendar" type="feather" size={16} color={selectedDate ? "#fff" : "#007AFF"} />
                        <Text style={[styles.navigationButtonText, selectedDate ? styles.activeNavigationButtonText : {}]}>Select Day</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.navigationButton, !selectedDate ? styles.activeNavigationButton : {}]}
                        onPress={() => {
                            setSelectedDate(null);
                            if (!monthlyTasksLoaded) {
                                fetchMonthlyTasks();
                            }
                        }}
                    >
                        <Icon name="calendar-range" type="material-community" size={16} color={!selectedDate ? "#fff" : "#007AFF"} />
                        <Text style={[styles.navigationButtonText, !selectedDate ? styles.activeNavigationButtonText : {}]}>Month View</Text>
                    </TouchableOpacity>
                </View>

                {/* Main content  */}
                    {/* <View style={styles.mainContentContainer}> */}
                        {loading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#007AFF" />
                            </View>
                        ) : !selectedDate && monthlyTasksLoaded ? (
                            <View style={styles.monthlyTasksWrapper}>
                                {renderMonthlyTasksList()}
                            </View>
                        ) : tasks.length === 0 ? (
                            <View style={styles.noTasksContainer}>
                                <Text style={styles.noTasksText}>No tasks for this date</Text>
                            </View>
                        ) : (
                            <View style={styles.dailyTasksWrapper}>
                                <FlatList
                                    data={tasks}
                                    renderItem={renderTask}
                                    keyExtractor={(item) => item._id}
                                    contentContainerStyle={styles.flatListContent}
                                    style={styles.flatListStyle}
                                    showsVerticalScrollIndicator={true}
                                    nestedScrollEnabled={true}
                                />
                            </View>
                        )}
                    {/* </View> */}

                    {/* floating "+" button */}
                    <TouchableOpacity style={styles.addButton} onPress={handleAddTask}>
                        <Icon name="add" size={30} color="white" />
                    </TouchableOpacity>

                {/* add task modal */}
                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={modalAddVisible}
                    onRequestClose={() => {
                        setModalAddVisible(false);
                        setShowPicker(false);
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Task for {format(new Date(selectedDate), 'dd/MM/yyyy')}</Text>
                                <TouchableOpacity onPress={() => {
                                    setModalAddVisible(false);
                                    setShowPicker(false);
                                }}>
                                    <Icon name="close" size={20} color="black" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Task Heading</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editHeading}
                                    onChangeText={setEditHeading}
                                    placeholderTextColor="#000000"
                                />

                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    multiline={true}
                                    numberOfLines={4}
                                    placeholderTextColor="#000000"
                                />

                                <Text style={styles.inputLabel}>Deadline</Text>
                                <View style={styles.dateTimeButtonsContainer}>
                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => {
                                            // ensure any existing picker is closed first
                                            setShowPicker(false);
                                            // use setTimeout to ensure the previous picker is fully closed
                                            setTimeout(() => {
                                                setPickerMode('date');
                                                setShowPicker(true);
                                            }, 100);
                                        }}
                                    >
                                        <Icon name="calendar" type="feather" size={16} color="#007AFF" />
                                        <Text style={styles.dateTimeButtonText}>Select Date</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => {
                                            // ensure any existing picker is closed first
                                            setShowPicker(false);
                                            // Use setTimeout to ensure the previous picker is fully closed
                                            setTimeout(() => {
                                                setPickerMode('time');
                                                setShowPicker(true);
                                            }, 100);
                                        }}
                                    >
                                        <Icon name="clock" type="feather" size={16} color="#007AFF" />
                                        <Text style={styles.dateTimeButtonText}>Select Time</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.selectedDeadlineContainer}>
                                    <Text style={styles.selectedDeadlineText}>
                                        {format(deadlineDate, 'dd/MM/yyyy - hh:mm a')}
                                    </Text>
                                </View>

                                {showPicker && (
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={deadlineDate}
                                        mode={pickerMode}
                                        is24Hour={false}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_, selectedDate) => {
                                            // Always hide the picker on Android after selection
                                            if (Platform.OS === 'android') {
                                                setShowPicker(false);
                                            }

                                            // Update the date if a selection was made
                                            if (selectedDate) {
                                                // For iOS, if in date mode, switch to time mode after date selection
                                                if (Platform.OS === 'ios' && pickerMode === 'date') {
                                                    setPickerMode('time');
                                                    // Create a new date with the selected date but keep current time
                                                    const updatedDate = new Date(selectedDate);
                                                    updatedDate.setHours(deadlineDate.getHours());
                                                    updatedDate.setMinutes(deadlineDate.getMinutes());
                                                    setDeadlineDate(updatedDate);
                                                }
                                                // For iOS, if in time mode, hide picker after time selection
                                                else if (Platform.OS === 'ios' && pickerMode === 'time') {
                                                    setShowPicker(false);
                                                    // Create a new date with the current date but selected time
                                                    const updatedDate = new Date(deadlineDate);
                                                    updatedDate.setHours(selectedDate.getHours());
                                                    updatedDate.setMinutes(selectedDate.getMinutes());
                                                    setDeadlineDate(updatedDate);
                                                }
                                                // For Android, update the date directly
                                                else {
                                                    setDeadlineDate(selectedDate);
                                                }
                                            }
                                        }}
                                    />
                                )}
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
                    onRequestClose={() => {
                        setModalEditVisible(false);
                        setShowPicker(false);
                    }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Edit Task for {format(new Date(selectedDate), 'dd/MM/yyyy')}</Text>
                                <TouchableOpacity onPress={() => {
                                    setModalEditVisible(false);
                                    setShowPicker(false);
                                }}>
                                    <Icon name="close" size={20} color="black" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Task Heading</Text>
                                <TextInput
                                    style={styles.input}
                                    value={editHeading}
                                    onChangeText={setEditHeading}
                                    placeholderTextColor="#000000"
                                />

                                <Text style={styles.inputLabel}>Description</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={editDescription}
                                    onChangeText={setEditDescription}
                                    multiline={true}
                                    numberOfLines={4}
                                    placeholderTextColor="#000000"
                                />

                                <Text style={styles.inputLabel}>Deadline</Text>
                                <View style={styles.dateTimeButtonsContainer}>
                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => {
                                            // Ensure any existing picker is closed first
                                            setShowPicker(false);
                                            // Use setTimeout to ensure the previous picker is fully closed
                                            setTimeout(() => {
                                                setPickerMode('date');
                                                setShowPicker(true);
                                            }, 100);
                                        }}
                                    >
                                        <Icon name="calendar" type="feather" size={16} color="#007AFF" />
                                        <Text style={styles.dateTimeButtonText}>Select Date</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.dateTimeButton}
                                        onPress={() => {
                                            // Ensure any existing picker is closed first
                                            setShowPicker(false);
                                            // Use setTimeout to ensure the previous picker is fully closed
                                            setTimeout(() => {
                                                setPickerMode('time');
                                                setShowPicker(true);
                                            }, 100);
                                        }}
                                    >
                                        <Icon name="clock" type="feather" size={16} color="#007AFF" />
                                        <Text style={styles.dateTimeButtonText}>Select Time</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.selectedDeadlineContainer}>
                                    <Text style={styles.selectedDeadlineText}>
                                        {format(deadlineDate, 'dd/MM/yyyy - hh:mm a')}
                                    </Text>
                                </View>

                                {showPicker && (
                                    <DateTimePicker
                                        testID="dateTimePicker"
                                        value={deadlineDate}
                                        mode={pickerMode}
                                        is24Hour={false}
                                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                        onChange={(_, selectedDate) => {
                                            // Always hide the picker on Android after selection
                                            if (Platform.OS === 'android') {
                                                setShowPicker(false);
                                            }

                                            // Update the date if a selection was made
                                            if (selectedDate) {
                                                // For iOS, if in date mode, switch to time mode after date selection
                                                if (Platform.OS === 'ios' && pickerMode === 'date') {
                                                    setPickerMode('time');
                                                    // Create a new date with the selected date but keep current time
                                                    const updatedDate = new Date(selectedDate);
                                                    updatedDate.setHours(deadlineDate.getHours());
                                                    updatedDate.setMinutes(deadlineDate.getMinutes());
                                                    setDeadlineDate(updatedDate);
                                                }
                                                // For iOS, if in time mode, hide picker after time selection
                                                else if (Platform.OS === 'ios' && pickerMode === 'time') {
                                                    setShowPicker(false);
                                                    // Create a new date with the current date but selected time
                                                    const updatedDate = new Date(deadlineDate);
                                                    updatedDate.setHours(selectedDate.getHours());
                                                    updatedDate.setMinutes(selectedDate.getMinutes());
                                                    setDeadlineDate(updatedDate);
                                                }
                                                // For Android, update the date directly
                                                else {
                                                    setDeadlineDate(selectedDate);
                                                }
                                            }
                                        }}
                                    />
                                )}
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
        left: 5,
        top: "50%",
        transform: [ {translateX: -10}],
        padding: 10,
        zIndex: 10,
        marginTop: -43
    },
    container: {
        flex: 1,
        padding: 16,
        backgroundColor: '#f0f0f0',
        // marginTop: 5,
        paddingTop: 5,
        paddingHorizontal: 16
    },
    header: {
        width: '100%',
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 15,
        backgroundColor: '#f8f8f8',
        marginBottom: 20,
        position: 'relative',
        paddingHorizontal: -3,
    },
    headerLeft: {
        width: 50,
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingLeft: 10,
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerRight: {
        width: 50,
        alignItems: 'flex-end',
        justifyContent: 'center',
        paddingRight: 10,
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
    // mainContentContainer: {
    //     flex: 1,
    //     width: '100%',
    // },
    monthlyTasksWrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: '#f0f0f0'
    },
    dailyTasksWrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: '#f0f0f0'
    },
    flatListStyle: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent'
    },
    flatListContent: {
        paddingBottom: 100,
        // flexGrow: 1,
        paddingTop: 8
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
    // scrollContainer: {
    //     flex: 1,
    //     backgroundColor: '#f0f0f0',
    //     width: '100%'
    // },
    // Modal styles
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
        color: "#000000"
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
        // backgroundColor: '#f0f0f0',
        backgroundColor: 'transparent'
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
        backgroundColor: 'transparent',
        paddingTop: 50
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
    // Monthly tasks styles
    monthlyTasksContainer: {
        flex: 1,
        width: '100%',
        backgroundColor: 'transparent'
    },
    monthTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    viewTaskButton: {
        backgroundColor: '#007AFF',
        padding: 8,
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 10,
    },
    viewTaskButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    // Navigation buttons styles
    navigationButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
        paddingHorizontal: 10,
    },
    navigationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 15,
        width: '48%',
    },
    activeNavigationButton: {
        backgroundColor: '#007AFF',
        borderColor: '#007AFF',
    },
    navigationButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 5,
    },
    activeNavigationButtonText: {
        color: 'white',
    },
    // Date and time picker styles
    dateTimeButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    dateTimeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f0f0',
        borderWidth: 1,
        borderColor: '#007AFF',
        borderRadius: 8,
        paddingVertical: 10,
        paddingHorizontal: 15,
        width: '48%',
    },
    dateTimeButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 5,
    },
    selectedDeadlineContainer: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
    },
    selectedDeadlineText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    // Month selector styles
    monthSelectorContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 8,
        paddingVertical: 5,
    },
    monthNavigationButton: {
        padding: 8,
        borderRadius: 16,
        backgroundColor: '#f0f0f0',
    },
    monthYearContainer: {
        alignItems: 'center',
    },
    yearText: {
        fontSize: 12,
        color: '#666',
        marginTop: 3,
    },
});