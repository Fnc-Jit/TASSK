import { Redirect } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useApp } from '../context/AppContext';

export default function Index() {
    const { isLoggedIn, isLoading, colors } = useApp();

    if (isLoading) {
        return (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ color: '#9ca3af', marginTop: 16, fontSize: 14 }}>Loading TASKX...</Text>
            </View>
        );
    }

    if (!isLoggedIn) {
        return <Redirect href="/login" />;
    }

    return <Redirect href="/(tabs)" />;
}
