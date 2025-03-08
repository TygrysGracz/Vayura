import React, { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../../app/index'; 
import HomeScreen from '../../app/home';

const Stack = createNativeStackNavigator();

export default function AppInitializer() {
  const [isFirstLaunch, setIsFirstLaunch] = React.useState<boolean | null>(null);

  useEffect(() => {
    checkIfFirstLaunch();
    console.log(isFirstLaunch);
  }, []);

  const checkIfFirstLaunch = async () => {
    try {
      const hasLaunched = await AsyncStorage.getItem('hasLaunched');
      setIsFirstLaunch(hasLaunched === null);
    } catch (error) {
      setIsFirstLaunch(true);
      console.error('Error checking first launch:', error);
    }
  };

  if (isFirstLaunch === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isFirstLaunch ? (
          <Stack.Screen name="Welcome" component={WelcomeScreen}/>
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
} 