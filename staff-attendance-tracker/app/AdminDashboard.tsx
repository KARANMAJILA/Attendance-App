import { View, Text, TouchableOpacity } from 'react-native';
import tw from 'twrnc';
import { useRouter } from 'expo-router';

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <View style={tw`flex-1 p-6 bg-white`}>
      <Text style={tw`text-2xl font-bold mb-4`}>Admin Dashboard</Text>

      <TouchableOpacity style={tw`bg-blue-500 p-4 rounded mb-3`} onPress={() => router.push('/ViewStaff')}>
        <Text style={tw`text-white text-lg`}>👥 View Staff List</Text>
      </TouchableOpacity>

      <TouchableOpacity style={tw`bg-green-500 p-4 rounded mb-3`} onPress={() => router.push('/AddStaffScreen')}>
        <Text style={tw`text-white text-lg`}>➕ Add Staff</Text>
      </TouchableOpacity>

      <TouchableOpacity style={tw`bg-yellow-500 p-4 rounded mb-3`} onPress={() => router.push('/ViewAttendance')}>
        <Text style={tw`text-white text-lg`}>📅 View Attendance</Text>
      </TouchableOpacity>

    </View>
  );
}
