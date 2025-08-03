import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.4:8000';
const ATTENDANCE_URL = `${API_BASE_URL}/attendance/all`;

interface Attendance {
  id: number;
  user_id: number;
  user_name?: string; // Make optional since it might not come from API
  user_email?: string; // Make optional since it might not come from API
  timestamp: string;
  action: 'check_in' | 'check_out';
  location?: string;
  notes?: string;
}

const ViewAttendanceScreen = () => {
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all'>('all'); // Remove check_in/check_out options
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Filter attendance based on search query and date only
  const filteredAttendance = attendanceList.filter(attendance => {
    // Safe search matching with null/undefined checks
    const userName = attendance.user_name || `User ${attendance.user_id}`;
    const userEmail = attendance.user_email || '';
    const searchLower = searchQuery.toLowerCase();
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchLower) ||
      userEmail.toLowerCase().includes(searchLower) ||
      attendance.user_id.toString().includes(searchLower);
    
    const matchesDate = !selectedDate || 
      new Date(attendance.timestamp).toDateString() === new Date(selectedDate).toDateString();
    
    return matchesSearch && matchesDate;
  });

  const fetchAttendance = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('admin_token');
      
      if (!token) {
        Alert.alert('Authentication Error', 'Please login again');
        return;
      }

      console.log('📋 Fetching attendance records...');
      
      const response = await axios.get(ATTENDANCE_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });

      console.log('✅ Attendance records fetched:', response.data.length, 'records');
      setAttendanceList(response.data);
      
    } catch (error: any) {
      console.error('❌ Error fetching attendance:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        Alert.alert('Authentication Error', 'Session expired. Please login again.');
      } else if (error.response?.status === 403) {
        Alert.alert('Access Denied', 'Admin access required.');
      } else {
        Alert.alert('Error', 'Failed to load attendance records. Please try again.');
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAttendance(false);
  };

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true
      })
    };
  };

  const getActionColor = (action?: string) => {
    if (!action) return 'text-gray-600 bg-gray-100';
    return action === 'check_in' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100';
  };

  const getActionIcon = (action?: string) => {
    if (!action) return 'help-outline';
    return action === 'check_in' ? 'enter-outline' : 'exit-outline';
  };

  const clearFilters = () => {
    setSelectedDate('');
    setFilterModalVisible(false);
  };

  const renderAttendanceItem = ({ item }: { item: Attendance }) => {
    const { date, time } = formatDateTime(item.timestamp);
    
    return (
      <View style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100`}>
        <View style={tw`flex-row items-start justify-between`}>
          {/* User Info */}
          <View style={tw`flex-1 mr-3`}>
            <Text style={tw`text-lg font-bold text-gray-800 mb-1`}>
              {item.user_name || `User ${item.user_id}`}
            </Text>
            {item.user_email ? (
              <Text style={tw`text-gray-600 text-sm mb-1`}>{item.user_email}</Text>
            ) : (
              <Text style={tw`text-gray-500 text-sm mb-1`}>User ID: {item.user_id}</Text>
            )}
            
            {/* Date and Time */}
            <View style={tw`flex-row items-center mb-2`}>
              <Ionicons name="calendar-outline" size={14} color="#6B7280" />
              <Text style={tw`text-gray-500 text-sm ml-1 mr-3`}>{date}</Text>
              <Ionicons name="time-outline" size={14} color="#6B7280" />
              <Text style={tw`text-gray-500 text-sm ml-1`}>{time}</Text>
            </View>

            {/* Location and Notes */}
            {item.location && (
              <View style={tw`flex-row items-center mb-1`}>
                <Ionicons name="location-outline" size={14} color="#6B7280" />
                <Text style={tw`text-gray-500 text-sm ml-1`}>{item.location}</Text>
              </View>
            )}
            
            {item.notes && (
              <View style={tw`flex-row items-start mt-1`}>
                <Ionicons name="document-text-outline" size={14} color="#6B7280" style={tw`mt-0.5`} />
                <Text style={tw`text-gray-500 text-sm ml-1 flex-1`}>{item.notes}</Text>
              </View>
            )}
          </View>

          {/* Action Badge */}
          <View style={tw`items-center`}>
            <View style={tw`${getActionColor(item.action)} px-3 py-2 rounded-full flex-row items-center`}>
              <Ionicons 
                name={getActionIcon(item.action)} 
                size={16} 
                color={item.action === 'check_in' ? '#16A34A' : item.action === 'check_out' ? '#DC2626' : '#6B7280'} 
              />
              <Text style={tw`${item.action === 'check_in' ? 'text-green-600' : item.action === 'check_out' ? 'text-red-600' : 'text-gray-600'} text-xs font-medium ml-1 capitalize`}>
                {item.action && (
  <Text style={tw`${item.action === 'check_in' ? 'text-green-600' : 'text-red-600'} text-xs font-medium ml-1 capitalize`}>
    {item.action.replace('_', ' ')}
  </Text>
)}

              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderFilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={filterModalVisible}
      onRequestClose={() => setFilterModalVisible(false)}
    >
      <View style={tw`flex-1 bg-black bg-opacity-50 justify-end`}>
        <View style={tw`bg-white rounded-t-3xl p-6`}>
          <View style={tw`flex-row items-center justify-between mb-6`}>
            <Text style={tw`text-xl font-bold text-gray-800`}>Filter by Date</Text>
            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Date Filter */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-gray-700 font-medium mb-3`}>Select Date</Text>
            <TouchableOpacity
              onPress={() => {
                // You can implement a date picker here
                const today = new Date().toISOString().split('T')[0];
                setSelectedDate(selectedDate ? '' : today);
              }}
              style={tw`p-4 border border-gray-300 rounded-xl flex-row items-center justify-between`}
            >
              <Text style={tw`text-gray-700 text-base`}>
                {selectedDate ? new Date(selectedDate).toLocaleDateString() : 'All dates'}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
            
            {/* Quick Date Options */}
            <View style={tw`mt-3 flex-row gap-2`}>
              <TouchableOpacity
                onPress={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                style={tw`flex-1 bg-gray-100 py-2 px-3 rounded-lg`}
              >
                <Text style={tw`text-gray-600 text-center text-sm`}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  const yesterday = new Date();
                  yesterday.setDate(yesterday.getDate() - 1);
                  setSelectedDate(yesterday.toISOString().split('T')[0]);
                }}
                style={tw`flex-1 bg-gray-100 py-2 px-3 rounded-lg`}
              >
                <Text style={tw`text-gray-600 text-center text-sm`}>Yesterday</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={tw`flex-row gap-3`}>
            <TouchableOpacity
              onPress={clearFilters}
              style={tw`flex-1 bg-gray-100 py-3 rounded-xl`}
            >
              <Text style={tw`text-gray-600 text-center font-medium`}>Clear Filter</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => setFilterModalVisible(false)}
              style={tw`flex-1 bg-blue-500 py-3 rounded-xl`}
            >
              <Text style={tw`text-white text-center font-medium`}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  useEffect(() => {
    fetchAttendance();
  }, []);

  if (loading) {
    return (
      <View style={tw`flex-1 bg-gray-50 justify-center items-center`}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={tw`text-gray-600 mt-4`}>Loading attendance records...</Text>
      </View>
    );
  }

  return (
    <View style={tw`flex-1 bg-gray-50`}>
      {/* Header */}
      <View style={tw`bg-white px-6 py-4 border-b border-gray-200`}>
        <Text style={tw`text-2xl font-bold text-gray-800 mb-4`}>Attendance Records</Text>
        
        {/* Search Bar */}
        <View style={tw`flex-row items-center bg-gray-100 rounded-xl px-4 py-3 mb-3`}>
          <Ionicons name="search" size={20} color="#6B7280" />
          <TextInput
            placeholder="Search by name, email, or user ID..."
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

        {/* Filter Button */}
        <TouchableOpacity
          onPress={() => setFilterModalVisible(true)}
          style={tw`flex-row items-center justify-center bg-blue-100 py-2 px-4 rounded-xl`}
        >
          <Ionicons name="calendar-outline" size={18} color="#3B82F6" />
          <Text style={tw`text-blue-600 font-medium ml-2`}>Filter by Date</Text>
          {selectedDate && (
            <View style={tw`bg-blue-500 w-2 h-2 rounded-full ml-1`} />
          )}
        </TouchableOpacity>
      </View>

      {/* Records Count */}
      <View style={tw`px-6 py-3`}>
        <Text style={tw`text-gray-600`}>
          {filteredAttendance.length} record{filteredAttendance.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      {/* Attendance List */}
      {filteredAttendance.length > 0 ? (
        <FlatList
          data={filteredAttendance}
          renderItem={renderAttendanceItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={tw`px-6 pb-6`}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={tw`flex-1 justify-center items-center px-6`}>
          <Ionicons name="clipboard-outline" size={64} color="#D1D5DB" />
          <Text style={tw`text-gray-500 text-lg mt-4 text-center`}>
            {searchQuery || selectedDate 
              ? 'No records found matching your filters' 
              : 'No attendance records found'
            }
          </Text>
          <Text style={tw`text-gray-400 text-center mt-2`}>
            {searchQuery || selectedDate
              ? 'Try adjusting your search or filters'
              : 'Attendance records will appear here once staff start checking in'
            }
          </Text>
        </View>
      )}

      {/* Filter Modal */}
      {renderFilterModal()}
    </View>
  );
};

export default ViewAttendanceScreen;