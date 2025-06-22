import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
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
        } else if (!selectedDate && (viewingUserId || !isAdminView)) {
            fetchMonthlyTasks();
        }
    }, [selectedDate, viewingUserId, isAdminView]);

    // Fetch monthly tasks when month or year changes
    useEffect(() => {
        if (!selectedDate && (viewingUserId || !isAdminView) && !monthlyTasksLoaded) {
            fetchMonthlyTasks();
        }
    }, [selectedMonth, selectedYear, monthlyTasksLoaded]);

    const fetchMonthlyTasks = async () => {
        try {
            setLoading(true);
            const user = FIREBASE_AUTH.currentUser;
            if (!user) {
                navigation.replace('Login');
                return;
            }

            // Determine which user's tasks to fetch
            const targetUserId = isAdminView ? viewingUserId : user.uid;

            // Get selected month's start and end dates
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

            const tasksQuery = query(
                collection(FIRESTORE_DB, 'tasks'),
                where('userId', '==', targetUserId),
                where('date', '>=', startOfMonth.toISOString()),
                where('date', '<=', endOfMonth.toISOString())
            );

            const querySnapshot = await getDocs(tasksQuery);
            const tasksList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Monthly tasks found:', tasksList.length);
            setMonthlyTasks(tasksList);
            setMonthlyTasksLoaded(true);
        } catch (error) {
            console.error('Error fetching monthly tasks:', error);
            Alert.alert('Error', 'Failed to fetch monthly tasks');
        } finally {
            setLoading(false);
        }
    };

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
        // If no date is selected, prompt the user to select a date first
        if (!selectedDate) {
            Alert.alert(
                'Select a Date',
                'Select a date from the calendar to add a task.',
                [{
                    text: 'OK',
                    onPress: () => {
                        // Navigate to the appropriate dashboard based on user role
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

        setEditingTask(null);
        setEditHeading('');
        setEditDescription('');
        setDeadlineDate(new Date());
        setShowPicker(false);
        setModalAddVisible(true);
    };

    const handleSaveTask = async () => {
        try {
            if (!editHeading.trim() || !editDescription.trim()) {
                Alert.alert('Error', 'Heading and description are required');
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

            // Format the deadline date
            const formattedDeadline = format(deadlineDate, 'dd/MM/yyyy - hh:mm a');

            const newTask = {
                userId: isAdminView ? viewingUserId : user.uid,
                email: user.email,
                username: username,
                heading: editHeading.trim(),
                description: editDescription.trim(),
                deadline: formattedDeadline,
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

        // parse the deadline string to a Date object
        try {
            // First check if deadline exists and is in the expected format
            if (!task.deadline || typeof task.deadline !== 'string') {
                console.log('Deadline is undefined or not a string, using current date');
                setDeadlineDate(new Date());
                setShowPicker(false);
                setModalEditVisible(true);
                return;
            }

            // Check if the deadline string contains the expected delimiter
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
            const month = parseInt(datePart[1]) - 1; // Month is 0-indexed in JS Date
            const year = parseInt(datePart[2]);
            let hours = parseInt(timeValues[0]);
            const minutes = parseInt(timeValues[1]);
            const isPM = timePart[1].toUpperCase() === 'PM';

            // Convert 12-hour format to 24-hour format
            if (isPM && hours < 12) hours += 12;
            if (!isPM && hours === 12) hours = 0;

            const deadlineDate = new Date(year, month, day, hours, minutes);

            // Check if the date is valid
            if (isNaN(deadlineDate.getTime())) {
                throw new Error('Invalid date created');
            }

            setDeadlineDate(deadlineDate);
        } catch (error) {
            // If parsing fails, use current date
            console.error('Error parsing deadline date:', error);
            setDeadlineDate(new Date());
        }

        setShowPicker(false);
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

            // Format the deadline date
            const formattedDeadline = format(deadlineDate, 'dd/MM/yyyy - hh:mm a');

            const taskRef = doc(FIRESTORE_DB, 'tasks', editingTask.id);
            const updateData = {
                heading: editHeading.trim(),
                description: editDescription.trim(),
                deadline: formattedDeadline,
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
                        disabled={item.completed || (!isCurrentUserAdmin && isAdminCreated) || isMonthlyView}
                    >
                        <Icon
                            name="edit"
                            size={15}
                            color={(item.completed || (!isCurrentUserAdmin && isAdminCreated) || isMonthlyView) ? "#ccc" : "#007AFF"}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => (isCurrentUserAdmin || !isAdminCreated) && handleDeleteTask(item.id)}
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

    // Helper function to get selected month name
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
        setMonthlyTasksLoaded(false); // Reset to trigger a new fetch
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
            <View style={styles.monthlyTasksContainer}>
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
                        keyExtractor={(item) => item.id}
                        ListEmptyComponent={() => (
                            <View style={styles.noTasksContainer}>
                                <Text style={styles.noTasksText}>No tasks for {getSelectedMonthName()} {selectedYear}</Text>
                            </View>
                        )}
                    />
                )}
            </View>
        );
    };

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
                            <Icon name="arrow-left" type="feather" size={18} color="#333" />
                        </TouchableOpacity>
                    ) : showMenu && (
                        <TouchableOpacity onPress={() => navigation.openDrawer()}>
                            <Icon name="menu" size={22} color="#333" />
                        </TouchableOpacity>
                    )}

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

            {/* Navigation buttons */}
            <View style={styles.navigationButtonsContainer}>
                <TouchableOpacity
                    style={[styles.navigationButton, selectedDate ? styles.activeNavigationButton : {}]}
                    onPress={() => {
                        // Check admin view and navigate accordingly

                        if (isAdminView) {
                            // admin viewing a user's tasks, go to Admin dashboard
                            navigation.navigate('Admin');
                        }

                        else if (userRole === 'admin') {
                          // admin is viewing own tasks (ideally should go to AdminTasks but giving the navigation.openDrawer error) - (temp fix)
                            navigation.navigate('Admin');
                        }

                        else if(userRole !== 'admin') {
                            // Regular user goes to Dashboard
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
                        // Clear selectedDate to show monthly view
                        setSelectedDate(null);
                        // Ensure monthly tasks are loaded
                        if (!monthlyTasksLoaded) {
                            fetchMonthlyTasks();
                        }
                    }}
                >
                    <Icon name="calendar-range" type="material-community" size={16} color={!selectedDate ? "#fff" : "#007AFF"} />
                    <Text style={[styles.navigationButtonText, !selectedDate ? styles.activeNavigationButtonText : {}]}>Month View</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : !selectedDate && monthlyTasksLoaded ? (
                renderMonthlyTasksList()
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
        marginTop: -18

    },
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
        paddingHorizontal: 10,
        borderRadius: 15,
        backgroundColor: '#f8f8f8',
        marginBottom: 20,
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
    // Monthly tasks styles
    monthlyTasksContainer: {
        flex: 1,
        width: '100%',
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