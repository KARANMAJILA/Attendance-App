import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.4:8000';
const LIST_STAFF_URL = `${API_BASE_URL}/admin/list-staff`;

interface Staff {
  id: number;
  name: string;
  email: string;
  role: string;
  photo_path?: string;
  created_at?: string;
}

const ViewStaffScreen = () => {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());

  // Filter staff based on search query
  const filteredStaff = staffList.filter(
    staff =>
      staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fetchStaffList = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('admin_token');
      
      if (!token) {
        Alert.alert('Authentication Error', 'Please login again');
        return;
      }

      console.log('📋 Fetching staff list...');
      
      const response = await axios.get(LIST_STAFF_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ Staff list fetched:', response.data.length, 'members');
      setStaffList(response.data);
      
    } catch (error: any) {
      console.error('❌ Error fetching staff:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Session expired. Please login again.');
      } else {
        Alert.alert('Error', 'Failed to load staff list. Please try again.');
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setImageErrors(new Set()); // Reset image errors on refresh
    fetchStaffList(false);
  };

  const getPhotoUrl = (photoPath?: string) => {
    if (!photoPath) return null;
    
    console.log('🔍 Original photo path:', photoPath);
    
    // Handle full URLs
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      console.log('✅ Using full URL:', photoPath);
      return photoPath;
    }
    
    // Convert backslashes to forward slashes for Windows paths
    let normalizedPath = photoPath.replace(/\\/g, '/');
    console.log('🔧 Normalized path:', normalizedPath);
    
    // Extract just the filename from any path format
    let filename = normalizedPath;
    
    // Remove leading slash if present
    if (filename.startsWith('/')) {
      filename = filename.substring(1);
    }
    
    // Extract filename from various path formats
    if (filename.includes('/')) {
      // Split by '/' and get the last part (the actual filename)
      const parts = filename.split('/');
      filename = parts[parts.length - 1];
      console.log('🔧 Extracted filename from path:', filename);
    }
    
    // Build the final URL
    const finalUrl = `${API_BASE_URL}/uploads/staff_photos/${filename}`;
    console.log('🌐 Final URL:', finalUrl);
    
    return finalUrl;
  };

  const handleImageError = (staffId: number) => {
    console.log('❌ Image load error for staff ID:', staffId);
    setImageErrors(prev => new Set([...prev, staffId]));
  };

  const renderStaffItem = ({ item }: { item: Staff }) => {
    const photoUrl = getPhotoUrl(item.photo_path);
    const hasImageError = imageErrors.has(item.id);
    
    return (
      <View style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100`}>
        <View style={tw`flex-row items-center`}>
          {/* Profile Photo */}
          <View style={tw`mr-4`}>
            {photoUrl && !hasImageError ? (
              <Image
                source={{ 
                  uri: photoUrl,
                  cache: 'reload' // Force reload to avoid caching issues
                }}
                style={tw`w-16 h-16 rounded-full border-2 border-gray-200`}
                onError={() => handleImageError(item.id)}
                onLoadStart={() => console.log('🔄 Loading image for:', item.name)}
                onLoad={() => console.log('✅ Image loaded for:', item.name)}
              />
            ) : (
              <View style={tw`w-16 h-16 rounded-full bg-gray-300 items-center justify-center border-2 border-gray-200`}>
                <Ionicons name="person" size={30} color="#6B7280" />
              </View>
            )}
          </View>

          {/* Staff Info */}
          <View style={tw`flex-1`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-1`}>{item.name}</Text>
            <Text style={tw`text-gray-600 mb-1`}>{item.email}</Text>
            <View style={tw`flex-row items-center`}>
              <View style={tw`bg-blue-100 px-2 py-1 rounded-full`}>
                <Text style={tw`text-blue-600 text-xs font-medium capitalize`}>
                  {item.role}
                </Text>
              </View>
            </View>
            {item.created_at && (
              <Text style={tw`text-gray-400 text-xs mt-1`}>
                Added: {new Date(item.created_at).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Info Icon (replacing delete button) */}
          <View style={tw`ml-2`}>
            <TouchableOpacity
              onPress={() => Alert.alert(
                'Staff Details', 
                `Name: ${item.name}\nEmail: ${item.email}\nRole: ${item.role.charAt(0).toUpperCase() + item.role.slice(1)}`
              )}
              style={tw`bg-blue-100 p-2 rounded-full`}
            >
              <Ionicons name="information-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        </View>
        

      </View>
    );
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`text-gray-600 mt-4`}>Loading staff list...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white px-6 py-4 border-b border-gray-200`}>
        <Text style={tw`text-2xl font-bold text-gray-800 mb-4`}>Staff Members</Text>
        
        {/* Search Bar */}
        <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-4 py-3`}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={tw`flex-1 ml-3 text-gray-800`}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6B7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Staff Count */}
      <View style={tw`px-6 py-3`}>
        <Text style={tw`text-gray-600`}>
          {filteredStaff.length} staff member{filteredStaff.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Staff List */}
      {filteredStaff.length > 0 ? (
        <FlatList
          data={filteredStaff}
          renderItem={renderStaffItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={tw`px-6 pb-6`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Ionicons name="people-outline" size={64} color="#D1D5DB" />
          <Text style={tw`text-gray-500 text-lg mt-4 text-center`}>
            {searchQuery ? 'No staff found matching your search' : 'No staff members found'}
          </Text>
          <Text style={tw`text-gray-400 text-center mt-2`}>
            {searchQuery ? 'Try a different search term' : 'Add some staff members to get started'}
          </Text>
        </View>
      )}
    </View>
  );
};

export default ViewStaffScreen;