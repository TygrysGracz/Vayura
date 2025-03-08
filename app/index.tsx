import React from "react";
import { StatusBar, Text, View, StyleSheet, Dimensions } from "react-native";
import { Button, Card } from "react-native-paper";
import LottieView from "lottie-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

export default function WelcomeScreen() {
  const [isAboutVisible, setIsAboutVisible] = React.useState(false);

  const handleGetStarted = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      router.replace('/home');
    } catch (error) {
      console.error('Error saving first launch state:', error);
    }
  };

  const toggleAboutVisibility = () => {
    setIsAboutVisible(!isAboutVisible);
  };

  return (
    <>
      <StatusBar barStyle="light-content"/>
      <View style={styles.background}>
        <LottieView 
          source={require("../assets/earth.json")}
          autoPlay
          loop
          style={styles.backgroundAnimation}
        />
        <View style={styles.container}>
        </View>
        {isAboutVisible && (
          <Card style={styles.aboutCard}>
            <Card.Content>
              <Text style={{fontWeight: "bold", fontSize: 20, marginBottom: 5}}>About Vayura</Text>
              <Text>Vayura is an air quality tracking app that helps you monitor real-time pollution levels. Stay informed and take action to protect your health!</Text>
              <Button onPress={toggleAboutVisibility} style={styles.closeCardButton}>Close</Button>
            </Card.Content>
          </Card>
        )}
        <View style={styles.textContainer}>
          <Text style={styles.welcomeText}>Welcome to Vayura.</Text>
        </View>
        <View style={styles.aboutVayura}>
          <Button onPress={toggleAboutVisibility} style={styles.aboutButton}>About Vayura</Button>
          <Button onPress={handleGetStarted} style={styles.aboutButton}>Get Started</Button>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundAnimation: {
    width: Dimensions.get("window").width * 4.75,
    height: Dimensions.get("window").height * 4.75,
    position: "absolute",
    bottom: -Dimensions.get("window").height * 1.9,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  menuButton: {
    position: "absolute",
    right: -10,
    top: 10,
  },
  buttonContent: {
    width: 60,
    height: 60,
  },
  buttonLabel: {
    fontSize: 30,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#FFFFFF",
    bottom: -100,
    textShadowColor: "#000000",
    textShadowOffset: {width: 1, height: 1},
    textShadowRadius: 5,
  },
  aboutVayura: {
    fontWeight: "bold",
    color: "#FFFFFF",
    bottom: 10,
    fontSize: 15,    
  },
  aboutButton: {
    backgroundColor: "#FFFFFF",
    width: 325,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    margin: 10,
  },
  aboutCard: {
    position: "absolute",
    width: 325,
    height: 175,
    top: 360,
    backgroundColor: "#FFFFFF",
  },
  closeCardButton: {
    backgroundColor: "#FFFFFF",
    width: 100,
    height: 40,
    top: 10,
    alignSelf: "flex-end",
  }
});
