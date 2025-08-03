import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator } from 'react-native';
import tw from 'twrnc';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (token) {
        // User is logged in, redirect to main app
        router.replace('/(tabs)');
      } else {
        // User is not logged in, redirect to login
        router.replace('/login');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Default to login screen on error
      router.replace('/login');
    }
  };

  return (
    <View style={tw`flex-1 justify-center items-center bg-blue-500`}>
      <ActivityIndicator size="large" color="white" />
    </View>
  );
}