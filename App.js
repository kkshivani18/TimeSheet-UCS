import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, BackHandler } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import SignUp from './src/authscreens/SignUp';
import Authentication from './src/authscreens/Authentication';
import Login from './src/authscreens/Login';
import Tasks from './src/screens/Tasks';
import DrawerNavigator from './src/navigation/DrawerNavigation';
import Admin from './src/components/Admin';
import AdminNavigator from './src/navigation/AdminNavigation';
import AdminTasks from './src/components/AdminTasks';

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const HeaderTitle = () => (
  <View style={styles.headerContainer}>
    <Image
      source={require('./images/UCS logo.png')}
      style={styles.logo}
    />
  </View>
);

export default function App() {

  useEffect(() => {
    const backAction = () => true; 
  
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
  
    return () => backHandler.remove(); 
  }, []);
  
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="SignUp">
        <Stack.Screen
          name="SignUp"
          component={SignUp}
          options={{
            headerTitle: () => <HeaderTitle />,
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Authentication"
          component={Authentication}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Login"
          component={Login}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DrawerNavigator}
          options={{
            headerShown: false,
            gestureEnabled: false,
          }}
        />
        <Stack.Screen
          name="Tasks"
          component={Tasks}
          options={{
            headerShown: false, 
            gestureEnabled: false,
          }}
        />
        <Stack.Screen 
              name="Admin" 
              component={AdminNavigator}
              options={{
                  headerShown: false,
                  gestureEnabled: false,
              }} 
        />
        <Stack.Screen 
              name="AdminTasks" 
              component={AdminTasks}
              options={{
                  headerShown: false,
                  gestureEnabled: false,
              }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 30,
    marginRight: 10,
  },
});
