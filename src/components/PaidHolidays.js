import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { FIREBASE_AUTH, FIRESTORE_DB } from '../firebaseConfig';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where } from 'firebase/firestore';
import { Icon } from 'react-native-elements';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { format, parse, isValid } from 'date-fns';
import { Picker } from '@react-native-picker/picker';

export default function PaidHolidays({ navigation }) {
    const [holidays, setHolidays] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [years] = useState(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear + i);
    });

    useEffect(() => {
        fetchHolidays();
    }, [selectedYear]);

    const fetchHolidays = async () => {
        try {
            setIsLoading(true);
            const holidaysQuery = query(
                collection(FIRESTORE_DB, 'paidHolidays'),
                where('year', '==', selectedYear)
            );
            const querySnapshot = await getDocs(holidaysQuery);
            const holidaysList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setHolidays(holidaysList);
        } catch (error) {
            console.error('Error fetching holidays:', error);
            Alert.alert('Error', 'Failed to fetch holidays');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['text/csv', 'application/vnd.ms-excel'],
                copyToCacheDirectory: true
            });

            if (result.type === 'success') {
                setIsLoading(true);
                const fileContent = await FileSystem.readAsStringAsync(result.uri);
                const lines = fileContent.split('\n');
                
                // Skip header row
                for (let i = 1; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (!line) continue;

                    const [date, description] = line.split(',').map(item => item.trim());
                    if (!date || !description) continue;

                    // Parsing date (DD/MM/YYYY)
                    const parsedDate = parse(date, 'dd/MM/yyyy', new Date());
                    if (!isValid(parsedDate)) {
                        console.error(`Invalid date format: ${date}`);
                        continue;
                    }

                    const formattedDate = format(parsedDate, 'dd-MM-yyyy');
                    const year = parsedDate.getFullYear();

                    // Add to Firestore
                    await addDoc(collection(FIRESTORE_DB, 'paidHolidays'), {
                        date: formattedDate,
                        description,
                        year,
                        createdAt: new Date().toISOString(),
                        createdBy: FIREBASE_AUTH.currentUser?.uid
                    });
                }

                Alert.alert('Success', 'Holidays uploaded successfully');
                fetchHolidays();
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            Alert.alert('Error', 'Failed to upload holidays file');
        } finally {
            setIsLoading(false);
        }
    };

    const deleteHoliday = async (holidayId) => {
        try {
            await deleteDoc(doc(FIRESTORE_DB, 'paidHolidays', holidayId));
            setHolidays(holidays.filter(h => h.id !== holidayId));
            Alert.alert('Success', 'Holiday deleted successfully');
        } catch (error) {
            console.error('Error deleting holiday:', error);
            Alert.alert('Error', 'Failed to delete holiday');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.openDrawer()}>
                    <Icon name="menu" size={25} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Manage Paid Holidays</Text>
                <TouchableOpacity onPress={handleFileUpload}>
                    <Icon name="upload" size={25} color="#333" />
                </TouchableOpacity>
            </View>

            <View style={styles.yearSelector}>
                <Text style={styles.yearLabel}>Select Year:</Text>
                <Picker
                    selectedValue={selectedYear}
                    style={styles.yearPicker}
                    onValueChange={(itemValue) => setSelectedYear(itemValue)}
                >
                    {years.map(year => (
                        <Picker.Item key={year} label={year.toString()} value={year} />
                    ))}
                </Picker>
            </View>

            {isLoading ? (
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
            ) : (
                <ScrollView style={styles.holidaysList}>
                    {holidays.length === 0 ? (
                        <Text style={styles.noHolidays}>No holidays found for {selectedYear}</Text>
                    ) : (
                        holidays.map(holiday => (
                            <View key={holiday.id} style={styles.holidayItem}>
                                <View style={styles.holidayInfo}>
                                    <Text style={styles.holidayDate}>
                                        {format(new Date(holiday.date), 'dd-MM-yyyy')}
                                    </Text>
                                    <Text style={styles.holidayDescription}>{holiday.description}</Text>
                                </View>
                                <TouchableOpacity
                                    onPress={() => deleteHoliday(holiday.id)}
                                    style={styles.deleteButton}
                                >
                                    <Icon name="delete" size={24} color="#FF3B30" />
                                </TouchableOpacity>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0f0f0',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        marginTop: 25,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        marginTop: 8,
    },
    yearLabel: {
        fontSize: 16,
        marginRight: 10,
    },
    yearPicker: {
        flex: 1,
        height: 50,
    },
    holidaysList: {
        flex: 1,
        padding: 16,
    },
    holidayItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    holidayInfo: {
        flex: 1,
    },
    holidayDate: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    holidayDescription: {
        fontSize: 14,
        color: '#666',
    },
    deleteButton: {
        padding: 8,
    },
    loader: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noHolidays: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 20,
    },
});