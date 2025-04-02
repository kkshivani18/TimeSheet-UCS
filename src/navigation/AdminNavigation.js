import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Admin from '../components/Admin';
import AdminTasks from '../components/AdminTasks';
import AdminLeave from '../components/AdminLeave';
import { Icon } from 'react-native-elements';

const AdminDrawer = createDrawerNavigator();

export default function AdminNavigator() {
    return (
        <AdminDrawer.Navigator
        initialRouteName="Admin"
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: '#007AFF',
                drawerLabelStyle: {
                    fontSize: 16,
                }
            }}
        >
            <AdminDrawer.Screen
                name="Admin" 
                component={Admin}
                options={{
                    drawerLabel: 'View Tasks',
                    drawerIcon: ({color}) => (
                        <Icon name="dashboard" size={20} color={color} />
                    )
                }}
            />
            <AdminDrawer.Screen
                name="AdminTasks" 
                component={AdminTasks}
                options={{
                    drawerLabel: 'Manage Tasks',
                    drawerIcon: ({color}) => (
                        <Icon name="list" size={20} color={color} />
                    )
                }}
            />
            <AdminDrawer.Screen
                name="AdminLeave"
                component={AdminLeave}
                options={{
                    drawerLabel: 'Leave Requests',
                    drawerIcon: ({color}) => (
                        <Icon name="assignment" size={20} color={color} />
                    )
                }}
            />
        </AdminDrawer.Navigator>
    )
}