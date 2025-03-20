import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, Alert, ScrollView, SafeAreaView } from 'react-native';
import { Card, Button, IconButton, Surface } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

export default function Settings() {
    const [notificationsEnabled, setNotificationsEnabled] = useState(false);

    // Request notification permissions
    const requestNotificationPermissions = async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
            Alert.alert('Notifications Disabled', 'You will not receive air quality change notifications.');
            setNotificationsEnabled(false);
            return false;
        }
        
        return true;
    };

    // Toggle notifications
    const toggleNotifications = async (value: boolean) => {
        if (value) {
            const permissionGranted = await requestNotificationPermissions();
            if (permissionGranted) {
                setNotificationsEnabled(true);
                await AsyncStorage.setItem('notificationsEnabled', 'true');
            }
        } else {
            setNotificationsEnabled(false);
            await AsyncStorage.setItem('notificationsEnabled', 'false');
        }
    };

    // Load notification preferences
    useEffect(() => {
        const loadNotificationPreferences = async () => {
            try {
                const savedPreference = await AsyncStorage.getItem('notificationsEnabled');
                if (savedPreference === 'true') {
                    const permissionGranted = await requestNotificationPermissions();
                    setNotificationsEnabled(permissionGranted);
                }
            } catch (error) {
                console.error('Error loading notification preferences:', error);
            }
        };
        
        loadNotificationPreferences();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <Surface style={styles.header} elevation={4}>
                <IconButton 
                    icon="arrow-left" 
                    size={24} 
                    onPress={() => router.back()} 
                    iconColor="white"
                />
                <Text style={styles.headerTitle}>Settings</Text>
            </Surface>
            
            <ScrollView style={styles.content}>
                <Card style={styles.card}>
                    <Card.Title
                        title="Notifications"
                        left={(props) => <IconButton {...props} icon="bell" />}
                        titleStyle={styles.cardTitle}
                    />
                    <Card.Content>
                        <View style={styles.notificationContainer}>
                            <Text style={styles.notificationText}>
                                Receive alerts when air quality changes
                            </Text>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={toggleNotifications}
                                trackColor={{ false: '#767577', true: '#81b0ff' }}
                                thumbColor={notificationsEnabled ? '#2196F3' : '#f4f3f4'}
                            />
                        </View>
                        <Text style={styles.notificationDescription}>
                            You'll be notified when air quality significantly changes in your selected location.
                        </Text>
                    </Card.Content>
                </Card>
                
                <Card style={styles.card}>
                    <Card.Title
                        title="About Vayura"
                        left={(props) => <IconButton {...props} icon="information" />}
                        titleStyle={styles.cardTitle}
                    />
                    <Card.Content>
                        <Text style={styles.aboutText}>
                            Vayura is a personal air quality monitoring app that helps you breathe smarter and live cleaner.
                        </Text>
                        <Text style={styles.versionText}>
                            Version 1.0.0
                        </Text>
                    </Card.Content>
                </Card>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#2196F3',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
        marginLeft: 16,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    card: {
        marginBottom: 16,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2196F3',
    },
    notificationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    notificationText: {
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
    notificationDescription: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginTop: 8,
    },
    aboutText: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 8,
    },
    versionText: {
        fontSize: 14,
        color: '#666',
        marginTop: 16,
    },
});
