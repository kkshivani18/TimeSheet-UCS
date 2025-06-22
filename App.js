import React, { useEffect } from 'react';
import { View, StyleSheet, Image, BackHandler, LogBox, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import SignUp from './src/authscreens/SignUp';
import Authentication from './src/authscreens/Authentication';
import Login from './src/authscreens/Login';
import Tasks from './src/screens/Tasks';
import DrawerNavigator from './src/navigation/DrawerNavigation';
import AdminNavigator from './src/navigation/AdminNavigation';
import Admin from './src/components/Admin';
import AdminTasks from './src/components/AdminTasks';
import AdminAttendance from './src/components/AdminAttendance';
import Attendance from './src/screens/Attendance';

// Ignore only necessary warnings
LogBox.ignoreLogs([
  'Setting a timer',
  'AsyncStorage has been extracted from react-native core',
]);

const Stack = createStackNavigator();

const HeaderTitle = () => (
  <View style={styles.headerContainer}>
    <Image
      source={require('./images/UCS logo.png')} 
      style={styles.logo}
      onError={(e) => console.error('Logo load error:', e.nativeEvent.error)}
    />
  </View>
);

// Error boundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong: {this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  return (
    <ErrorBoundary>
        <NavigationContainer
          onReady={() => console.log('NavigationContainer ready')}
          onStateChange={(state) => console.log('Navigation state:', state)}
        >
          <Stack.Navigator initialRouteName="Login">
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
            <Stack.Screen
              name="Attendance"
              component={Attendance}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="AdminAttendance"
              component={AdminAttendance}
              options={{
                headerShown: false,
                gestureEnabled: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
    </ErrorBoundary>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});