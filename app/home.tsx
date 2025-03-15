import { View, Text, ScrollView, StyleSheet, Dimensions, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Button, Card, IconButton, Surface } from 'react-native-paper';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState, useCallback } from 'react';
import * as Location from 'expo-location';

export default function Home() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [address, setAddress] = useState('Detecting location...');
  const [airQuality, setAirQuality] = useState<number | null>(null);
  const [aqiLevel, setAqiLevel] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

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
        
        setAirQuality(currentAQI);
        
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

  const getHealthRecommendation = (aqi: number) => {
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
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <StatusBar style="light" />
      <Surface style={styles.header} elevation={4}>
        <Text style={styles.headerTitle}>Vayura</Text>
        <Text style={styles.headerSubtitle}>Breathe Smart. Live Clean.</Text>
      </Surface>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <Card.Title style={styles.cardTitle}
            title="Current Air Quality"
            left={(props) => <IconButton {...props} icon="air-filter" />}
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
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={handleLocationChange}
              placeholder="Enter location"
              onSubmitEditing={() => updateLocation(address)}
            />
            {isLoading && (
              <Text style={styles.loadingText}>Updating location...</Text>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
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
    </KeyboardAvoidingView>
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
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
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
  settingsContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#f5f5f5',
  },
  settingsButton: {
    width: '100%',
    backgroundColor: '#2196F3',
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
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 8,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 0,
    marginTop: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});
