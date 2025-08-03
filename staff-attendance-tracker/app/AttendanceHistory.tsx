import * as React from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';

const API_BASE_URL = 'http://192.168.1.4:8000/attendance/me'; // Match your backend IP
const { width } = Dimensions.get('window');

interface AttendanceRecord {
  id: number;
  timestamp: string;
  location: string;
  battery_level: number;
}

export default function AttendanceHistory() {
  const [attendanceData, setAttendanceData] = React.useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const router = useRouter();

  const fetchAttendanceHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        Alert.alert('Error', 'No authentication token found');
        router.replace('/login');
        return;
      }

      console.log('Fetching attendance history...');

      const response = await fetch(`${API_BASE_URL}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setAttendanceData(data);
        console.log('Attendance data loaded:', data.length, 'records');
      } else {
        console.error('Failed to fetch attendance:', data);
        Alert.alert('Error', data.detail || 'Failed to load attendance history');
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert(
        'Network Error',
        'Failed to connect to server. Please check your internet connection.',
        [
          { text: 'Retry', onPress: () => fetchAttendanceHistory(false) },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  React.useEffect(() => {
    fetchAttendanceHistory();
  }, []);

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const formatLocation = (location: string) => {
    try {
      const [lat, lon] = location.split(',').map(coord => parseFloat(coord.trim()));
      return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
    } catch {
      return location;
    }
  };

  const getBatteryColor = (level: number) => {
    if (level >= 50) return 'text-green-600';
    if (level >= 20) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBatteryIcon = (level: number) => {
    if (level >= 75) return '🔋';
    if (level >= 50) return '🔋';
    if (level >= 25) return '🪫';
    return '🪫';
  };

  const getDateGrouping = (records: AttendanceRecord[]) => {
    const groups: { [key: string]: AttendanceRecord[] } = {};
    
    records.forEach(record => {
      const date = new Date(record.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey: string;
      if (date.toDateString() === today.toDateString()) {
        groupKey = 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = 'Yesterday';
      } else {
        groupKey = date.toLocaleDateString('en-US', { 
          weekday: 'long',
          month: 'long', 
          day: 'numeric',
          year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(record);
    });
    
    return groups;
  };

  const goBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <StatusBar barStyle="dark-content" />
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={tw`mt-4 text-lg text-gray-600`}>Loading attendance history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const groupedData = getDateGrouping(attendanceData);
  const groupKeys = Object.keys(groupedData);

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={tw`bg-white px-4 py-3 border-b border-gray-200`}>
        <View style={tw`flex-row items-center justify-between`}>
          <TouchableOpacity
            onPress={goBack}
            style={tw`p-2 -ml-2`}
          >
            <Text style={tw`text-blue-600 text-lg font-medium`}>← Back</Text>
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold text-gray-800`}>📜 Attendance History</Text>
          <View style={tw`w-16`} />
        </View>
      </View>

      {/* Stats Summary */}
      <View style={tw`bg-white mx-4 mt-4 p-4 rounded-xl shadow-sm border border-gray-100`}>
        <View style={tw`flex-row justify-between items-center`}>
          <View style={tw`items-center flex-1`}>
            <Text style={tw`text-2xl font-bold text-blue-600`}>{attendanceData.length}</Text>
            <Text style={tw`text-sm text-gray-600`}>Total Records</Text>
          </View>
          <View style={tw`w-px h-8 bg-gray-200`} />
          <View style={tw`items-center flex-1`}>
            <Text style={tw`text-2xl font-bold text-green-600`}>
              {attendanceData.filter(record => {
                const recordDate = new Date(record.timestamp).toDateString();
                const today = new Date().toDateString();
                return recordDate === today;
              }).length}
            </Text>
            <Text style={tw`text-sm text-gray-600`}>Today</Text>
          </View>
          <View style={tw`w-px h-8 bg-gray-200`} />
          <View style={tw`items-center flex-1`}>
            <Text style={tw`text-2xl font-bold text-purple-600`}>
              {new Set(attendanceData.map(record => 
                new Date(record.timestamp).toDateString()
              )).size}
            </Text>
            <Text style={tw`text-sm text-gray-600`}>Days</Text>
          </View>
        </View>
      </View>

      {/* Attendance List */}
      <ScrollView
        style={tw`flex-1 px-4`}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAttendanceHistory(true)}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {attendanceData.length === 0 ? (
          <View style={tw`flex-1 justify-center items-center py-20`}>
            <Text style={tw`text-6xl mb-4`}>📋</Text>
            <Text style={tw`text-xl font-semibold text-gray-700 mb-2`}>No Attendance Records</Text>
            <Text style={tw`text-gray-500 text-center px-8`}>
              You haven't marked any attendance yet. Start by marking your first attendance!
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/Dashboard')}
              style={tw`mt-6 bg-blue-600 px-6 py-3 rounded-xl`}
            >
              <Text style={tw`text-white font-semibold`}>Mark Attendance</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {groupKeys.map((groupKey, groupIndex) => (
              <View key={groupKey} style={tw`mb-6`}>
                {/* Date Group Header */}
                <View style={tw`flex-row items-center mb-3 mt-4`}>
                  <Text style={tw`text-lg font-semibold text-gray-800`}>{groupKey}</Text>
                  <View style={tw`flex-1 h-px bg-gray-200 ml-3`} />
                  <Text style={tw`text-sm text-gray-500 ml-2`}>
                    {groupedData[groupKey].length} record{groupedData[groupKey].length !== 1 ? 's' : ''}
                  </Text>
                </View>

                {/* Records for this date */}
                {groupedData[groupKey].map((record, index) => (
                  <View
                    key={record.id}
                    style={tw`bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100`}
                  >
                    {/* Time and Status */}
                    <View style={tw`flex-row justify-between items-start mb-3`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-lg font-semibold text-gray-800`}>
                          ✅ Attendance Marked
                        </Text>
                        <Text style={tw`text-sm text-gray-600 mt-1`}>
                          {formatDate(record.timestamp)}
                        </Text>
                      </View>
                      <View style={tw`bg-green-100 px-3 py-1 rounded-full`}>
                        <Text style={tw`text-green-700 text-xs font-medium`}>VERIFIED</Text>
                      </View>
                    </View>

                    {/* Details Grid */}
                    <View style={tw`border-t border-gray-100 pt-3`}>
                      <View style={tw`flex-row justify-between items-center mb-2`}>
                        <View style={tw`flex-row items-center flex-1`}>
                          <Text style={tw`text-gray-600 text-sm`}>📍 Location:</Text>
                          <Text style={tw`text-gray-800 text-sm ml-2 flex-1`} numberOfLines={1}>
                            {formatLocation(record.location)}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={tw`flex-row justify-between items-center`}>
                        <View style={tw`flex-row items-center`}>
                          <Text style={tw`text-gray-600 text-sm`}>
                            {getBatteryIcon(record.battery_level)} Battery:
                          </Text>
                          <Text style={tw`text-sm ml-2 font-medium ${getBatteryColor(record.battery_level)}`}>
                            {record.battery_level}%
                          </Text>
                        </View>
                        <Text style={tw`text-xs text-gray-500`}>
                          ID: #{record.id}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            ))}

            {/* Bottom Spacing */}
            <View style={tw`h-6`} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}