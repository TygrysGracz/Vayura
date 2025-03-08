import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

export default function Settings() {

    const clearAsyncStorage = async () => {
        try {
            await AsyncStorage.removeItem('hasLaunched');
            router.replace('/');
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Settings</Text>
            </View>
            <View style={styles.content}>
                <Button
                    mode="contained"
                    onPress={clearAsyncStorage}
                    style={styles.button}
                >
                    Clear Data
                </Button>
            </View>
            <View style={styles.buttonContainer}>
                <Button 
                    mode="contained" 
                    onPress={() => router.push('/home')}
                    style={styles.button}
                >
                    Back to Home
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#2196F3',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: 'white',
    },
    content: {
        flex: 1,
        padding: 20,
        marginTop: 20,
        shadowColor: 'grey',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    text: {
        fontSize: 16,
        color: '#333',
    },
    buttonContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e0e0e0',
    },
    button: {
        width: '100%',
        backgroundColor: '#2196F3',
    },
});
