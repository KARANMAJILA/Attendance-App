import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://192.168.1.4:8000/admin/add-staff-with-token'; // Use the token-in-body endpoint

const AddStaffScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.8, // Reduce quality to avoid large files
      base64: true, // Get base64 data directly
    });

    if (!result.cancelled && result.assets && result.assets[0]) {
      setPhoto(result.assets[0]);
    }
  };

  const handleAddStaff = async () => {
    if (!name || !email || !password || !photo) {
      Alert.alert('Validation Error', 'All fields including photo are required');
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem('admin_token');
      console.log('🔍 Retrieved token exists:', !!token);
      console.log('🔍 Token length:', token ? token.length : 0);
      
      if (!token) {
        Alert.alert('Authentication Error', 'No admin token found. Please login again.');
        return;
      }

      // Prepare request data with token in body
      const requestData = {
        token: token,
        name: name,
        email: email,
        password: password,
        role: 'user',
        image_data: photo.base64, // Use base64 data
      };

      console.log('📤 Sending request with token in body...');
      console.log('📤 Request data keys:', Object.keys(requestData));
      console.log('📤 Token preview:', token.substring(0, 20) + '...');

      const response = await axios.post(API_URL, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      console.log('✅ Staff added successfully:', response.data);
      Alert.alert('Success', 'Staff member added successfully!');
      
      // Clear form after successful submission
      setName('');
      setEmail('');
      setPassword('');
      setPhoto(null);
      
    } catch (error: any) {
      console.error('❌ Add Staff Error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', `Auth failed: ${error.response?.data?.detail || 'Unauthorized'}`);
      } else if (error.response?.status === 403) {
        Alert.alert('Permission Error', 'Admin access required.');
      } else if (error.response?.status === 400) {
        Alert.alert('Validation Error', error.response?.data?.detail || 'Invalid data provided');
      } else {
        Alert.alert('Error', error.response?.data?.detail || error.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={tw`flex-1 bg-white p-6`}>
      <Text style={tw`text-2xl font-bold mb-4 text-center`}>Add New Staff</Text>

      <TextInput
        placeholder="Full Name"
        value={name}
        onChangeText={setName}
        style={tw`border border-gray-300 rounded-xl px-4 py-3 mb-4`}
      />

      <TextInput
        placeholder="Email Address"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={tw`border border-gray-300 rounded-xl px-4 py-3 mb-4`}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={tw`border border-gray-300 rounded-xl px-4 py-3 mb-4`}
      />

      <TouchableOpacity onPress={pickImage} style={tw`bg-blue-100 p-3 rounded-xl mb-4`}>
        <Text style={tw`text-blue-600 text-center font-medium`}>
          {photo ? 'Change Photo' : 'Select Photo'}
        </Text>
      </TouchableOpacity>

      {photo && (
        <View style={tw`items-center mb-4`}>
          <Image
            source={{ uri: photo.uri }}
            style={tw`w-32 h-32 rounded-full border-2 border-gray-300`}
          />
          <Text style={tw`text-gray-500 text-sm mt-2`}>Photo selected ✓</Text>
        </View>
      )}

      <TouchableOpacity
        onPress={handleAddStaff}
        disabled={loading}
        style={tw`bg-green-600 py-4 rounded-xl ${loading ? 'opacity-50' : ''}`}>
        {loading ? (
          <View style={tw`flex-row items-center justify-center`}>
            <ActivityIndicator color="white" size="small" />
            <Text style={tw`text-white ml-2 font-semibold`}>Adding Staff...</Text>
          </View>
        ) : (
          <Text style={tw`text-white text-center font-semibold text-lg`}>Add Staff Member</Text>
        )}
      </TouchableOpacity>

      {/* Debug info (remove in production) */}
      <View style={tw`mt-4 p-3 bg-gray-100 rounded`}>
        <Text style={tw`text-xs text-gray-600`}>
          Debug: Using endpoint with token in request body
        </Text>
      </View>
    </ScrollView>
  );
};

export default AddStaffScreen;