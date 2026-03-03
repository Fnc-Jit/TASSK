import { LinearGradient } from 'expo-linear-gradient';
import { Send, Smile, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text, TextInput, TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
    fetchAllUsers,
    fetchChatMessages,
    isUserOnline,
    sendChatMessage,
    subscribeToChatMessages
} from '../../lib/supabase';

interface Message {
    id: string;
    sender_id: string;
    sender_name: string;
    text: string;
    created_at: string;
    type: 'text' | 'image' | 'system';
}

interface Member {
    user_id: string;
    name: string;
    is_active: boolean;
    last_seen: string | null;
}

const quickEmojis = ['👍', '❤️', '😂', '🎉', '🔥', '💯', '👏', '✅'];

const getAvatarColor = (name: string): [string, string] => {
    const colors: [string, string][] = [
        ['#ec4899', '#f43f5e'], ['#3b82f6', '#06b6d4'],
        ['#10b981', '#14b8a6'], ['#f59e0b', '#f97316'],
        ['#8b5cf6', '#6366f1'], ['#ef4444', '#dc2626'],
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
};

const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export default function ChatScreen() {
    const { darkMode, currentUser, colors, supabaseUser, allUsers, t } = useApp();
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [input, setInput] = useState('');
    const [showMembers, setShowMembers] = useState(false);
    const [showEmojis, setShowEmojis] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef<ScrollView>(null);

    const bg = darkMode ? '#111827' : '#ffffff';
    const cardBg = darkMode ? '#1f2937' : '#ffffff';
    const textPrimary = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const inputBg = darkMode ? '#374151' : '#f3f4f6';
    const inputBorder = darkMode ? '#4b5563' : '#e5e7eb';

    const loadMessages = useCallback(async () => {
        const { data } = await fetchChatMessages(100);
        if (data) {
            setMessages(data.map((m: any) => ({
                id: m.id,
                sender_id: m.sender_id,
                sender_name: m.users?.name || 'Unknown',
                text: m.text,
                created_at: m.created_at,
                type: m.type || 'text',
            })));
        }
        setLoading(false);
    }, []);

    const loadMembers = useCallback(() => {
        setMembers(allUsers.map(u => ({
            user_id: u.id,
            name: u.name,
            is_active: u.is_active || false,
            last_seen: u.last_seen || null,
        })));
    }, [allUsers]);

    useEffect(() => {
        loadMessages();
        loadMembers();
    }, [loadMessages, loadMembers]);

    // Auto-refresh online status every 30 seconds by fetching fresh data
    useEffect(() => {
        const interval = setInterval(async () => {
            const { data } = await fetchAllUsers();
            if (data) {
                setMembers(data.map((u: any) => ({
                    user_id: u.id,
                    name: u.name,
                    is_active: u.is_active || false,
                    last_seen: u.last_seen || null,
                })));
            }
        }, 30 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const sub = subscribeToChatMessages((payload) => {
            const m = payload.new as any;
            const senderUser = allUsers.find(u => u.id === m.sender_id);
            setMessages(prev => [...prev, {
                id: m.id,
                sender_id: m.sender_id,
                sender_name: senderUser?.name || 'Unknown',
                text: m.text,
                created_at: m.created_at,
                type: m.type || 'text',
            }]);
        });
        return () => { sub.unsubscribe(); };
    }, [allUsers]);

    useEffect(() => {
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || !supabaseUser) return;
        setInput('');
        setShowEmojis(false);
        await sendChatMessage({
            sender_id: supabaseUser.id,
            text: trimmed,
            type: 'text',
        });
    };

    const onlineCount = members.filter(m => isUserOnline(m.last_seen)).length;

    if (loading) {
        return (
            <SafeAreaView style={{ flex: 1, backgroundColor: bg, justifyContent: 'center', alignItems: 'center' }} edges={['top']}>
                <ActivityIndicator size="large" color={colors.primary} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: bg }} edges={['top']}>
            {/* Header */}
            <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                            <Users size={20} color="#fff" />
                        </View>
                        <View>
                            <Text style={{ fontSize: 18, fontWeight: '600', color: '#fff' }}>{t.groupChat}</Text>
                            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{onlineCount} {t.online} · {members.length} {t.members}</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={() => setShowMembers(true)} style={{ padding: 8, borderRadius: 8 }}>
                        <Users size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Messages */}
            <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: darkMode ? '#111827' : colors.lightBg }}
                contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
                {messages.length === 0 ? (
                    <View style={{ paddingVertical: 60, alignItems: 'center' }}>
                        <Text style={{ color: textSecondary, fontSize: 16 }}>{t.noMessages}</Text>
                        <Text style={{ color: textSecondary, fontSize: 13, marginTop: 4 }}>{t.startConversation}</Text>
                    </View>
                ) : messages.map(msg => {
                    if (msg.type === 'system') {
                        return (
                            <View key={msg.id} style={{ alignItems: 'center', marginVertical: 8 }}>
                                <View style={{ backgroundColor: darkMode ? '#374151' : '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 }}>
                                    <Text style={{ fontSize: 12, color: textSecondary }}>{msg.text}</Text>
                                </View>
                            </View>
                        );
                    }

                    const isMe = msg.sender_id === supabaseUser?.id;

                    return (
                        <View key={msg.id} style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                            <View style={{ flexDirection: isMe ? 'row-reverse' : 'row', gap: 8, maxWidth: '80%' }}>
                                {!isMe && (
                                    <LinearGradient colors={getAvatarColor(msg.sender_name)} style={st.avatar}>
                                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{msg.sender_name.charAt(0)}</Text>
                                    </LinearGradient>
                                )}
                                <View>
                                    {!isMe && (
                                        <Text style={{ fontSize: 11, color: textSecondary, marginBottom: 2, marginLeft: 4 }}>{msg.sender_name}</Text>
                                    )}
                                    {isMe ? (
                                        <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                            style={[st.bubble, st.myBubble]}>
                                            <Text style={{ fontSize: 14, color: '#fff' }}>{msg.text}</Text>
                                            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', textAlign: 'right', marginTop: 4 }}>{formatTime(msg.created_at)}</Text>
                                        </LinearGradient>
                                    ) : (
                                        <View style={[st.bubble, st.otherBubble, { backgroundColor: darkMode ? '#1f2937' : '#fff' }]}>
                                            <Text style={{ fontSize: 14, color: textPrimary }}>{msg.text}</Text>
                                            <Text style={{ fontSize: 10, color: textSecondary, textAlign: 'right', marginTop: 4 }}>{formatTime(msg.created_at)}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Emoji Picker */}
            {showEmojis && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: cardBg, borderTopWidth: 1, borderTopColor: inputBorder }}>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {quickEmojis.map(emoji => (
                            <TouchableOpacity key={emoji} onPress={() => setInput(prev => prev + emoji)} style={{ padding: 8, borderRadius: 8 }}>
                                <Text style={{ fontSize: 24 }}>{emoji}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Input Area */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 12, backgroundColor: cardBg, borderTopWidth: 1, borderTopColor: inputBorder }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <TouchableOpacity onPress={() => setShowEmojis(!showEmojis)} style={{ padding: 8 }}>
                            <Smile size={22} color={showEmojis ? colors.text : textSecondary} />
                        </TouchableOpacity>
                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder={t.typeMessage}
                            placeholderTextColor={textSecondary}
                            style={[st.chatInput, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                        />
                        <TouchableOpacity onPress={handleSend} disabled={!input.trim()} activeOpacity={0.7}>
                            {input.trim() ? (
                                <LinearGradient colors={colors.gradient} style={st.sendBtn}>
                                    <Send size={20} color="#fff" />
                                </LinearGradient>
                            ) : (
                                <View style={[st.sendBtn, { backgroundColor: darkMode ? '#374151' : '#e5e7eb' }]}>
                                    <Send size={20} color={darkMode ? '#6b7280' : '#9ca3af'} />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* Members Modal */}
            <Modal visible={showMembers} transparent animationType="slide">
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: inputBorder }}>
                            <View>
                                <Text style={{ fontSize: 20, fontWeight: '600', color: textPrimary }}>{t.groupMembers}</Text>
                                <Text style={{ fontSize: 14, color: textSecondary }}>{members.length} {t.members}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowMembers(false)}>
                                <X size={24} color={textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ paddingHorizontal: 24, paddingVertical: 12, maxHeight: 400 }}>
                            {members.length === 0 ? (
                                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                                    <Text style={{ color: textSecondary }}>No members found</Text>
                                </View>
                            ) : members.map(member => (
                                <View key={member.user_id} style={[st.memberRow, { backgroundColor: member.user_id === supabaseUser?.id ? (darkMode ? '#374151' : colors.primaryLight) : (darkMode ? 'rgba(55,65,81,0.5)' : '#f9fafb') }]}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                        <View style={{ position: 'relative' }}>
                                            <LinearGradient colors={member.user_id === supabaseUser?.id ? colors.gradient : getAvatarColor(member.name)} style={st.memberAvatar}>
                                                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{member.name.charAt(0)}</Text>
                                            </LinearGradient>
                                            <View style={[st.statusDot, { backgroundColor: isUserOnline(member.last_seen) ? '#22c55e' : '#9ca3af' }]} />
                                        </View>
                                        <View>
                                            <Text style={{ color: textPrimary, fontSize: 15 }}>{member.name}</Text>
                                            <Text style={{ fontSize: 12, color: member.user_id === supabaseUser?.id ? colors.text : (isUserOnline(member.last_seen) ? '#22c55e' : textSecondary) }}>
                                                {member.user_id === supabaseUser?.id ? t.you : (isUserOnline(member.last_seen) ? t.online : t.offline)}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={{ paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: inputBorder }}>
                            <TouchableOpacity onPress={() => setShowMembers(false)} activeOpacity={0.8}>
                                <LinearGradient colors={colors.gradient} style={{ paddingVertical: 14, borderRadius: 16, alignItems: 'center' }}>
                                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{t.close}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const st = StyleSheet.create({
    avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
    bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, maxWidth: '100%' },
    myBubble: { borderBottomRightRadius: 6 },
    otherBubble: { borderBottomLeftRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
    chatInput: { flex: 1, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 },
    sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
    memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 16, marginBottom: 8 },
    memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    statusDot: { position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
});
