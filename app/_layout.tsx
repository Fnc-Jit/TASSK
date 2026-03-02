import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider, useApp } from '../context/AppContext';
import { useEffect } from 'react';

function RootContent() {
  const { darkMode, isLoggedIn, isLoading } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inTabsGroup = segments[0] === '(tabs)';

    if (!isLoggedIn && inTabsGroup) {
      // Redirect to login page if not authenticated but trying to access tabs
      router.replace('/login');
    } else if (isLoggedIn && !inTabsGroup) {
      // Redirect to tabs if logged in but on login screen
      router.replace('/(tabs)');
    }
  }, [isLoggedIn, segments, isLoading]);

  return (
    <>
      <StatusBar style={darkMode ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <RootContent />
    </AppProvider>
  );
}
