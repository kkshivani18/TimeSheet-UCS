import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from '../services/adminService';

const AdminContext = createContext();

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within AdminProvider');
    }
    return context;
};

export const AdminProvider = ({ children }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);

    const checkAdminStatus = async () => {
        try {
            const role = await AsyncStorage.getItem('role');
            setIsAdmin(role === 'admin');
        } catch (error) {
            console.error('Error checking admin status:', error);
            setIsAdmin(false);
        }
    };

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const usersData = await adminService.getAllUsers();
            setUsers(usersData);
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkAdminStatus();
    }, []);

    const value = {
        isAdmin,
        users,
        loading,
        checkAdminStatus,
        fetchUsers,
        updateUserRole: adminService.updateUserRole,
        deleteUser: adminService.deleteUser
    };

    return (
        <AdminContext.Provider value={value}>
            {children}
        </AdminContext.Provider>
    );
};