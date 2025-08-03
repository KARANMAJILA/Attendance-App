
import AsyncStorage from '@react-native-async-storage/async-storage';


export const getToken = async (): Promise<string | null> => {
  try {
    // If using AsyncStorage
    const token = await AsyncStorage.getItem('authToken');
    
   
    
    return token;
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

export const setToken = async (token: string): Promise<void> => {
  try {
    // If using AsyncStorage
    await AsyncStorage.setItem('authToken', token);
    
    // If using Expo SecureStore
    // await SecureStore.setItemAsync('authToken', token);
  } catch (error) {
    console.error('Error setting token:', error);
  }
};

export const removeToken = async (): Promise<void> => {
  try {
    // If using AsyncStorage
    await AsyncStorage.removeItem('authToken');
    
    // If using Expo SecureStore
    // await SecureStore.deleteItemAsync('authToken');
  } catch (error) {
    console.error('Error removing token:', error);
  }
};