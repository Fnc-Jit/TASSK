import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Bell,
    BellOff,
    BellRing,
    Camera,
    Check,
    CheckCircle,
    ChevronRight,
    FileText,
    Info,
    Mail,
    MapPin,
    Moon,
    Palette,
    Phone,
    Sun,
    User,
    X
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { fetchTasks, fetchTransactions, uploadProfileImage } from '../../lib/supabase';

const themeColors = [
    { name: 'violet', from: '#7c3aed', to: '#9333ea' },
    { name: 'blue', from: '#2563eb', to: '#0891b2' },
    { name: 'emerald', from: '#059669', to: '#0d9488' },
    { name: 'rose', from: '#e11d48', to: '#db2777' },
    { name: 'amber', from: '#d97706', to: '#ea580c' },
    { name: 'indigo', from: '#4f46e5', to: '#2563eb' },
];

export default function ProfileScreen() {
    const { darkMode, setDarkMode, currentUser, updateProfile, logout, themeColor, setThemeColor, notifications, markNotificationRead, markAllNotificationsRead, clearNotifications, unreadCount, notificationsEnabled, setNotificationsEnabled, colors, supabaseUser, t } = useApp();

    const [stats, setStats] = useState({ tasks: 0, owed: 0, owing: 0 });
    const [uploadingImage, setUploadingImage] = useState(false);

    const loadStats = useCallback(async () => {
        if (!supabaseUser) return;
        try {
            const { data: tasks } = await fetchTasks(supabaseUser.id);
            const { data: transactions } = await fetchTransactions(supabaseUser.id);
            const taskCount = tasks?.length || 0;
            const owed = (transactions || []).filter((t: any) =>
                (t.type === 'lending' && t.created_by === supabaseUser.id && t.status === 'pending') ||
                (t.type === 'debt' && t.person_id === supabaseUser.id && t.status === 'pending')
            ).reduce((s: number, t: any) => s + t.amount, 0);

            const owing = (transactions || []).filter((t: any) =>
                (t.type === 'debt' && t.created_by === supabaseUser.id && t.status === 'pending') ||
                (t.type === 'lending' && t.person_id === supabaseUser.id && t.status === 'pending')
            ).reduce((s: number, t: any) => s + t.amount, 0);
            setStats({ tasks: taskCount, owed, owing });
        } catch (e) {
            console.log('Failed to load stats:', e);
        }
    }, [supabaseUser]);

    useEffect(() => { loadStats(); }, [loadStats]);

    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(currentUser?.name || '');
    const [showPersonalInfo, setShowPersonalInfo] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showTheme, setShowTheme] = useState(false);
    const [showAbout, setShowAbout] = useState(false);
    const [editInfo, setEditInfo] = useState({
        name: currentUser?.name || '', email: currentUser?.email || '',
        phone: currentUser?.phone || '', bio: currentUser?.bio || '', location: currentUser?.location || '',
    });

    const bg = darkMode ? '#111827' : '#ffffff';
    const cardBg = darkMode ? '#1f2937' : '#ffffff';
    const textPrimary = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const borderColor = darkMode ? '#374151' : '#e5e7eb';
    const inputBg = darkMode ? '#374151' : '#f9fafb';
    const inputBorder = darkMode ? '#4b5563' : '#e5e7eb';
    const handlePickImage = async () => {
        try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!perm.granted) {
                Alert.alert('Permission needed', 'Gallery access is required to set a profile picture.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.7,
                base64: true
            });

            if (!result.canceled && result.assets && result.assets[0] && result.assets[0].base64) {
                uploadAvatar(result.assets[0].base64);
            }
        } catch (e: any) {
            console.error('Gallery error:', e);
            Alert.alert('Gallery Error', e.message || 'Could not open gallery');
        }
    };

    const uploadAvatar = async (base64str: string) => {
        if (!supabaseUser) return;
        setUploadingImage(true);
        try {
            const { url, error } = await uploadProfileImage(supabaseUser.id, base64str);
            if (error) { Alert.alert('Upload Failed', error.message); }
            else if (url) { updateProfile({ profileImage: url }); }
        } catch (e: any) {
            Alert.alert('Error', e.message || 'Upload failed');
        }
        setUploadingImage(false);
    };

    const handleSaveName = () => { updateProfile({ name: editName }); setIsEditingName(false); };
    const handleSaveInfo = () => { updateProfile(editInfo); setShowPersonalInfo(false); };

    const getNotifIcon = (type: string) => {
        if (type === 'task') return <CheckCircle size={20} color={colors.text} />;
        if (type === 'money') return <Text style={{ color: '#22c55e', fontSize: 18, fontWeight: '700' }}>₹</Text>;
        return <BellRing size={20} color="#3b82f6" />;
    };

    const MenuRow = ({ icon, label, onPress, right, border = true }: any) => (
        <TouchableOpacity onPress={onPress} style={[st.menuRow, border && { borderBottomWidth: 1, borderBottomColor: borderColor }]} activeOpacity={0.6}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {icon}
                {typeof label === 'string' ? <Text style={{ color: textPrimary, fontSize: 15 }}>{label}</Text> : label}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {right}
                <ChevronRight size={20} color={darkMode ? '#6b7280' : '#9ca3af'} />
            </View>
        </TouchableOpacity>
    );

    const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
        <TouchableOpacity onPress={onToggle} style={[st.toggle, { backgroundColor: value ? colors.primary : (darkMode ? '#4b5563' : '#d1d5db') }]}>
            <View style={[st.toggleThumb, { transform: [{ translateX: value ? 22 : 2 }] }]} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
            <ScrollView style={{ flex: 1 }}>
                {/* Header */}
                <LinearGradient colors={colors.gradient} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 80 }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff' }}>{t.profile}</Text>
                </LinearGradient>

                {/* Profile Card */}
                <View style={{ paddingHorizontal: 24, marginTop: -60 }}>
                    <View style={[st.profileCard, { backgroundColor: cardBg }]}>
                        <View style={{ alignItems: 'center', marginBottom: 20 }}>
                            <View style={{ position: 'relative' }}>
                                <Image source={{ uri: currentUser?.profileImage }} style={st.profileImg} />
                                {uploadingImage && (
                                    <View style={[st.profileImg, { position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }]}>
                                        <ActivityIndicator size="small" color="#fff" />
                                    </View>
                                )}
                                <TouchableOpacity onPress={handlePickImage} style={[st.cameraBtn, { backgroundColor: colors.primary }]}>
                                    <Camera size={18} color="#fff" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ marginTop: 16, width: '100%' }}>
                                {isEditingName ? (
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TextInput value={editName} onChangeText={setEditName} autoFocus
                                            style={[st.nameInput, { borderColor: inputBorder, backgroundColor: inputBg, color: textPrimary }]} />
                                        <TouchableOpacity onPress={handleSaveName} style={[st.saveBtn, { backgroundColor: colors.primary }]}>
                                            <Text style={{ color: '#fff', fontWeight: '600' }}>Save</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <TouchableOpacity onPress={() => { setEditName(currentUser?.name || ''); setIsEditingName(true); }}>
                                        <Text style={{ fontSize: 24, fontWeight: '600', color: textPrimary, textAlign: 'center' }}>{currentUser?.name || 'User'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                                <Mail size={14} color={textSecondary} />
                                <Text style={{ fontSize: 14, color: textSecondary }}>{currentUser?.email}</Text>
                            </View>
                        </View>

                        {/* Stats */}
                        <View style={[st.statsRow, { borderTopColor: borderColor }]}>
                            <View style={st.statItem}>
                                <Text style={[st.statNumber, { color: colors.text }]}>{stats.tasks}</Text>
                                <Text style={[st.statLabel, { color: textSecondary }]}>{t.tasks}</Text>
                            </View>
                            <View style={st.statItem}>
                                <Text style={[st.statNumber, { color: '#16a34a' }]} adjustsFontSizeToFit numberOfLines={1}>₹{Number(stats.owed.toFixed(2))}</Text>
                                <Text style={[st.statLabel, { color: textSecondary }]}>{t.owed}</Text>
                            </View>
                            <View style={st.statItem}>
                                <Text style={[st.statNumber, { color: '#dc2626' }]} adjustsFontSizeToFit numberOfLines={1}>₹{Number(stats.owing.toFixed(2))}</Text>
                                <Text style={[st.statLabel, { color: textSecondary }]}>{t.owing}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Account Settings */}
                    <View style={[st.sectionCard, { backgroundColor: cardBg }]}>
                        <Text style={[st.sectionLabel, { color: textSecondary, borderBottomColor: borderColor }]}>{t.accountSettings}</Text>
                        <MenuRow icon={<User size={20} color={textSecondary} />} label={t.personalInfo}
                            onPress={() => { setEditInfo({ name: currentUser?.name || '', email: currentUser?.email || '', phone: currentUser?.phone || '', bio: currentUser?.bio || '', location: currentUser?.location || '' }); setShowPersonalInfo(true); }} />
                        <MenuRow icon={<Bell size={20} color={textSecondary} />} label={t.notifications} border={false}
                            right={unreadCount > 0 ? <View style={st.badge}><Text style={st.badgeText}>{unreadCount}</Text></View> : null}
                            onPress={() => setShowNotifications(true)} />
                    </View>

                    {/* Preferences */}
                    <View style={[st.sectionCard, { backgroundColor: cardBg }]}>
                        <Text style={[st.sectionLabel, { color: textSecondary, borderBottomColor: borderColor }]}>{t.preferences}</Text>
                        <MenuRow icon={<Palette size={20} color={textSecondary} />}
                            label={<View><Text style={{ color: textPrimary, fontSize: 15 }}>{t.theme}</Text><Text style={{ fontSize: 12, color: textSecondary }}>{darkMode ? t.dark : t.light} · {themeColor}</Text></View>}
                            onPress={() => setShowTheme(true)} />
                        <MenuRow icon={<Info size={20} color={textSecondary} />} label={t.about} border={false} onPress={() => setShowAbout(true)} />
                    </View>

                    {/* Sign Out */}
                    <TouchableOpacity onPress={logout} style={[st.signOutBtn, { backgroundColor: darkMode ? 'rgba(127,29,29,0.3)' : '#fef2f2' }]}>
                        <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: '500' }}>{t.signOut}</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Personal Information Modal */}
            <Modal visible={showPersonalInfo} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={[st.bottomSheet, { backgroundColor: cardBg }]}>
                        <View style={[st.sheetHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[st.sheetTitle, { color: textPrimary }]}>{t.personalInfo}</Text>
                            <TouchableOpacity onPress={() => setShowPersonalInfo(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
                            {[
                                { label: t.fullName, value: editInfo.name, key: 'name', icon: <User size={16} color={textSecondary} /> },
                                { label: t.emailAddress, value: editInfo.email, key: 'email', icon: <Mail size={16} color={textSecondary} /> },
                                { label: t.phoneNumber, value: editInfo.phone, key: 'phone', icon: <Phone size={16} color={textSecondary} />, placeholder: t.enterPhone },
                                { label: t.location, value: editInfo.location, key: 'location', icon: <MapPin size={16} color={textSecondary} />, placeholder: t.enterLocation },
                            ].map(field => (
                                <View key={field.key} style={{ marginBottom: 16 }}>
                                    <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 6 }}>{field.label}</Text>
                                    <View style={[st.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                        {field.icon}
                                        <TextInput value={field.value} onChangeText={v => setEditInfo({ ...editInfo, [field.key]: v })}
                                            placeholder={field.placeholder || ''} placeholderTextColor="#9ca3af"
                                            style={{ flex: 1, color: textPrimary, fontSize: 15, paddingVertical: 12 }} />
                                    </View>
                                </View>
                            ))}
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 6 }}>{t.bio}</Text>
                                <View style={[st.fieldInput, { backgroundColor: inputBg, borderColor: inputBorder, alignItems: 'flex-start' }]}>
                                    <FileText size={16} color={textSecondary} style={{ marginTop: 14 }} />
                                    <TextInput value={editInfo.bio} onChangeText={v => setEditInfo({ ...editInfo, bio: v })}
                                        placeholder={t.tellAboutYourself} placeholderTextColor="#9ca3af" multiline numberOfLines={3}
                                        style={{ flex: 1, color: textPrimary, fontSize: 15, paddingVertical: 12, minHeight: 80, textAlignVertical: 'top' }} />
                                </View>
                            </View>
                            <Text style={{ fontSize: 12, color: textSecondary }}>{t.memberSince} {currentUser?.joinDate}</Text>
                        </ScrollView>
                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
                            <TouchableOpacity onPress={handleSaveInfo} activeOpacity={0.8}>
                                <LinearGradient colors={colors.gradient} style={st.sheetBtn}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.saveChanges}</Text></LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Notifications Modal */}
            <Modal visible={showNotifications} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={[st.bottomSheet, { backgroundColor: cardBg }]}>
                        <View style={[st.sheetHeader, { borderBottomColor: borderColor }]}>
                            <View>
                                <Text style={[st.sheetTitle, { color: textPrimary }]}>{t.notifications}</Text>
                                {unreadCount > 0 && <Text style={{ fontSize: 12, color: colors.text }}>{unreadCount} unread</Text>}
                            </View>
                            <TouchableOpacity onPress={() => setShowNotifications(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: borderColor, backgroundColor: darkMode ? '#1a2332' : '#f9fafb' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {notificationsEnabled ? <BellRing size={16} color={colors.text} /> : <BellOff size={16} color={textSecondary} />}
                                <Text style={{ fontSize: 14, color: textPrimary }}>{notificationsEnabled ? t.notifEnabled : t.notifDisabled}</Text>
                            </View>
                            <Toggle value={notificationsEnabled} onToggle={() => setNotificationsEnabled(!notificationsEnabled)} />
                        </View>

                        {notifications.length > 0 && (
                            <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 24, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: borderColor }}>
                                {unreadCount > 0 && <TouchableOpacity onPress={markAllNotificationsRead}><Text style={{ fontSize: 12, color: colors.text }}>{t.markAllRead}</Text></TouchableOpacity>}
                                <TouchableOpacity onPress={clearNotifications}><Text style={{ fontSize: 12, color: '#ef4444' }}>{t.clearAll}</Text></TouchableOpacity>
                            </View>
                        )}

                        <ScrollView style={{ maxHeight: 400 }}>
                            {notifications.length === 0 ? (
                                <View style={{ paddingVertical: 48, alignItems: 'center' }}>
                                    <Bell size={48} color={darkMode ? '#4b5563' : '#d1d5db'} />
                                    <Text style={{ color: textSecondary, marginTop: 12 }}>{t.noNotifications}</Text>
                                    <Text style={{ color: textSecondary, fontSize: 13 }}>{t.allCaughtUp}</Text>
                                </View>
                            ) : notifications.map(n => (
                                <TouchableOpacity key={n.id} onPress={() => markNotificationRead(n.id)}
                                    style={[st.notifRow, { borderBottomColor: borderColor, backgroundColor: !n.read ? (darkMode ? 'rgba(124,58,237,0.1)' : colors.primaryLight + '80') : 'transparent' }]}>
                                    <View style={[st.notifIcon, { backgroundColor: darkMode ? '#374151' : '#f3f4f6' }]}>{getNotifIcon(n.type)}</View>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <Text style={{ fontSize: 14, fontWeight: !n.read ? '600' : '400', color: textPrimary }}>{n.title}</Text>
                                            {!n.read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} />}
                                        </View>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }} numberOfLines={1}>{n.message}</Text>
                                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>{n.time}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
                            <TouchableOpacity onPress={() => setShowNotifications(false)} activeOpacity={0.8}>
                                <LinearGradient colors={colors.gradient} style={st.sheetBtn}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text></LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Theme Modal */}
            <Modal visible={showTheme} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={[st.bottomSheet, { backgroundColor: cardBg, maxHeight: '80%' }]}>
                        <View style={[st.sheetHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[st.sheetTitle, { color: textPrimary }]}>{t.theme}</Text>
                            <TouchableOpacity onPress={() => setShowTheme(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
                            <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 12 }}>{t.appearance}</Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                                <TouchableOpacity onPress={() => setDarkMode(false)} style={[st.appearanceBtn, !darkMode && { borderColor: colors.primary, backgroundColor: colors.primaryLight }]}>
                                    <LinearGradient colors={['#fde68a', '#fdba74']} style={st.appearanceIcon}><Sun size={24} color="#ea580c" /></LinearGradient>
                                    <Text style={{ fontSize: 14, color: textPrimary }}>{t.light}</Text>
                                    {!darkMode && <Check size={16} color={colors.text} />}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setDarkMode(true)} style={[st.appearanceBtn, darkMode && { borderColor: colors.primary }]}>
                                    <LinearGradient colors={['#3730a3', '#1f2937']} style={st.appearanceIcon}><Moon size={24} color="#a5b4fc" /></LinearGradient>
                                    <Text style={{ fontSize: 14, color: textPrimary }}>{t.dark}</Text>
                                    {darkMode && <Check size={16} color={colors.text} />}
                                </TouchableOpacity>
                            </View>
                            <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 12 }}>{t.accentColor}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                {themeColors.map(c => (
                                    <TouchableOpacity key={c.name} onPress={() => setThemeColor(c.name)}
                                        style={[st.colorBtn, themeColor === c.name && { borderColor: colors.primary, backgroundColor: darkMode ? '#374151' : '#f9fafb' }]}>
                                        <LinearGradient colors={[c.from, c.to]} style={[st.colorDot, themeColor === c.name && { borderWidth: 3, borderColor: '#fff' }]} />
                                        <Text style={{ fontSize: 12, color: textSecondary, textTransform: 'capitalize' }}>{c.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
                            <TouchableOpacity onPress={() => setShowTheme(false)} activeOpacity={0.8}>
                                <LinearGradient colors={colors.gradient} style={st.sheetBtn}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.done}</Text></LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* About Modal */}
            <Modal visible={showAbout} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={[st.bottomSheet, { backgroundColor: cardBg }]}>
                        <View style={[st.sheetHeader, { borderBottomColor: borderColor }]}>
                            <Text style={[st.sheetTitle, { color: textPrimary }]}>{t.aboutTaskx}</Text>
                            <TouchableOpacity onPress={() => setShowAbout(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
                            <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <LinearGradient colors={colors.gradient} style={st.aboutIcon}><CheckCircle size={40} color="#fff" /></LinearGradient>
                                <Text style={{ fontSize: 24, fontWeight: '600', color: textPrimary, marginTop: 16 }}>TASKX</Text>
                                <Text style={{ fontSize: 14, color: textSecondary, marginTop: 4 }}>Version 1.0.0 (Build 2026.03.02)</Text>
                                <Text style={{ fontSize: 13, color: textSecondary, marginTop: 4 }}>Made with ❤️ By Jitraj 2026</Text>
                            </View>
                            {[
                                { title: t.whatIsTaskx, body: t.whatIsTaskxBody },
                                { title: t.keyFeatures, body: t.keyFeaturesBody },
                                { title: t.team, body: t.teamBody },
                            ].map(item => (
                                <View key={item.title} style={[st.aboutSection, { backgroundColor: darkMode ? '#374151' : '#f9fafb' }]}>
                                    <Text style={{ fontWeight: '600', color: textPrimary, marginBottom: 6 }}>{item.title}</Text>
                                    <Text style={{ fontSize: 14, color: textSecondary, lineHeight: 20 }}>{item.body}</Text>
                                </View>
                            ))}
                            <Text style={{ fontSize: 12, color: textSecondary, textAlign: 'center', marginTop: 16 }}>© 2026 TASKX. All rights reserved.</Text>
                        </ScrollView>
                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: borderColor }}>
                            <TouchableOpacity onPress={() => setShowAbout(false)} activeOpacity={0.8}>
                                <LinearGradient colors={colors.gradient} style={st.sheetBtn}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text></LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    profileCard: { borderRadius: 20, padding: 24, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
    profileImg: { width: 112, height: 112, borderRadius: 56, borderWidth: 4, borderColor: '#fff' },
    cameraBtn: { position: 'absolute', bottom: 0, right: 0, width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    nameInput: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, textAlign: 'center' },
    saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, justifyContent: 'center' },
    statsRow: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 20 },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 24, fontWeight: '700' },
    statLabel: { fontSize: 13, marginTop: 4 },
    sectionCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    sectionLabel: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 14, fontWeight: '600', borderBottomWidth: 1 },
    menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
    badge: { backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
    signOutBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 24 },
    toggle: { width: 44, height: 24, borderRadius: 12 },
    toggleThumb: { position: 'absolute', top: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    bottomSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
    sheetTitle: { fontSize: 20, fontWeight: '600' },
    sheetBtn: { paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    fieldInput: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14 },
    notifRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, paddingVertical: 14, borderBottomWidth: 1 },
    notifIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    appearanceBtn: { flex: 1, alignItems: 'center', gap: 8, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb' },
    appearanceIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    colorBtn: { width: '29%', alignItems: 'center', gap: 6, padding: 12, borderRadius: 16, borderWidth: 2, borderColor: '#e5e7eb' },
    colorDot: { width: 32, height: 32, borderRadius: 16 },
    aboutIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    aboutSection: { padding: 16, borderRadius: 16, marginBottom: 12 },
});
