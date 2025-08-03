import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert, 
  ScrollView,
  SafeAreaView 
} from 'react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import tw from 'twrnc';

const Dashboard = () => {
  const [location, setLocation] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState({
    location: false,
    camera: false,
    battery: false
  });
  const router = useRouter();

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(loc.coords);
        return true;
      } else {
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to mark your attendance accurately.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Location permission error:', error);
      Alert.alert('Error', 'Failed to get location permission');
      return false;
    }
  };

  const requestCameraPermission = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      if (status === 'granted') {
        return true;
      } else {
        Alert.alert(
          'Camera Permission Required',
          'This app needs camera access for facial recognition attendance.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Camera.requestCameraPermissionsAsync() }
          ]
        );
        return false;
      }
    } catch (error) {
      console.error('Camera permission error:', error);
      Alert.alert('Error', 'Failed to get camera permission');
      return false;
    }
  };

  const getBatteryLevel = async () => {
    try {
      const battery = await Battery.getBatteryLevelAsync();
      setBatteryLevel(Math.round(battery * 100));
      return true;
    } catch (error) {
      console.error('Battery level error:', error);
      Alert.alert('Warning', 'Could not get battery level');
      return false;
    }
  };

  const requestAllPermissions = async () => {
    setLoading(true);
    
    try {
      // Request all permissions
      const locationGranted = await requestLocationPermission();
      const cameraGranted = await requestCameraPermission();
      const batteryGranted = await getBatteryLevel();

      setPermissions({
        location: locationGranted,
        camera: cameraGranted,
        battery: batteryGranted
      });

      // Check if all critical permissions are granted
      if (!locationGranted || !cameraGranted) {
        Alert.alert(
          'Permissions Required',
          'Location and Camera permissions are required for attendance marking. Please grant all permissions.',
          [
            { text: 'Retry', onPress: requestAllPermissions },
            { text: 'Continue Anyway', style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Permission request error:', error);
      Alert.alert('Error', 'Failed to request permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    requestAllPermissions();
  }, []);

  const handleMarkAttendance = () => {
    if (!permissions.location) {
      Alert.alert(
        'Location Permission Required',
        'Location access is required to verify your attendance location.',
        [
          { text: 'Grant Permission', onPress: requestAllPermissions },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (!permissions.camera) {
      Alert.alert(
        'Camera Permission Required',
        'Camera access is required for facial recognition attendance.',
        [
          { text: 'Grant Permission', onPress: requestAllPermissions },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
      return;
    }

    if (!location || batteryLevel === null) {
      Alert.alert('Missing Info', 'Ensure location and battery info are available.');
      return;
    }

    router.push({
      pathname: '/MarkAttendance',
      params: {
        lat: location.latitude.toString(),
        lon: location.longitude.toString(),
        battery: batteryLevel.toString(),
      },
    });
  };

  const handleViewHistory = () => {
    router.push('/AttendanceHistory');
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('access_token');
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 text-lg text-gray-600`}>Setting up permissions...</Text>
        <Text style={tw`mt-2 text-sm text-gray-500 text-center px-6`}>
          We need location and camera access for attendance marking
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <ScrollView style={tw`flex-1 p-6`}>
        <Text style={tw`text-3xl font-bold mb-6 text-center text-gray-800`}>
          👤 User Dashboard
        </Text>

        {/* Permission Status Card */}
        <View style={tw`mb-6 p-4 rounded-xl bg-gray-50 border border-gray-200`}>
          <Text style={tw`text-lg font-semibold mb-3 text-gray-800`}>📋 Permission Status</Text>
          
          <View style={tw`flex-row justify-between items-center mb-2`}>
            <Text style={tw`text-base text-gray-700`}>📍 Location Access</Text>
            <Text style={tw`text-sm font-medium ${permissions.location ? 'text-green-600' : 'text-red-500'}`}>
              {permissions.location ? '✅ Granted' : '❌ Denied'}
            </Text>
          </View>
          
          <View style={tw`flex-row justify-between items-center mb-2`}>
            <Text style={tw`text-base text-gray-700`}>📷 Camera Access</Text>
            <Text style={tw`text-sm font-medium ${permissions.camera ? 'text-green-600' : 'text-red-500'}`}>
              {permissions.camera ? '✅ Granted' : '❌ Denied'}
            </Text>
          </View>
          
          <View style={tw`flex-row justify-between items-center`}>
            <Text style={tw`text-base text-gray-700`}>🔋 Battery Info</Text>
            <Text style={tw`text-sm font-medium ${permissions.battery ? 'text-green-600' : 'text-orange-500'}`}>
              {permissions.battery ? '✅ Available' : '⚠️ Unavailable'}
            </Text>
          </View>
        </View>

        {/* Location Info */}
        {location && (
          <View style={tw`mb-4 p-4 rounded-xl bg-blue-50 border border-blue-200`}>
            <Text style={tw`text-base font-medium text-blue-800 mb-1`}>📍 Current Location:</Text>
            <Text style={tw`text-sm text-blue-700`}>
              Lat: {location.latitude.toFixed(6)}
            </Text>
            <Text style={tw`text-sm text-blue-700`}>
              Lon: {location.longitude.toFixed(6)}
            </Text>
          </View>
        )}

        {/* Battery Info */}
        {batteryLevel !== null && (
          <View style={tw`mb-6 p-4 rounded-xl bg-green-50 border border-green-200`}>
            <Text style={tw`text-base font-medium text-green-800 mb-1`}>🔋 Battery Level:</Text>
            <Text style={tw`text-lg font-bold text-green-700`}>{batteryLevel}%</Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity 
          style={tw`bg-blue-600 rounded-xl py-4 px-6 mb-4 ${(!permissions.location || !permissions.camera) ? 'opacity-50' : ''}`} 
          onPress={handleMarkAttendance}
        >
          <Text style={tw`text-white text-center text-lg font-semibold`}>
            ✅ Mark Your Attendance
          </Text>
          {(!permissions.location || !permissions.camera) && (
            <Text style={tw`text-blue-200 text-center text-xs mt-1`}>
              Permissions required
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={tw`bg-green-600 rounded-xl py-4 px-6 mb-4`} 
          onPress={handleViewHistory}
        >
          <Text style={tw`text-white text-center text-lg font-semibold`}>
            📜 View Attendance History
          </Text>
        </TouchableOpacity>

        {/* Retry Permissions Button */}
        {(!permissions.location || !permissions.camera) && (
          <TouchableOpacity 
            style={tw`bg-orange-500 rounded-xl py-3 px-6 mb-4`} 
            onPress={requestAllPermissions}
          >
            <Text style={tw`text-white text-center text-base font-medium`}>
              🔄 Retry Permissions
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={tw`bg-red-500 rounded-xl py-4 px-6 mb-6`} 
          onPress={handleLogout}
        >
          <Text style={tw`text-white text-center text-lg font-semibold`}>
            🚪 Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Dashboard;