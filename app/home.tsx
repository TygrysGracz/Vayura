import { View, Text, ScrollView, StyleSheet, Dimensions, Alert, TextInput, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { Button, Card, IconButton, Surface, TextInput as PaperTextInput } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function Home() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [address, setAddress] = useState('Detecting location...');
  const [airQuality, setAirQuality] = useState<number | null>(null);
  const [previousAqi, setPreviousAqi] = useState<number | null>(null);
  const [aqiLevel, setAqiLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Send notification about air quality change
  const sendAirQualityNotification = useCallback(async (newAqi: number, oldAqi: number | null) => {
    if (!notificationsEnabled || !oldAqi) return;
    
    const difference = Math.abs(newAqi - oldAqi);
    const percentChange = oldAqi > 0 ? (difference / oldAqi) * 100 : 0;
    
    // Only notify if there's a significant change (>10%)
    if (percentChange > 10) {
      let title, body;
      
      if (newAqi > oldAqi) {
        title = 'Air Quality Alert';
        body = `Air quality in ${address} has worsened by ${percentChange.toFixed(0)}%. Current AQI: ${newAqi}`;
      } else {
        title = 'Air Quality Improved';
        body = `Good news! Air quality in ${address} has improved by ${percentChange.toFixed(0)}%. Current AQI: ${newAqi}`;
      }
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { aqi: newAqi, location: address },
        },
        trigger: null, // Send immediately
      });
    }
  }, [notificationsEnabled, address]);

  const getAirQuality = async (latitude: number, longitude: number) => {
    try {
      console.log('Fetching air quality for:', latitude, longitude);
      const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&hourly=european_aqi&timezone=auto`;
      console.log('API URL:', url);
      
      const response = await fetch(url);
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.hourly && data.hourly.european_aqi && data.hourly.time) {
        const currentTime = new Date().toISOString();
        console.log('Current time:', currentTime);
        
        const timeIndex = data.hourly.time.findIndex((time: string) => time > currentTime);
        const mostRecentIndex = timeIndex > 0 ? timeIndex - 1 : data.hourly.time.length - 1;
        
        const currentAQI = data.hourly.european_aqi[mostRecentIndex];
        console.log('Current AQI:', currentAQI);
        console.log('Time of measurement:', data.hourly.time[mostRecentIndex]);
        
        // Store previous AQI before updating
        setPreviousAqi(airQuality);
        setAirQuality(currentAQI);
        
        // Check if we need to send a notification about change
        if (airQuality !== null && airQuality !== currentAQI) {
          sendAirQualityNotification(currentAQI, airQuality);
        }
        
        if (currentAQI <= 20) setAqiLevel('Very Good');
        else if (currentAQI <= 40) setAqiLevel('Good');
        else if (currentAQI <= 60) setAqiLevel('Moderate');
        else if (currentAQI <= 80) setAqiLevel('Poor');
        else if (currentAQI <= 100) setAqiLevel('Very Poor');
        else setAqiLevel('Extremely Poor');
      } else {
        console.error('Invalid API response structure:', data);
        setAirQuality(null);
        setAqiLevel('');
      }
      
    } catch (error) {
      console.error('Error fetching air quality:', error);
      setAirQuality(null);
      setAqiLevel('');
    }
  };

  // Load notification preferences
  useEffect(() => {
    const loadNotificationPreferences = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('notificationsEnabled');
        if (savedPreference === 'true') {
          setNotificationsEnabled(true);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };
    
    loadNotificationPreferences();
  }, []);

  // Set up periodic air quality checks
  useEffect(() => {
    if (!notificationsEnabled || !location) return;
    
    const interval = setInterval(() => {
      getAirQuality(location.coords.latitude, location.coords.longitude);
    }, 30 * 60 * 1000); // Check every 30 minutes
    
    return () => clearInterval(interval);
  }, [notificationsEnabled, location]);

  const getHealthRecommendation = (aqi: number | null) => {
    if (!aqi) return 'Loading recommendations...';
    
    if (aqi <= 20) {
      return 'Air quality is excellent! Perfect for outdoor activities.';
    } else if (aqi <= 40) {
      return 'Air quality is good. Enjoy your outdoor activities!';
    } else if (aqi <= 60) {
      return 'Sensitive individuals should consider reducing prolonged outdoor activities.';
    } else if (aqi <= 80) {
      return 'Consider reducing outdoor activities. Wear a mask if necessary.';
    } else if (aqi <= 100) {
      return 'Avoid prolonged outdoor activities. Keep windows closed.';
    } else {
      return 'Stay indoors if possible. Wear a mask when outdoors.';
    }
  };

  const getAqiColor = (aqi: number) => {
    if (!aqi) return '#666';
    if (aqi <= 20) return '#50F0E6';
    if (aqi <= 40) return '#50CCAA';
    if (aqi <= 60) return '#F0E641';
    if (aqi <= 80) return '#FF5050';
    if (aqi <= 100) return '#960032';
    return '#7D2181';
  };

  // Generate AI recommendation based on air quality and location
  const generateAiRecommendation = useCallback(async (aqi: number | null, userLocation: string) => {
    if (!aqi) return;
    
    setAiLoading(true);
    try {
      // Analyze current air quality, location, and time of day
      let timeOfDay = '';
      const currentHour = new Date().getHours();
      if (currentHour >= 5 && currentHour < 12) timeOfDay = 'morning';
      else if (currentHour >= 12 && currentHour < 18) timeOfDay = 'afternoon';
      else timeOfDay = 'evening';
      
      // Simple AI logic to generate personalized recommendations
      let recommendation = '';
      
      if (aqi <= 20) {
        recommendation = `The air quality in ${userLocation} is excellent this ${timeOfDay}. Perfect time for outdoor activities like running or cycling. Enjoy the clean air!`;
      } else if (aqi <= 40) {
        recommendation = `Good air quality in ${userLocation} today. It's a nice ${timeOfDay} for outdoor activities, though sensitive individuals might want to monitor their breathing.`;
      } else if (aqi <= 60) {
        recommendation = `Moderate air quality in ${userLocation} this ${timeOfDay}. Consider reducing prolonged outdoor activities, especially if you have respiratory issues.`;
      } else if (aqi <= 80) {
        recommendation = `The air quality in ${userLocation} is poor right now. This ${timeOfDay}, it's advisable to limit outdoor exercise and wear a mask if necessary.`;
      } else if (aqi <= 100) {
        recommendation = `Very poor air quality in ${userLocation}. Stay indoors as much as possible this ${timeOfDay} and keep windows closed. Use air purifiers if available.`;
      } else {
        recommendation = `Air quality in ${userLocation} has reached hazardous levels. Remain indoors, use air purifiers, and wear N95 masks if you must go outside this ${timeOfDay}.`;
      }
      
      // Add a personalized tip based on time of day
      if (timeOfDay === 'morning') {
        recommendation += ' Consider checking the air quality again before your afternoon activities.';
      } else if (timeOfDay === 'afternoon') {
        recommendation += ' Plan your evening activities based on this information.';
      } else {
        recommendation += ' Tomorrow morning, check the app again for updated air quality information.';
      }
      
      setAiRecommendation(recommendation);
    } catch (error) {
      console.error('Error generating AI recommendation:', error);
      setAiRecommendation('Unable to generate recommendation at this time.');
    } finally {
      setAiLoading(false);
    }
  }, []);

  // Update AI recommendation when air quality or location changes
  useEffect(() => {
    if (airQuality && address) {
      generateAiRecommendation(airQuality, address);
    }
  }, [airQuality, address, generateAiRecommendation]);

  const updateLocation = async (newAddress: string) => {
    try {
      if (!newAddress.trim()) return;
      
      setIsLoading(true);
      setAddress(newAddress);
      
      const geocodeResult = await Location.geocodeAsync(newAddress);
      
      if (geocodeResult.length > 0) {
        const { latitude, longitude } = geocodeResult[0];
        
        setLocation({
          coords: {
            latitude,
            longitude,
            altitude: null,
            accuracy: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: Date.now()
        });
        
        await getAirQuality(latitude, longitude);
        setErrorMsg(null);
      } else {
        setErrorMsg('Location not found');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      setErrorMsg('Error finding location');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationChange = useCallback((text: string) => {
    setAddress(text);
    
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (text.length > 2) {
      const timeout = setTimeout(() => {
        updateLocation(text);
      }, 1000); 
      
      setTypingTimeout(timeout);
    }
  }, [typingTimeout]);

  useEffect(() => {
    (async () => {
      console.log('Starting location request...');
      let { status } = await Location.requestForegroundPermissionsAsync();
      console.log('Location permission status:', status);
      
      if (status !== 'granted') {
        console.log('Location permission denied');
        setErrorMsg('Permission to access location was denied'); 
        setAddress('Location access denied'); 
        return;
      }

      try {
        console.log('Getting current position...');
        let location = await Location.getCurrentPositionAsync({});
        console.log('Location received:', location);
        setLocation(location); 
        console.log('Getting address...');
        let reverseGeocode = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
        console.log('Reverse geocode result:', reverseGeocode);

        if (reverseGeocode.length > 0) {
          const loc = reverseGeocode[0];
          const addressText = `${loc.city || loc.district || ''}, ${loc.region || ''}`;
          console.log('Setting address:', addressText);
          setAddress(addressText);
        }

        console.log('Fetching air quality...');
        await getAirQuality(location.coords.latitude, location.coords.longitude);
      } catch (error) {
        console.error('Error in location process:', error);
        setErrorMsg('Error getting location');
        setAddress('Location unavailable');
      }
    })();
  }, []);

  return (
    <View style={styles.mainContainer}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <Surface style={styles.header} elevation={4}>
          <Text style={styles.headerTitle}>Vayura</Text>
          <Text style={styles.headerSubtitle}>Breathe Smart. Live Clean.</Text>
        </Surface>
        <ScrollView 
          style={styles.content} 
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.contentContainer}
        >
          <Card style={styles.card}>
            <Card.Title
              title="Current Air Quality"
              left={(props) => <IconButton {...props} icon="air-filter" />}
              titleStyle={styles.cardTitle}
            />
            <Card.Content>
              <View style={styles.aqiContainer}>
                {airQuality ? (
                  <>
                    <Text style={[styles.aqiValue, { color: getAqiColor(airQuality) }]}>
                      {airQuality}
                    </Text>
                    <Text style={styles.aqiLevel}>{aqiLevel}</Text>
                    <Text style={styles.aqiLabel}>European Air Quality Index</Text>
                    {previousAqi !== null && previousAqi !== airQuality && (
                      <Text style={styles.aqiChange}>
                        {airQuality > previousAqi 
                          ? `↑ Increased from ${previousAqi}`
                          : `↓ Decreased from ${previousAqi}`}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.aqiValue}>Loading...</Text>
                )}
              </View>
            </Card.Content>
          </Card>
          <Card style={styles.card}>
            <Card.Title
              title="Health Recommendations"
              left={(props) => <IconButton {...props} icon="heart-pulse" />}
              titleStyle={styles.cardTitle}
            />
            <Card.Content>
              <Text style={styles.recommendationText}>
                {getHealthRecommendation(airQuality) || "Loading recommendations... "}
              </Text>
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Title
              title="Your Location"
              left={(props) => <IconButton {...props} icon="map-marker" />}
              titleStyle={styles.cardTitle}
            />
            <Card.Content>
              <Text style={styles.locationText}>{address}</Text>
              {location && (
                <Text style={styles.coordinatesText}>
                  Lat: {location.coords.latitude.toFixed(4)}, 
                  Long: {location.coords.longitude.toFixed(4)}
                </Text>
              )}
              {errorMsg && (
                <Text style={styles.errorText}>{errorMsg}</Text>
              )}
              <Text style={styles.inputLabel}>Edit your location</Text>
              <PaperTextInput
                style={styles.input}
                value={address}
                onChangeText={handleLocationChange}
                placeholder="Enter location"
                onSubmitEditing={() => updateLocation(address)}
                left={<PaperTextInput.Icon icon="magnify" />}
                mode="outlined"
              />
              {isLoading && (
                <Text style={styles.loadingText}>Updating location...</Text>
              )}
            </Card.Content>
          </Card>
          
          <View style={styles.bottomPadding} />
        </ScrollView>
        
        <SafeAreaView style={styles.safeAreaSettings}>
          <View style={styles.settingsContainer}>
            <Button 
              icon="cog" 
              mode="contained" 
              onPress={() => router.push('/settings')}
              style={styles.settingsButton}
            >
              Settings
            </Button>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
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
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  bottomPadding: {
    height: 20,
  },
  safeAreaSettings: {
    backgroundColor: '#f5f5f5',
  },
  settingsContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  settingsButton: {
    width: '100%',
    backgroundColor: '#2196F3',
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
  aqiContainer: {
    alignItems: 'center',
    padding: 20,
  },
  aqiValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  aqiLabel: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  aqiLevel: {
    fontSize: 20,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  aqiChange: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 12,
  },
  recommendationText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    textAlign: 'center',
    paddingVertical: 8,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ff0000',
    marginTop: 8,
  },
  input: {
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: 'white',
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 0,
    marginTop: 16,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});

