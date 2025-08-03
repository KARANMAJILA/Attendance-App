
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import {router} from 'expo-router';

const API_BASE_URL = 'http://192.168.1.4:8000/login'; // ✅ Your FastAPI login route

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Login failed');
      }

      // ✅ Save token only (no `user` in response)
      await AsyncStorage.setItem('access_token', data.access_token);

      // ✅ Navigate to tabs/home page
      router.replace('/Dashboard');
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={tw`flex-1`}>
        <StatusBar style="light" />
        <LinearGradient
          colors={['#3B82F6', '#1E40AF', '#1E3A8A']}
          style={tw`absolute inset-0`}
        />

        <View style={tw`absolute top-12 right-5 z-50`}>
          <TouchableOpacity
            onPress={() => router.push('/admin-login')}
            style={tw`bg-white bg-opacity-20 px-4 py-2 rounded-full border border-white border-opacity-30`}
          >
            <Text style={tw`text-white text-sm font-semibold`}>Admin Login</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'android' ? 'height' : 'padding'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 40 : 0}
          style={tw`flex-1`}
        >
          <ScrollView
            contentContainerStyle={tw`flex-grow justify-center px-8 py-12`}
            keyboardShouldPersistTaps="handled"
          >
            <View style={tw`items-center mb-8`}>
              <View style={tw`bg-white bg-opacity-20 rounded-full p-6`}>
                <Ionicons name="finger-print" size={60} color="white" />
              </View>
              <Text style={tw`text-white text-3xl font-bold mt-4`}>
                Face Recognition
              </Text>
              <Text style={tw`text-white text-lg`}>Attendance System</Text>
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-white mb-2`}>Email</Text>
              <TextInput
                ref={emailRef}
                placeholder="Enter your email"
                style={tw`bg-white rounded-xl px-4 py-3 text-base`}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            <View style={tw`mb-6`}>
              <Text style={tw`text-white mb-2`}>Password</Text>
              <View style={tw`flex-row items-center bg-white rounded-xl px-4`}>
                <TextInput
                  ref={passwordRef}
                  placeholder="Enter your password"
                  style={tw`flex-1 py-3`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={tw`ml-2`}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="gray"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              style={tw`bg-white py-4 rounded-xl`}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={tw`flex-row justify-center items-center`}>
                  <ActivityIndicator color="#3B82F6" />
                  <Text style={tw`ml-2 text-blue-600 font-semibold`}>Signing In...</Text>
                </View>
              ) : (
                <Text style={tw`text-blue-600 text-center text-lg font-semibold`}>
                  Login as User
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
