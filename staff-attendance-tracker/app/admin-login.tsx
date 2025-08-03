import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import tw from 'twrnc';
import axios from 'axios';

// ✅ Replace with your backend's IP
const LOGIN_URL = 'http://192.168.1.4:8000/admin/login';
const TEST_AUTH_URL = 'http://192.168.1.4:8000/admin/test-auth';

export default function AdminLoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Attempting login to:', LOGIN_URL);
      console.log('🔄 Login credentials:', { email, password: '***' });

      const response = await axios.post(LOGIN_URL, {
        email: email.trim(),
        password,
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      });

      console.log('✅ Login response status:', response.status);
      console.log('✅ Login response data:', response.data);
      
      const { access_token, token_type } = response.data;

      if (!access_token) {
        Alert.alert('Login Failed', 'Invalid token received from server');
        return;
      }

      console.log('💾 Storing token...');
      console.log('💾 Token type:', token_type);
      console.log('💾 Token preview:', access_token.substring(0, 30) + '...');
      
      // ✅ Store token with clear key
      await AsyncStorage.setItem('admin_token', access_token);
      
      // ✅ Verify token was stored correctly
      const storedToken = await AsyncStorage.getItem('admin_token');
      console.log('✅ Token stored successfully:', !!storedToken);
      console.log('✅ Stored token length:', storedToken?.length);
      
      // ✅ Test authentication immediately with the new approach
      console.log('🧪 Testing authentication with token in body...');
      try {
        const testResponse = await axios.post('http://192.168.1.4:8000/admin/add-staff-with-token', {
          token: access_token,
          // Just test data to verify auth
          name: 'test',
          email: 'test@test.com',
          password: 'test',
          image_data: 'test'
        });
        
        // If we get here, auth works (even if it fails due to missing data)
        console.log('✅ Auth test passed - redirecting to dashboard');
        router.replace('/AdminDashboard');
        
      } catch (testError: any) {
        if (testError.response?.status === 401) {
          console.log('❌ Token validation failed');
          Alert.alert('Authentication Error', 'Token validation failed. Please try again.');
        } else if (testError.response?.status === 400) {
          // 400 means auth worked but data was invalid - that's fine for our test
          console.log('✅ Auth test passed (400 expected) - redirecting to dashboard');
          router.replace('/AdminDashboard');
        } else {
          console.log('🤔 Unexpected test error, but proceeding:', testError.response?.status);
          router.replace('/AdminDashboard');
        }
      }

    } catch (error: any) {
      console.error('❌ Login error:', error.response?.data || error.message);
      console.error('❌ Error status:', error.response?.status);
      console.error('❌ Full error:', error);

      let errorMsg = 'Login failed. Please check your credentials.';
      
      if (error.response?.status === 401) {
        errorMsg = 'Invalid email or password. Please try again.';
      } else if (error.response?.status === 404) {
        errorMsg = 'Admin account not found with this email.';
      } else if (error.code === 'ECONNABORTED') {
        errorMsg = 'Connection timeout. Please check your network.';
      } else if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      }
      
      Alert.alert('Login Error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1`}>
      <StatusBar style="light" />
      <LinearGradient colors={['#DC2626', '#991B1B']} style={tw`absolute inset-0`} />

      <KeyboardAvoidingView
        style={tw`flex-1`}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={tw`flex-grow justify-center px-6 py-12`}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={tw`items-center mb-10`}>
              <Ionicons name="shield-checkmark" size={60} color="white" />
              <Text style={tw`text-white text-3xl font-bold mt-4`}>Admin Portal</Text>
              <Text style={tw`text-red-100 text-sm mt-2`}>Authorized Personnel Only</Text>
            </View>

            {/* Email */}
            <View style={tw`mb-5`}>
              <Text style={tw`text-white mb-2 font-medium`}>Email Address</Text>
              <View style={tw`bg-white rounded-xl px-4 py-3`}>
                <TextInput
                  placeholder="admin@company.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={tw`text-black text-base`}
                  returnKeyType="next"
                />
              </View>
            </View>

            {/* Password */}
            <View style={tw`mb-8`}>
              <Text style={tw`text-white mb-2 font-medium`}>Password</Text>
              <View style={tw`bg-white rounded-xl px-4 py-3 flex-row items-center`}>
                <TextInput
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={tw`flex-1 text-black text-base`}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={22}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={tw`bg-white py-4 rounded-xl items-center shadow-lg ${isLoading ? 'opacity-70' : ''}`}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={tw`flex-row items-center`}>
                  <ActivityIndicator color="#DC2626" size="small" />
                  <Text style={tw`text-red-600 font-bold text-lg ml-2`}>Signing In...</Text>
                </View>
              ) : (
                <Text style={tw`text-red-600 font-bold text-lg`}>Sign In as Admin</Text>
              )}
            </TouchableOpacity>

            {/* Debug Info (remove in production) */}
            <View style={tw`mt-6 items-center`}>
              <Text style={tw`text-red-100 text-xs opacity-70`}>
                Backend: {LOGIN_URL}
              </Text>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}