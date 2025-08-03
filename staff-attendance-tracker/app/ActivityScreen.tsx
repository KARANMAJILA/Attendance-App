import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import tw from 'twrnc';
import { getToken } from '../utils/getToken';

type Activity = {
  id: number;
  user_id: number;
  username: string;
  email: string;
  latitude: number;
  longitude: number;
  battery_level: number;
  timestamp: string;
  last_login: string | null;
};

const ActivityScreen = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<'recent' | 'login'>('recent');

  const fetchActivities = async () => {
    try {
      // Try multiple ways to get the token
      let token = await getToken();
      
      // If getToken doesn't work, try direct AsyncStorage access
      if (!token) {
        console.log('getToken() returned null, trying AsyncStorage directly...');
        token = await AsyncStorage.getItem('authToken');
      }
      
      // Try other common token key names
      if (!token) {
        const commonKeys = ['token', 'accessToken', 'userToken', 'admin_token'];
        for (const key of commonKeys) {
          token = await AsyncStorage.getItem(key);
          if (token) {
            console.log(`Found token with key: ${key}`);
            break;
          }
        }
      }
      
      if (!token) {
        console.error('No token found in storage');
        Alert.alert(
          'Authentication Required', 
          'Please login first to access admin features.',
          [{ text: 'OK' }]
        );
        return;
      }

      console.log('Using token:', token.substring(0, 20) + '...');
      
      const response = await axios.get('http://192.168.1.4:8000/admin/activities', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Activities fetched successfully:', response.data.length);
      setActivities(response.data);
      
    } catch (err: any) {
      console.error('Error fetching activities:', err);
      
      if (err.response?.status === 401) {
        Alert.alert(
          'Authentication Error',
          'Your session has expired. Please login again.',
          [{ text: 'OK' }]
        );
      } else if (err.response?.status === 403) {
        Alert.alert(
          'Access Denied',
          'You do not have admin privileges to view this data.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', 'Failed to fetch activities. Please try again.');
      }
      
      if (err.response?.data) {
        console.error('Error details:', err.response.data);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeSince = (dateString: string | null) => {
    if (!dateString) return 'Never logged in';
    
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    return `${diffInWeeks}w ago`;
  };

  const sortedActivities = [...activities].sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      // Sort by last login
      if (!a.last_login && !b.last_login) return 0;
      if (!a.last_login) return 1;
      if (!b.last_login) return -1;
      return new Date(b.last_login).getTime() - new Date(a.last_login).getTime();
    }
  });

  const renderItem = ({ item }: { item: Activity }) => (
    <View style={tw`bg-white p-4 rounded-xl shadow-sm mb-3 mx-3`}>
      {/* User Header */}
      <View style={tw`flex-row justify-between items-start mb-3`}>
        <View style={tw`flex-1`}>
          <Text style={tw`text-lg font-bold text-gray-800`}>{item.username}</Text>
          <Text style={tw`text-sm text-gray-500`}>{item.email}</Text>
        </View>
        <View style={tw`items-end`}>
          <Text style={tw`text-xs font-medium text-blue-600`}>ID: {item.user_id}</Text>
        </View>
      </View>

      {/* Login Status */}
      <View style={tw`bg-gray-50 p-3 rounded-lg mb-3`}>
        <Text style={tw`text-sm font-medium text-gray-700 mb-1`}>Last Login</Text>
        <Text style={tw`text-sm ${item.last_login ? 'text-green-600' : 'text-red-500'}`}>
          {getTimeSince(item.last_login)}
        </Text>
        {item.last_login && (
          <Text style={tw`text-xs text-gray-400`}>
            {formatDate(item.last_login)}
          </Text>
        )}
      </View>

      {/* Activity Details */}
      <View style={tw`border-t border-gray-100 pt-3`}>
        <View style={tw`flex-row justify-between mb-2`}>
          <Text style={tw`text-sm font-medium text-gray-700`}>Battery Level</Text>
          <View style={tw`flex-row items-center`}>
            <View 
              style={tw`w-12 h-2 bg-gray-200 rounded-full mr-2`}
            >
              <View 
                style={[
                  tw`h-full rounded-full`,
                  { 
                    width: `${item.battery_level}%`,
                    backgroundColor: item.battery_level > 50 ? '#10B981' : item.battery_level > 20 ? '#F59E0B' : '#EF4444'
                  }
                ]}
              />
            </View>
            <Text style={tw`text-sm font-medium`}>{item.battery_level}%</Text>
          </View>
        </View>

        <View style={tw`flex-row justify-between mb-2`}>
          <Text style={tw`text-sm font-medium text-gray-700`}>Location</Text>
          <Text style={tw`text-sm text-gray-600`}>
            {item.latitude.toFixed(3)}, {item.longitude.toFixed(3)}
          </Text>
        </View>

        <View style={tw`flex-row justify-between`}>
          <Text style={tw`text-sm font-medium text-gray-700`}>Activity Time</Text>
          <Text style={tw`text-sm text-gray-600`}>
            {formatDate(item.timestamp)}
          </Text>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-gray-50`}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={tw`mt-2 text-gray-500`}>Loading user activities...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white shadow-sm px-4 py-3`}>
        <Text style={tw`text-xl font-bold text-center text-gray-800 mb-3`}>
          User Activities
        </Text>
        
        {/* Sort Options */}
        <View style={tw`flex-row justify-center`}>
          <TouchableOpacity
            style={tw`px-4 py-2 rounded-l-lg ${sortBy === 'recent' ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setSortBy('recent')}
          >
            <Text style={tw`text-sm font-medium ${sortBy === 'recent' ? 'text-white' : 'text-gray-700'}`}>
              Recent Activity
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={tw`px-4 py-2 rounded-r-lg ${sortBy === 'login' ? 'bg-blue-500' : 'bg-gray-200'}`}
            onPress={() => setSortBy('login')}
          >
            <Text style={tw`text-sm font-medium ${sortBy === 'login' ? 'text-white' : 'text-gray-700'}`}>
              Last Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activities List */}
      <FlatList
        data={sortedActivities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={tw`pb-6 pt-4`}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

export default ActivityScreen;