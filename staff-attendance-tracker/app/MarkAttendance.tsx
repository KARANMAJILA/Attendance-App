import * as React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';

// ✅ FIXED: Changed to base URL only
const API_BASE_URL = 'http://192.168.1.4:8000'; // ⚠️ UPDATE THIS TO YOUR ACTUAL BACKEND IP

export default function MarkAttendance() {
  const cameraRef = React.useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = React.useState(false);
  
  const router = useRouter();

  const { lat, lon, battery } = useLocalSearchParams<{
    lat: string;
    lon: string;
    battery: string;
  }>();

  React.useEffect(() => {
    if (!permission) {
      return;
    }

    if (!permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const captureAndSend = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera is not ready yet');
      return;
    }

    try {
      setIsCapturing(true);

      // Get the auth token
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        router.replace('/login');
        return;
      }

      // Capture photo
      const photo = await cameraRef.current.takePictureAsync({ 
        quality: 0.8,
        base64: false,
      });

      // Create FormData with correct field names matching backend
      const formData = new FormData();
      
      // The backend expects 'file' as the field name for the image
      formData.append('file', {
        uri: photo.uri,
        name: 'face_verification.jpg',
        type: 'image/jpeg',
      } as any);

      // Send location and battery as separate fields (matching your backend)
      formData.append('location', `${lat},${lon}`);
      formData.append('battery_level', battery || '0');

      console.log('Sending face verification data:', {
        location: `${lat},${lon}`,
        battery_level: battery,
        hasToken: !!token,
        userId: 'will be extracted from token by backend'
      });

      // ✅ FIXED: Correct endpoint URL construction
      const requestUrl = `${API_BASE_URL}/attendance/mark`;
      console.log('🚀 Sending request to:', requestUrl);
      console.log('📱 Request headers:', { 'Authorization': `Bearer ${token?.substring(0, 20)}...` });
      
      const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type header, let fetch set it automatically for FormData
        },
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response ok:', response.ok);

      const result = await response.json();
      console.log('📦 Backend response:', result);

      if (response.ok) {
        Alert.alert(
          'Success! ✅',
          result.message || 'Attendance marked successfully!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/Dashboard')
            }
          ]
        );
      } else {
        console.error('❌ Backend error details:', {
          status: response.status,
          detail: result.detail,
          fullResponse: result
        });
        
        // More specific error handling
        if (result.detail === 'Face verification failed') {
          Alert.alert(
            '🔍 Face Verification Failed',
            'Your face could not be matched with the registered face in our database.\n\nTips for better recognition:\n• Ensure good lighting\n• Look directly at camera\n• Remove glasses if possible\n• Keep face centered in frame',
            [
              { text: 'Try Again', onPress: captureAndSend },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        } else if (result.detail === 'Attendance already marked today') {
          Alert.alert(
            '✅ Already Marked',
            'You have already marked attendance today!',
            [{ text: 'OK', onPress: () => router.replace('/Dashboard') }]
          );
        } else if (response.status === 401) {
          Alert.alert(
            '🔐 Authentication Error',
            'Your session has expired. Please login again.',
            [{ text: 'Login', onPress: () => router.replace('/login') }]
          );
        } else {
          Alert.alert(
            'Error ❌',
            result.detail || `Server error (${response.status}). Please try again.`,
            [
              { text: 'Retry', onPress: captureAndSend },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      }
    } catch (error: any) {
      console.error('❌ Network/Camera error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      // More specific error handling
      if (error.message.includes('Network request failed')) {
        Alert.alert(
          '🌐 Connection Error',
          `Cannot connect to server at ${API_BASE_URL}\n\nPlease check:\n• Your internet connection\n• Backend server is running\n• Correct IP address in app\n• Phone and server on same network`,
          [
            { text: 'Check Settings', onPress: () => {
              Alert.alert('Current Server', `Trying to connect to:\n${API_BASE_URL}/attendance/mark`);
            }},
            { text: 'Retry', onPress: captureAndSend },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else if (error.message.includes('fetch')) {
        Alert.alert(
          '📡 Request Error',
          'Failed to send data to server. Please try again.',
          [
            { text: 'Retry', onPress: captureAndSend },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert(
          '📷 Camera Error',
          'Failed to capture photo. Please try again.',
          [
            { text: 'Retry', onPress: captureAndSend },
            { text: 'Cancel', style: 'cancel' }
          ]
        );
      }
    } finally {
      setIsCapturing(false);
    }
  };

  const goBack = () => {
    router.back();
  };

  if (!permission) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`mt-4 text-lg text-gray-600`}>Loading camera...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-white px-6`}>
        <Text style={tw`text-xl font-bold text-red-600 mb-4 text-center`}>
          📷 Camera Access Required
        </Text>
        <Text style={tw`text-base text-gray-600 text-center mb-6`}>
          This app needs camera access for facial recognition attendance. Please enable camera permissions in your device settings.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={tw`bg-blue-600 px-8 py-3 rounded-xl mb-4`}
        >
          <Text style={tw`text-white text-lg font-semibold`}>Grant Camera Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goBack}
          style={tw`bg-gray-600 px-8 py-3 rounded-xl`}
        >
          <Text style={tw`text-white text-lg font-semibold`}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={tw`flex-1 bg-black`}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <SafeAreaView>
        <View style={tw`flex-row justify-between items-center px-4 py-3`}>
          <TouchableOpacity
            onPress={goBack}
            style={tw`bg-black bg-opacity-50 rounded-full p-2`}
          >
            <Text style={tw`text-white text-lg`}>←</Text>
          </TouchableOpacity>
          <Text style={tw`text-white text-lg font-semibold`}>Mark Attendance</Text>
          <View style={tw`w-8`} />
        </View>
      </SafeAreaView>

      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={tw`flex-1`}
        facing="front"
      >
        {/* Camera Overlay */}
        <View style={tw`flex-1 justify-center items-center`}>
          {/* Face guide outline */}
          <View style={tw`w-64 h-80 border-2 border-white border-opacity-70 rounded-3xl`}>
            <View style={tw`absolute -top-12 left-0 right-0`}>
              <Text style={tw`text-white text-center text-base font-medium`}>
                🔍 Position your face for verification
              </Text>
              <Text style={tw`text-white text-center text-sm opacity-75 mt-1`}>
                This will be matched with your registered face
              </Text>
            </View>
          </View>
        </View>
      </CameraView>

      {/* Bottom Controls */}
      <SafeAreaView>
        <View style={tw`px-6 py-6`}>
          {/* Location & Battery Info */}
          <View style={tw`mb-4 bg-black bg-opacity-50 rounded-xl p-4`}>
            <Text style={tw`text-white text-sm mb-1`}>
              📍 Location: {lat ? `${parseFloat(lat).toFixed(4)}, ${parseFloat(lon).toFixed(4)}` : 'Loading...'}
            </Text>
            <Text style={tw`text-white text-sm`}>
              🔋 Battery: {battery}%
            </Text>
          </View>

          {/* Capture Button */}
          <TouchableOpacity
            onPress={captureAndSend}
            disabled={isCapturing || !permission.granted}
            style={tw`bg-blue-600 rounded-xl py-4 px-6 ${(isCapturing || !permission.granted) ? 'opacity-50' : ''}`}
          >
            {isCapturing ? (
              <View style={tw`flex-row justify-center items-center`}>
                <ActivityIndicator color="white" />
                <Text style={tw`text-white text-lg font-bold ml-2`}>
                  Marking Attendance...
                </Text>
              </View>
            ) : (
              <Text style={tw`text-white text-center text-lg font-bold`}>
                {permission.granted ? '✅ Mark Attendance' : '📷 Camera Loading...'}
              </Text>
            )}
          </TouchableOpacity>

          {!permission.granted && (
            <Text style={tw`text-white text-center text-xs mt-2 opacity-70`}>
              Please wait for camera to initialize...
            </Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}