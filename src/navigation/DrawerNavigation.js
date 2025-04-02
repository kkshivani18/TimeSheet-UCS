import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Dashboard from '../screens/Dashboard';
import Tasks from '../screens/Tasks';
import LeaveApplication from '../screens/LeaveApplication';
import { Icon } from 'react-native-elements';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
    return (
        <Drawer.Navigator 
            initialRouteName="Dashboard"
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: '#007AFF',
                drawerLabelStyle: {
                    fontSize: 16,
                }
            }}
        >
            <Drawer.Screen 
                name="Dashboard" 
                component={Dashboard}
                options={{
                    drawerLabel: 'Dashboard',
                    drawerIcon: ({color}) => (
                        <Icon name="dashboard" size={20} color={color} />
                    )
                }}
            />
            <Drawer.Screen 
                name="Tasks" 
                component={Tasks}
                options={{
                    drawerLabel: 'Tasks',
                    drawerIcon: ({color}) => (
                        <Icon name="list" size={20} color={color} />
                    )
                }}
            />
            <Drawer.Screen
                name="LeaveApplication"
                component={LeaveApplication}
                options={{
                    drawerLabel: 'Apply Leave',
                    drawerIcon: ({color}) => <Icon name="event" size={20} color={color} />
                }}
            />
        </Drawer.Navigator>
    );
}