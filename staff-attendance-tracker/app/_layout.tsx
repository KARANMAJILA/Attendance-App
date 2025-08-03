import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/hooks/useColorScheme';
import 'react-native-reanimated';

// Light Theme
const AttendanceTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3B82F6',        // Blue-500
    background: '#F8FAFC',     // Slate-50
    card: '#FFFFFF',
    text: '#1E293B',           // Slate-800
    border: '#E2E8F0',         // Slate-200
    notification: '#10B981',   // Emerald-500
  },
};

// Dark Theme
const AttendanceDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#60A5FA',        // Blue-400
    background: '#0F172A',     // Slate-900
    card: '#1E293B',           // Slate-800
    text: '#F1F5F9',           // Slate-100
    border: '#334155',         // Slate-700
    notification: '#34D399',   // Emerald-400
  },
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? AttendanceDarkTheme : AttendanceTheme;

  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) return null;

  return (
    <ThemeProvider value={theme}>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
          },
          headerShadowVisible: false,
        }}
      >
        {/* Login Screens */}
        <Stack.Screen
          name="login"
          options={{ headerShown: false, title: 'Login' }}
        />
        <Stack.Screen
          name="admin-login"
          options={{ headerShown: false, title: 'Admin Login' }}
        />

        {/* Main App Tabs */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* 404 Screen */}
        <Stack.Screen
          name="+not-found"
          options={{
            title: 'Page Not Found',
            headerStyle: { backgroundColor: '#EF4444' }, // Red-500
          }}
        />
      </Stack>

      <StatusBar
        style={colorScheme === 'dark' ? 'light' : 'dark'}
        backgroundColor={theme.colors.primary}
        translucent={false}
      />
    </ThemeProvider>
  );
}
