import { LinearGradient } from 'expo-linear-gradient';
import { Bell, Bug, Check, ChevronRight, FileText, Globe, HelpCircle, Mail, MapPin, Moon, Phone, Shield, User as UserIcon, Users, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppUser, useApp } from '../../context/AppContext';
import { Language, languageNames } from '../../lib/i18n';
import { ConsoleEntry, consoleLogs, isUserOnline, requestTracker, supabase } from '../../lib/supabase';




export default function SettingsScreen() {
    const { darkMode, setDarkMode, notificationsEnabled, setNotificationsEnabled, logout, colors, allUsers, supabaseUser, themeColor, language, setLanguage, t } = useApp();
    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
    const [showPrivacySettings, setShowPrivacySettings] = useState(false);
    const [showConnections, setShowConnections] = useState(false);
    const [showLanguage, setShowLanguage] = useState(false);
    const [showHelpCenter, setShowHelpCenter] = useState(false);
    const [showViewProfile, setShowViewProfile] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [selectedUserProfile, setSelectedUserProfile] = useState<{ phone?: string; bio?: string; location?: string } | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);
    const [privacySettings, setPrivacySettings] = useState({ profileVisibility: true, activityStatus: true, dataSharing: false });
    const [debugStats, setDebugStats] = useState({ sent: 0, received: 0, errors: 0 });
    const [debugLogs, setDebugLogs] = useState<ConsoleEntry[]>([]);
    const [consoleInput, setConsoleInput] = useState('');

    const runConsoleCommand = () => {
        if (!consoleInput.trim()) return;
        const cmd = consoleInput.trim();
        setConsoleInput('');
        console.log(`> ${cmd}`);
        try {
            // eslint-disable-next-line no-eval
            const result = eval(cmd);
            if (result instanceof Promise) {
                result.then((r: any) => console.log('→', r)).catch((e: any) => console.error('→', e?.message || e));
            } else {
                console.log('→', result);
            }
        } catch (e: any) {
            console.error('→', e?.message || String(e));
        }
    };

    // Sync debug stats & console logs every second when modal is open
    useEffect(() => {
        if (!showDebug) return;
        setDebugStats({ ...requestTracker });
        setDebugLogs([...consoleLogs]);
        const interval = setInterval(() => {
            setDebugStats({ ...requestTracker });
            setDebugLogs([...consoleLogs]);
        }, 1000);
        return () => clearInterval(interval);
    }, [showDebug]);

    const openUserProfile = async (user: AppUser) => {
        setSelectedUser(user);
        setSelectedUserProfile(null);
        setProfileLoading(true);
        setShowViewProfile(true);
        try {
            const { data } = await supabase.from('user_profiles').select('phone, bio, location').eq('user_id', user.id).single();
            if (data) setSelectedUserProfile(data);
        } catch (e) {
            // No extended profile available
        }
        setProfileLoading(false);
    };

    const bg = darkMode ? '#111827' : colors.lightBg;
    const cardBg = darkMode ? '#1f2937' : '#ffffff';
    const textPrimary = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const borderColor = darkMode ? '#374151' : '#e5e7eb';

    const Toggle = ({ value, onToggle }: { value: boolean; onToggle: () => void }) => (
        <TouchableOpacity onPress={onToggle} style={[st.toggle, { backgroundColor: value ? colors.primary : (darkMode ? '#4b5563' : '#d1d5db') }]}>
            <View style={[st.toggleThumb, { transform: [{ translateX: value ? 26 : 2 }] }]} />
        </TouchableOpacity>
    );

    const MenuBtn = ({ icon, label, onPress, border = true }: any) => (
        <TouchableOpacity onPress={onPress} style={[st.menuRow, border && { borderBottomWidth: 1, borderBottomColor: borderColor }]} activeOpacity={0.6}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {icon}
                <Text style={{ color: textPrimary, fontSize: 15 }}>{label}</Text>
            </View>
            <ChevronRight size={20} color={darkMode ? '#6b7280' : '#9ca3af'} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
            <ScrollView>
                {/* Header */}
                <LinearGradient colors={colors.gradient} style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
                    <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 }}>{t.settings}</Text>
                    <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{t.customizeExperience}</Text>
                </LinearGradient>

                <View style={{ paddingHorizontal: 24, paddingVertical: 24 }}>
                    {/* General */}
                    <View style={[st.card, { backgroundColor: cardBg }]}>
                        <Text style={[st.sectionLabel, { color: textSecondary, borderBottomColor: borderColor }]}>{t.general}</Text>

                        <View style={[st.settingRow, { borderBottomColor: borderColor }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Bell size={20} color={textSecondary} />
                                <View>
                                    <Text style={{ color: textPrimary, fontSize: 15 }}>{t.notifications}</Text>
                                    {notificationsEnabled && <Text style={{ fontSize: 11, color: colors.text, marginTop: 2 }}>{t.active}</Text>}
                                </View>
                            </View>
                            <Toggle value={notificationsEnabled} onToggle={() => setNotificationsEnabled(!notificationsEnabled)} />
                        </View>

                        <View style={[st.settingRow, { borderBottomColor: borderColor }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Moon size={20} color={textSecondary} />
                                <View>
                                    <Text style={{ color: textPrimary, fontSize: 15 }}>{t.darkMode}</Text>
                                    {darkMode && <Text style={{ fontSize: 11, color: colors.text, marginTop: 2 }}>{t.enabled}</Text>}
                                </View>
                            </View>
                            <Toggle value={darkMode} onToggle={() => setDarkMode(!darkMode)} />
                        </View>

                        <TouchableOpacity onPress={() => setShowLanguage(true)} style={[st.menuRow, { borderBottomWidth: 0 }]} activeOpacity={0.6}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Globe size={20} color={textSecondary} />
                                <View>
                                    <Text style={{ color: textPrimary, fontSize: 15 }}>{t.language}</Text>
                                    <Text style={{ fontSize: 13, color: textSecondary }}>{languageNames[language]}</Text>
                                </View>
                            </View>
                            <ChevronRight size={20} color={darkMode ? '#6b7280' : '#9ca3af'} />
                        </TouchableOpacity>
                    </View>

                    {/* Data & Privacy */}
                    <View style={[st.card, { backgroundColor: cardBg }]}>
                        <Text style={[st.sectionLabel, { color: textSecondary, borderBottomColor: borderColor }]}>{t.dataPrivacy}</Text>
                        <MenuBtn icon={<Shield size={20} color={textSecondary} />} label={t.privacySettings} onPress={() => setShowPrivacySettings(true)} />
                        <MenuBtn icon={<Users size={20} color={textSecondary} />} label={t.manageConnections} border={false} onPress={() => setShowConnections(true)} />
                    </View>

                    {/* Support & Legal */}
                    <View style={[st.card, { backgroundColor: cardBg }]}>
                        <Text style={[st.sectionLabel, { color: textSecondary, borderBottomColor: borderColor }]}>{t.supportLegal}</Text>
                        <MenuBtn icon={<HelpCircle size={20} color={textSecondary} />} label={t.helpCenter} onPress={() => setShowHelpCenter(true)} />
                        <MenuBtn icon={<FileText size={20} color={textSecondary} />} label={t.privacyPolicy} border={false} onPress={() => setShowPrivacyPolicy(true)} />
                    </View>

                    {/* App Info */}
                    <View style={[st.card, { backgroundColor: cardBg }]}>
                        <View style={{ padding: 20, alignItems: 'center' }}>
                            <LinearGradient colors={colors.gradient} style={st.appIcon}><Check size={32} color="#fff" /></LinearGradient>
                            <Text style={{ fontWeight: '600', color: textPrimary, marginTop: 12, fontSize: 16 }}>TASKX</Text>
                            <Text style={{ fontSize: 14, color: textSecondary, marginTop: 4 }}>Version 1.0.0</Text>
                            <Text style={{ fontSize: 13, color: textSecondary, marginTop: 4 }}>Made with ❤️ By Jitraj 2026</Text>
                            <Text style={{ fontSize: 12, color: textSecondary, marginTop: 8 }}>© 2026 TASKX. All rights reserved.</Text>
                        </View>
                    </View>

                    {/* Developer */}
                    <View style={[st.card, { backgroundColor: cardBg }]}>
                        <Text style={[st.sectionLabel, { color: textSecondary, borderBottomColor: borderColor }]}>Developer</Text>
                        <MenuBtn icon={<Bug size={20} color={textSecondary} />} label="Debug Menu" border={false} onPress={() => setShowDebug(true)} />
                    </View>

                    {/* Danger Zone */}
                    <View style={[st.card, { backgroundColor: cardBg, borderWidth: 1, borderColor: darkMode ? '#7f1d1d' : '#fecaca' }]}>
                        <Text style={[st.sectionLabel, { color: '#dc2626', borderBottomColor: darkMode ? '#7f1d1d' : '#fecaca' }]}>{t.dangerZone}</Text>
                        <TouchableOpacity style={[st.menuRow, { borderBottomWidth: 1, borderBottomColor: borderColor }]}><Text style={{ color: '#dc2626', fontSize: 15 }}>{t.clearAllData}</Text></TouchableOpacity>
                        <TouchableOpacity onPress={logout} style={[st.menuRow, { borderBottomWidth: 0 }]}><Text style={{ color: '#dc2626', fontSize: 15 }}>{t.signOut}</Text></TouchableOpacity>
                    </View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Privacy Policy Modal */}
            <Modal visible={showPrivacyPolicy} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>{t.privacyPolicy}</Text>
                            <TouchableOpacity onPress={() => setShowPrivacyPolicy(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <ScrollView style={{ maxHeight: 400, paddingHorizontal: 4 }}>
                            {[
                                { title: t.dataCollection, body: t.dataCollectionBody },
                                { title: t.localStorage, body: t.localStorageBody },
                                { title: t.thirdParty, body: t.thirdPartyBody },
                                { title: t.yourResponsibility, body: t.yourResponsibilityBody },
                            ].map(s => (
                                <View key={s.title} style={{ marginBottom: 16 }}>
                                    <Text style={{ fontWeight: '600', color: textPrimary, marginBottom: 4 }}>{s.title}</Text>
                                    <Text style={{ fontSize: 14, color: textSecondary, lineHeight: 20 }}>{s.body}</Text>
                                </View>
                            ))}
                        </ScrollView>
                        <TouchableOpacity onPress={() => setShowPrivacyPolicy(false)} style={[st.fullBtn, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.iUnderstand}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Privacy Settings Modal */}
            <Modal visible={showPrivacySettings} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>{t.privacySettings}</Text>
                            <TouchableOpacity onPress={() => setShowPrivacySettings(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {[
                            { key: 'profileVisibility', label: t.profileVisibility, sub: t.profileVisibilitySub },
                            { key: 'activityStatus', label: t.activityStatus, sub: t.activityStatusSub },
                            { key: 'dataSharing', label: t.dataSharing, sub: t.dataSharingSub },
                        ].map(item => (
                            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: textPrimary, fontSize: 15 }}>{item.label}</Text>
                                    <Text style={{ fontSize: 13, color: textSecondary }}>{item.sub}</Text>
                                </View>
                                <Toggle value={(privacySettings as any)[item.key]} onToggle={() => setPrivacySettings({ ...privacySettings, [item.key]: !(privacySettings as any)[item.key] })} />
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setShowPrivacySettings(false)} style={[st.fullBtn, { backgroundColor: colors.primary }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.saveSettings}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Manage Connections Modal */}
            <Modal visible={showConnections} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>{t.manageConnections}</Text>
                            <TouchableOpacity onPress={() => setShowConnections(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 14, color: textSecondary, marginBottom: 16 }}>{t.collaborators}</Text>
                        {allUsers.length === 0 ? (
                            <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                <Text style={{ color: textSecondary }}>No connections found</Text>
                            </View>
                        ) : allUsers.map(user => (
                            <View key={user.id} style={[st.connRow, { backgroundColor: darkMode ? '#374151' : '#f9fafb' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <LinearGradient colors={colors.gradient} style={st.connAvatar}>
                                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{user.name.charAt(0)}</Text>
                                    </LinearGradient>
                                    <View>
                                        <Text style={{ color: textPrimary, fontSize: 15 }}>{user.name}</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary }}>{user.id === supabaseUser?.id ? 'Your account' : (isUserOnline(user.last_seen) ? 'Online' : 'Offline')}</Text>
                                    </View>
                                </View>
                                {user.id !== supabaseUser?.id && (
                                    <TouchableOpacity onPress={() => openUserProfile(user)}><Text style={{ fontSize: 13, color: colors.text, fontWeight: '500' }}>View Profile</Text></TouchableOpacity>
                                )}
                            </View>
                        ))}
                        <TouchableOpacity onPress={() => setShowConnections(false)} style={[st.fullBtn, { backgroundColor: colors.primary, marginTop: 16 }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Language Modal */}
            <Modal visible={showLanguage} transparent animationType="fade">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>{t.language}</Text>
                            <TouchableOpacity onPress={() => setShowLanguage(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {(Object.keys(languageNames) as Language[]).map((lang) => (
                            <TouchableOpacity key={lang} onPress={() => { setLanguage(lang); setShowLanguage(false); }}
                                style={[st.connRow, { backgroundColor: language === lang ? (darkMode ? '#374151' : colors.primaryLight) : (darkMode ? '#1f2937' : '#f9fafb') }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[st.connAvatar, { backgroundColor: language === lang ? colors.primary : (darkMode ? '#4b5563' : '#e5e7eb') }]}>
                                        <Text style={{ color: language === lang ? '#fff' : textSecondary, fontWeight: '600', fontSize: 14 }}>{lang.toUpperCase()}</Text>
                                    </View>
                                    <Text style={{ color: textPrimary, fontSize: 15, fontWeight: language === lang ? '600' : '400' }}>{languageNames[lang]}</Text>
                                </View>
                                {language === lang && <Check size={20} color={colors.primary} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </Modal>
            {/* Help Center Modal */}
            <Modal visible={showHelpCenter} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>{t.helpCenter}</Text>
                            <TouchableOpacity onPress={() => setShowHelpCenter(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: 15, color: textPrimary, marginBottom: 8 }}>Contact Us</Text>

                        <TouchableOpacity onPress={() => Linking.openURL('mailto:jitrajesh5@gmail.com')} style={[st.menuRow, { paddingHorizontal: 0, paddingVertical: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '500' }}>Email Us</Text>
                            </View>
                            <Text style={{ color: textSecondary, fontSize: 13 }}>jitrajesh5@gmail.com</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => Linking.openURL('https://github.com/Fnc-Jit')} style={[st.menuRow, { paddingHorizontal: 0, paddingVertical: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '500' }}>GitHub</Text>
                            </View>
                            <Text style={{ color: textSecondary, fontSize: 13 }}>Fnc-Jit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowHelpCenter(false)} style={[st.fullBtn, { backgroundColor: colors.primary, marginTop: 20 }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* View Profile Modal */}
            <Modal visible={showViewProfile} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>User Profile</Text>
                            <TouchableOpacity onPress={() => setShowViewProfile(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {selectedUser && (
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <LinearGradient colors={colors.gradient} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: '700' }}>{selectedUser.name.charAt(0)}</Text>
                                </LinearGradient>
                                <Text style={{ fontSize: 20, fontWeight: '600', color: textPrimary }}>{selectedUser.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: isUserOnline(selectedUser.last_seen) ? '#16a34a' : '#9ca3af' }} />
                                    <Text style={{ fontSize: 13, color: isUserOnline(selectedUser.last_seen) ? '#16a34a' : textSecondary }}>{isUserOnline(selectedUser.last_seen) ? 'Online' : 'Offline'}</Text>
                                </View>
                            </View>
                        )}

                        {profileLoading ? (
                            <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
                        ) : (
                            <View>
                                <View style={[st.menuRow, { paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: borderColor }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Mail size={18} color={textSecondary} />
                                        <Text style={{ fontSize: 14, color: textSecondary }}>Email</Text>
                                    </View>
                                    <Text style={{ fontSize: 14, color: textPrimary }}>{selectedUser?.email || '-'}</Text>
                                </View>
                                <View style={[st.menuRow, { paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: borderColor }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <Phone size={18} color={textSecondary} />
                                        <Text style={{ fontSize: 14, color: textSecondary }}>Phone</Text>
                                    </View>
                                    <Text style={{ fontSize: 14, color: textPrimary }}>{selectedUserProfile?.phone || '-'}</Text>
                                </View>
                                <View style={[st.menuRow, { paddingHorizontal: 0, borderBottomWidth: 1, borderBottomColor: borderColor }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <MapPin size={18} color={textSecondary} />
                                        <Text style={{ fontSize: 14, color: textSecondary }}>Location</Text>
                                    </View>
                                    <Text style={{ fontSize: 14, color: textPrimary }}>{selectedUserProfile?.location || '-'}</Text>
                                </View>
                                {selectedUserProfile?.bio ? (
                                    <View style={{ marginTop: 12 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                            <UserIcon size={18} color={textSecondary} />
                                            <Text style={{ fontSize: 14, color: textSecondary }}>Bio</Text>
                                        </View>
                                        <Text style={{ fontSize: 14, color: textPrimary, lineHeight: 20 }}>{selectedUserProfile.bio}</Text>
                                    </View>
                                ) : null}
                            </View>
                        )}

                        <TouchableOpacity onPress={() => setShowViewProfile(false)} style={[st.fullBtn, { backgroundColor: colors.primary, marginTop: 20 }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Debug Modal */}
            <Modal visible={showDebug} transparent animationType="slide">
                <View style={st.overlay}>
                    <View style={[st.modalCard, { backgroundColor: cardBg }]}>
                        <View style={st.modalHeader}>
                            <Text style={[st.modalTitle, { color: textPrimary }]}>🛠 Debug Menu</Text>
                            <TouchableOpacity onPress={() => setShowDebug(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>

                        <View style={{ gap: 12 }}>
                            {/* Request Stats */}
                            <View style={[st.connRow, { backgroundColor: darkMode ? '#374151' : '#f9fafb' }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#3b82f6' }}>{debugStats.sent}</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Requests Sent</Text>
                                    </View>
                                    <View style={{ width: 1, backgroundColor: borderColor }} />
                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#16a34a' }}>{debugStats.received}</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Responses OK</Text>
                                    </View>
                                    <View style={{ width: 1, backgroundColor: borderColor }} />
                                    <View style={{ alignItems: 'center', flex: 1 }}>
                                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#dc2626' }}>{debugStats.errors}</Text>
                                        <Text style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>Errors</Text>
                                    </View>
                                </View>
                            </View>

                            {/* App Details */}
                            <View style={[st.connRow, { backgroundColor: darkMode ? '#374151' : '#f9fafb', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }]}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: textPrimary }}>App Info</Text>
                                <Text style={{ fontSize: 13, color: textSecondary }}>User ID: {supabaseUser?.id?.slice(0, 12) || 'N/A'}...</Text>
                                <Text style={{ fontSize: 13, color: textSecondary }}>Theme: {themeColor}</Text>
                                <Text style={{ fontSize: 13, color: textSecondary }}>Language: {language}</Text>
                                <Text style={{ fontSize: 13, color: textSecondary }}>Dark Mode: {darkMode ? 'On' : 'Off'}</Text>
                                <Text style={{ fontSize: 13, color: textSecondary }}>Total Users: {allUsers.length}</Text>
                            </View>

                            {/* Actions */}
                            <TouchableOpacity onPress={() => { requestTracker.sent = 0; requestTracker.received = 0; requestTracker.errors = 0; setDebugStats({ sent: 0, received: 0, errors: 0 }); }}
                                style={[st.connRow, { backgroundColor: darkMode ? '#374151' : '#f9fafb', justifyContent: 'center' }]}>
                                <Text style={{ fontSize: 14, fontWeight: '500', color: '#f59e0b' }}>Reset Counters</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Console Logs */}
                        <View style={{ marginTop: 12 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ fontSize: 14, fontWeight: '600', color: textPrimary }}>Console ({debugLogs.length})</Text>
                                <TouchableOpacity onPress={() => { consoleLogs.length = 0; setDebugLogs([]); }}>
                                    <Text style={{ fontSize: 12, color: '#f59e0b' }}>Clear</Text>
                                </TouchableOpacity>
                            </View>
                            <ScrollView style={{ maxHeight: 180, backgroundColor: '#111827', borderRadius: 10, padding: 10 }}>
                                {debugLogs.length === 0 ? (
                                    <Text style={{ color: '#6b7280', fontSize: 12, fontStyle: 'italic' }}>No logs yet...</Text>
                                ) : debugLogs.map((log, i) => (
                                    <View key={i} style={{ flexDirection: 'row', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: '#1f2937' }}>
                                        <Text style={{ fontSize: 10, color: '#6b7280', width: 60, fontFamily: 'monospace' }}>{log.time}</Text>
                                        <Text style={{ fontSize: 10, width: 14, color: log.type === 'error' ? '#ef4444' : log.type === 'warn' ? '#f59e0b' : '#6b7280' }}>
                                            {log.type === 'error' ? '✕' : log.type === 'warn' ? '⚠' : '●'}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: log.type === 'error' ? '#fca5a5' : log.type === 'warn' ? '#fde68a' : '#d1d5db', flex: 1, fontFamily: 'monospace' }} numberOfLines={2}>
                                            {log.message}
                                        </Text>
                                    </View>
                                ))}
                            </ScrollView>
                            {/* Typable Console Input */}
                            <View style={{ flexDirection: 'row', marginTop: 8, gap: 6 }}>
                                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#374151' }}>
                                    <Text style={{ color: '#10b981', fontSize: 13, fontFamily: 'monospace', marginRight: 6 }}>{'>'}</Text>
                                    <TextInput
                                        value={consoleInput}
                                        onChangeText={setConsoleInput}
                                        onSubmitEditing={runConsoleCommand}
                                        placeholder="Type JS command..."
                                        placeholderTextColor="#4b5563"
                                        style={{ flex: 1, color: '#e5e7eb', fontSize: 12, fontFamily: 'monospace', paddingVertical: 8 }}
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        returnKeyType="go"
                                    />
                                </View>
                                <TouchableOpacity onPress={runConsoleCommand} style={{ backgroundColor: '#10b981', borderRadius: 8, paddingHorizontal: 14, justifyContent: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Run</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity onPress={() => setShowDebug(false)} style={[st.fullBtn, { backgroundColor: colors.primary, marginTop: 20 }]}>
                            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    card: { borderRadius: 16, marginBottom: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    sectionLabel: { paddingHorizontal: 24, paddingVertical: 14, fontSize: 14, fontWeight: '600', borderBottomWidth: 1 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1 },
    menuRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16 },
    toggle: { width: 48, height: 26, borderRadius: 13 },
    toggleThumb: { position: 'absolute', top: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
    appIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16 },
    modalCard: { borderRadius: 20, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '600' },
    fullBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
    connRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12, marginBottom: 8 },
    connAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
