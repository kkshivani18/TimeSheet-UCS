import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:3000/api';

const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
};

export const adminService = {
    // Get all users
    getAllUsers: async () => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_URL}/admin/users`, { headers });
        return response.data;
    },

    // Get user by ID
    getUserById: async (userId) => {
        const headers = await getAuthHeaders();
        const response = await axios.get(`${API_URL}/admin/users/${userId}`, { headers });
        return response.data;
    },

    // Update user role
    updateUserRole: async (userId, role) => {
        const headers = await getAuthHeaders();
        const response = await axios.put(`${API_URL}/admin/users/${userId}/role`, { role }, { headers });
        return response.data;
    },

    // Delete user
    deleteUser: async (userId) => {
        const headers = await getAuthHeaders();
        const response = await axios.delete(`${API_URL}/admin/users/${userId}`, { headers });
        return response.data;
    }
};