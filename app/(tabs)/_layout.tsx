import { Tabs } from 'expo-router';
import { Home, MessageCircle, User, Settings } from 'lucide-react-native';
import { View, Text, Platform } from 'react-native';
import { useApp } from '../../context/AppContext';

export default function TabLayout() {
    const { darkMode, colors, unreadCount, isLoggedIn } = useApp();

    if (!isLoggedIn) return null;

    const tabBarBg = darkMode ? '#1f2937' : '#ffffff';
    const tabBarBorder = darkMode ? '#374151' : '#e5e7eb';
    const inactiveColor = darkMode ? '#9ca3af' : '#6b7280';

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: tabBarBg,
                    borderTopColor: tabBarBorder,
                    borderTopWidth: 1,
                    height: Platform.OS === 'ios' ? 88 : 64,
                    paddingTop: 8,
                    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
                    elevation: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                },
                tabBarActiveTintColor: colors.text,
                tabBarInactiveTintColor: inactiveColor,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '500',
                    marginTop: 2,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Home',
                    tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="chat"
                options={{
                    title: 'Chat',
                    tabBarIcon: ({ color, size }) => <MessageCircle size={size} color={color} />,
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <View>
                            <User size={size} color={color} />
                            {unreadCount > 0 && (
                                <View style={{
                                    position: 'absolute',
                                    top: -4,
                                    right: -6,
                                    backgroundColor: '#ef4444',
                                    borderRadius: 7,
                                    width: 14,
                                    height: 14,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}>
                                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: 'Settings',
                    tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
                }}
            />
        </Tabs>
    );
}
