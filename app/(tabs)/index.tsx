import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowRight, CheckCircle,
    CheckSquare,
    ChevronDown,
    DollarSign,
    Plus,
    TrendingDown,
    TrendingUp,
    User,
    X
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import {
    createTask as createTaskDB,
    createTaskRedirect,
    createTransaction as createTransactionDB,
    fetchTasks,
    fetchTransactions,
    subscribeToTasks, subscribeToTransactions,
    updateTask as updateTaskDB,
    updateTransaction as updateTransactionDB
} from '../../lib/supabase';

// ==================== TYPES ====================
interface Task {
    id: string;
    title: string;
    description: string;
    assigned_to: string;
    assigned_by: string;
    status: 'pending' | 'accepted' | 'completed' | 'rejected';
    created_at: string;
    redirect_notes?: string;
    completion_notes?: string;
}

interface Transaction {
    id: string;
    type: 'debt' | 'payment' | 'lending';
    amount: number;
    description: string;
    person_id: string;
    created_by: string;
    created_at: string;
    status: 'pending' | 'completed' | 'rejected';
}

// ==================== TASKS TAB ====================
function TasksTab() {
    const { darkMode, colors, supabaseUser, allUsers, t } = useApp();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNewTask, setShowNewTask] = useState(false);
    const [showRedirect, setShowRedirect] = useState(false);
    const [showComplete, setShowComplete] = useState(false);
    const [showReject, setShowReject] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showCancelledHistory, setShowCancelledHistory] = useState(false);
    const [historyFilter, setHistoryFilter] = useState<'all' | 'my_tasks' | 'assigned_tasks'>('all');
    const [cancelledFilter, setCancelledFilter] = useState<'all' | 'my_tasks' | 'assigned_tasks'>('all');
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [newTask, setNewTask] = useState({ title: '', description: '', assigned_to: '' });
    const [redirectData, setRedirectData] = useState({ assigned_to: '', notes: '' });
    const [completionNotes, setCompletionNotes] = useState('');
    const [rejectNotes, setRejectNotes] = useState('');

    const cardBg = darkMode ? '#1f2937' : '#ffffff';
    const textPrimary = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const inputBg = darkMode ? '#374151' : '#f9fafb';
    const inputBorder = darkMode ? '#4b5563' : '#d1d5db';

    const otherUsers = allUsers.filter(u => u.id !== supabaseUser?.id);

    const loadTasks = useCallback(async () => {
        if (!supabaseUser) return;
        const { data } = await fetchTasks(supabaseUser.id);
        if (data) setTasks(data as Task[]);
        setLoading(false);
        setRefreshing(false);
    }, [supabaseUser]);

    useEffect(() => { loadTasks(); }, [loadTasks]);

    // Realtime subscription
    useEffect(() => {
        if (!supabaseUser) return;
        const sub = subscribeToTasks(supabaseUser.id, () => loadTasks());
        return () => { sub.unsubscribe(); };
    }, [supabaseUser, loadTasks]);

    const getUserName = (id: string) => {
        if (id === supabaseUser?.id) return t.you;
        const u = allUsers.find(x => x.id === id);
        return u?.name || t.unknown;
    };

    const handleAccept = async (id: string) => {
        await updateTaskDB(id, { status: 'accepted' });
        loadTasks();
    };

    const handleReject = async (id: string) => {
        let updateData: any = { status: 'rejected' };
        if (rejectNotes.trim()) {
            updateData.completion_notes = `${t.reject || 'Reject'} Notes: ${rejectNotes.trim()}`;
        }
        const { error } = await updateTaskDB(id, updateData);
        if (error) {
            console.error('Error rejecting task:', error);
            Alert.alert('Error', error.message || 'Failed to reject task. Did you run the SQL command?');
        }
        setShowReject(false);
        setRejectNotes('');
        loadTasks();
    };

    const handleComplete = async (id: string) => {
        await updateTaskDB(id, { status: 'completed', completion_notes: completionNotes });
        setShowComplete(false);
        setSelectedTask(null);
        setCompletionNotes('');
        loadTasks();
    };

    const handleCreate = async () => {
        if (!newTask.title.trim() || !newTask.assigned_to || !supabaseUser) return;
        await createTaskDB({
            title: newTask.title,
            description: newTask.description,
            assigned_to: newTask.assigned_to,
            assigned_by: supabaseUser.id,
        });
        setNewTask({ title: '', description: '', assigned_to: '' });
        setShowNewTask(false);
        loadTasks();
    };

    const handleRedirect = async () => {
        if (!selectedTask || !redirectData.notes.trim() || !redirectData.assigned_to || !supabaseUser) return;
        await createTaskRedirect({
            task_id: selectedTask.id,
            redirected_by: supabaseUser.id,
            redirected_from: selectedTask.assigned_to,
            redirected_to: redirectData.assigned_to,
            notes: redirectData.notes,
        });

        const newDesc = selectedTask.description
            ? `${selectedTask.description}\n\n[Redirected: ${redirectData.notes}]`
            : `[Redirected: ${redirectData.notes}]`;

        await updateTaskDB(selectedTask.id, {
            assigned_to: redirectData.assigned_to,
            description: newDesc,
            status: 'pending',
        });
        setShowRedirect(false);
        setSelectedTask(null);
        setRedirectData({ assigned_to: '', notes: '' });
        loadTasks();
    };

    const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'rejected');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const cancelledTasks = tasks.filter(t => t.status === 'rejected');

    const filteredCompletedTasks = completedTasks.filter(t => {
        if (historyFilter === 'my_tasks') return t.assigned_to === supabaseUser?.id;
        if (historyFilter === 'assigned_tasks') return t.assigned_by === supabaseUser?.id && t.assigned_to !== supabaseUser?.id;
        return true;
    });

    const filteredCancelledTasks = cancelledTasks.filter(t => {
        if (cancelledFilter === 'my_tasks') return t.assigned_to === supabaseUser?.id;
        if (cancelledFilter === 'assigned_tasks') return t.assigned_by === supabaseUser?.id && t.assigned_to !== supabaseUser?.id;
        return true;
    });

    const myTasks = activeTasks.filter(t => t.assigned_to === supabaseUser?.id);
    const assignedTasks = activeTasks.filter(t => t.assigned_by === supabaseUser?.id && t.assigned_to !== supabaseUser?.id);

    const statusBadge = (status: string) => {
        const bg = status === 'pending' ? '#fef9c3' : status === 'accepted' ? '#dbeafe' : status === 'completed' ? '#dcfce7' : '#fee2e2';
        const color = status === 'pending' ? '#a16207' : status === 'accepted' ? '#1d4ed8' : status === 'completed' ? '#15803d' : '#b91c1c';
        const text = status === 'pending' ? t.pending : status === 'accepted' ? t.accepted : status === 'completed' ? t.completed : (t.reject || 'Rejected');
        return <View style={[s.badge, { backgroundColor: bg }]}><Text style={[s.badgeText, { color }]}>{text}</Text></View>;
    };

    const renderTaskCard = (task: Task, isMine: boolean) => (
        <View key={task.id} style={[s.card, { backgroundColor: cardBg }]}>
            <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.cardTitle, { color: textPrimary }]}>{task.title}</Text>
                    <Text style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                        {new Date(task.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </Text>
                </View>
                {statusBadge(task.status)}
            </View>
            {task.description ? <Text style={[s.cardDesc, { color: textSecondary }]}>{task.description}</Text> : null}
            <View style={s.avatarRow}>
                <User size={14} color={textSecondary} />
                <Text style={[s.avatarText, { color: textSecondary }]}>
                    {isMine ? `${t.from}: ${getUserName(task.assigned_by)}` : `${t.assignedTo}: ${getUserName(task.assigned_to)}`}
                </Text>
            </View>
            {task.completion_notes ? (
                <View style={[s.noteBox, { backgroundColor: '#dcfce7' }]}>
                    <CheckCircle size={14} color="#15803d" />
                    <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, color: '#15803d', fontWeight: '500', marginBottom: 2 }}>{t.completionNotes}</Text>
                        <Text style={[s.noteText, { color: textPrimary }]}>{task.completion_notes}</Text>
                    </View>
                </View>
            ) : null}
            {isMine && task.status === 'pending' && (
                <View style={s.buttonRow}>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#22c55e' }]} onPress={() => handleAccept(task.id)}>
                        <Text style={s.actionBtnText}>{t.accept}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.actionBtn, { backgroundColor: '#ef4444' }]} onPress={() => { setSelectedTask(task); setShowReject(true); }}>
                        <Text style={s.actionBtnText}>{t.reject || 'Reject'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[s.actionBtn, { backgroundColor: darkMode ? '#374151' : '#e5e7eb' }]}
                        onPress={() => { setSelectedTask(task); setShowRedirect(true); }}
                    >
                        <ArrowRight size={14} color={darkMode ? '#d1d5db' : '#374151'} />
                        <Text style={[s.actionBtnText, { color: darkMode ? '#d1d5db' : '#374151' }]}>{t.redirect}</Text>
                    </TouchableOpacity>
                </View>
            )}
            {isMine && task.status === 'accepted' && (
                <TouchableOpacity
                    style={[s.actionBtn, { backgroundColor: colors.primary, flex: 1 }]}
                    onPress={() => { setSelectedTask(task); setShowComplete(true); }}
                >
                    <CheckCircle size={14} color="#fff" />
                    <Text style={s.actionBtnText}>{t.markComplete}</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTasks(); }} tintColor={colors.primary} />}
            >
                <TouchableOpacity onPress={() => setShowNewTask(true)} activeOpacity={0.8}>
                    <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.createBtn}>
                        <Plus size={20} color="#fff" />
                        <Text style={s.createBtnText}>{t.createNewTask}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={[s.sectionTitle, { color: textSecondary }]}>{t.myTasks}</Text>
                {myTasks.length === 0 ? (
                    <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>{t.noTasksAssigned}</Text></View>
                ) : myTasks.map(tk => renderTaskCard(tk, true))}

                <Text style={[s.sectionTitle, { color: textSecondary, marginTop: 24 }]}>{t.tasksIAssigned}</Text>
                {assignedTasks.length === 0 ? (
                    <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>{t.noTasksBy}</Text></View>
                ) : assignedTasks.map(tk => renderTaskCard(tk, false))}

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginTop: 24, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: inputBorder }}
                    onPress={() => setShowHistory(!showHistory)}
                >
                    <Text style={[s.sectionTitle, { color: textSecondary, marginTop: 0 }]}>Task History ({completedTasks.length})</Text>
                    <ChevronDown size={20} color={textSecondary} style={{ transform: [{ rotate: showHistory ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {showHistory && (
                    <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            {(['all', 'my_tasks', 'assigned_tasks'] as const).map(filter => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setHistoryFilter(filter)}
                                    style={[s.chip, {
                                        backgroundColor: historyFilter === filter ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'),
                                        borderColor: historyFilter === filter ? colors.primary : inputBorder,
                                        paddingVertical: 6, paddingHorizontal: 12
                                    }]}
                                >
                                    <Text style={{
                                        color: historyFilter === filter ? '#fff' : textPrimary,
                                        fontSize: 12, fontWeight: historyFilter === filter ? '600' : '400'
                                    }}>
                                        {filter === 'all' ? 'All' : filter === 'my_tasks' ? t.myTasks : t.tasksIAssigned}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {filteredCompletedTasks.length === 0 ? (
                            <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>No completed tasks</Text></View>
                        ) : filteredCompletedTasks.map(tk => renderTaskCard(tk, tk.assigned_to === supabaseUser?.id))}
                    </View>
                )}

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginTop: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: inputBorder }}
                    onPress={() => setShowCancelledHistory(!showCancelledHistory)}
                >
                    <Text style={[s.sectionTitle, { color: textSecondary, marginTop: 0 }]}>Cancelled History ({cancelledTasks.length})</Text>
                    <ChevronDown size={20} color={textSecondary} style={{ transform: [{ rotate: showCancelledHistory ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {showCancelledHistory && (
                    <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            {(['all', 'my_tasks', 'assigned_tasks'] as const).map(filter => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setCancelledFilter(filter)}
                                    style={[s.chip, {
                                        backgroundColor: cancelledFilter === filter ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'),
                                        borderColor: cancelledFilter === filter ? colors.primary : inputBorder,
                                        paddingVertical: 6, paddingHorizontal: 12
                                    }]}
                                >
                                    <Text style={{
                                        color: cancelledFilter === filter ? '#fff' : textPrimary,
                                        fontSize: 12, fontWeight: cancelledFilter === filter ? '600' : '400'
                                    }}>
                                        {filter === 'all' ? 'All' : filter === 'my_tasks' ? t.myTasks : t.tasksIAssigned}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {filteredCancelledTasks.length === 0 ? (
                            <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>No cancelled tasks</Text></View>
                        ) : filteredCancelledTasks.map(tk => renderTaskCard(tk, tk.assigned_to === supabaseUser?.id))}
                    </View>
                )}
            </ScrollView>

            {/* New Task Modal */}
            <Modal visible={showNewTask} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textPrimary }]}>{t.createNewTask}</Text>
                            <TouchableOpacity onPress={() => setShowNewTask(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={[s.label, { color: textSecondary }]}>{t.taskTitle}</Text>
                        <TextInput value={newTask.title} onChangeText={v => setNewTask({ ...newTask, title: v })} placeholder={t.enterTaskTitle} placeholderTextColor="#9ca3af" style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <Text style={[s.label, { color: textSecondary }]}>{t.description}</Text>
                        <TextInput value={newTask.description} onChangeText={v => setNewTask({ ...newTask, description: v })} placeholder={t.enterDescription} placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={[s.input, s.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <Text style={[s.label, { color: textSecondary }]}>{t.assignTo}</Text>
                        {otherUsers.length === 0 ? (
                            <Text style={{ color: textSecondary, fontSize: 13, marginBottom: 16 }}>{t.noUsersFound}</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {otherUsers.map(u => (
                                    <TouchableOpacity key={u.id} onPress={() => setNewTask({ ...newTask, assigned_to: u.id })}
                                        style={[s.chip, { backgroundColor: newTask.assigned_to === u.id ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'), borderColor: newTask.assigned_to === u.id ? colors.primary : inputBorder }]}>
                                        <Text style={{ color: newTask.assigned_to === u.id ? '#fff' : textPrimary, fontSize: 13 }}>{u.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity onPress={handleCreate} disabled={!newTask.title.trim() || !newTask.assigned_to} style={[s.fullBtn, { backgroundColor: newTask.title.trim() && newTask.assigned_to ? colors.primary : '#d1d5db' }]}>
                            <Text style={s.fullBtnText}>{t.createNewTask}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Redirect Modal */}
            <Modal visible={showRedirect} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textPrimary }]}>{t.redirectTask}</Text>
                            <TouchableOpacity onPress={() => { setShowRedirect(false); setSelectedTask(null); }}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {selectedTask && <View style={[s.infoBox, { backgroundColor: darkMode ? '#374151' : '#f9fafb' }]}><Text style={{ color: textPrimary, fontSize: 14 }}>{selectedTask.title}</Text></View>}
                        <Text style={[s.label, { color: textSecondary }]}>{t.redirectTo}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {otherUsers.map(u => (
                                <TouchableOpacity key={u.id} onPress={() => setRedirectData({ ...redirectData, assigned_to: u.id })}
                                    style={[s.chip, { backgroundColor: redirectData.assigned_to === u.id ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'), borderColor: redirectData.assigned_to === u.id ? colors.primary : inputBorder }]}>
                                    <Text style={{ color: redirectData.assigned_to === u.id ? '#fff' : textPrimary, fontSize: 13 }}>{u.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <Text style={[s.label, { color: textSecondary }]}>{t.notesRequired}</Text>
                        <TextInput value={redirectData.notes} onChangeText={v => setRedirectData({ ...redirectData, notes: v })} placeholder={t.addRedirectNote} placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={[s.input, s.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <TouchableOpacity onPress={handleRedirect} disabled={!redirectData.notes.trim() || !redirectData.assigned_to} style={[s.fullBtn, { backgroundColor: redirectData.notes.trim() && redirectData.assigned_to ? colors.primary : '#d1d5db' }]}>
                            <Text style={s.fullBtnText}>{t.redirectTask}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Complete Modal */}
            <Modal visible={showComplete} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textPrimary }]}>{t.completeTask}</Text>
                            <TouchableOpacity onPress={() => { setShowComplete(false); setSelectedTask(null); }}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {selectedTask && <View style={[s.infoBox, { backgroundColor: darkMode ? '#374151' : '#f9fafb' }]}><Text style={{ color: textPrimary, fontSize: 14 }}>{selectedTask.title}</Text></View>}
                        <Text style={[s.label, { color: textSecondary }]}>{t.completionNotesReq}</Text>
                        <TextInput value={completionNotes} onChangeText={setCompletionNotes} placeholder={t.addCompletionNote} placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={[s.input, s.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <TouchableOpacity onPress={() => selectedTask && handleComplete(selectedTask.id)} disabled={!completionNotes.trim()} style={[s.fullBtn, { backgroundColor: completionNotes.trim() ? colors.primary : '#d1d5db' }]}>
                            <Text style={s.fullBtnText}>{t.completeTask}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Reject Modal */}
            <Modal visible={showReject} transparent animationType="fade">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: '#ef4444' }]}>{t.reject || 'Reject Task'}</Text>
                            <TouchableOpacity onPress={() => setShowReject(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={[s.label, { color: textSecondary }]}>Reason / Notes (Optional)</Text>
                        <TextInput value={rejectNotes} onChangeText={setRejectNotes} placeholder="Why are you rejecting this?" placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={[s.input, s.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <TouchableOpacity style={[s.fullBtn, { backgroundColor: '#ef4444' }]} onPress={() => selectedTask && handleReject(selectedTask.id)}>
                            <Text style={s.fullBtnText}>{t.reject || 'Reject'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ==================== MONEY TAB ====================
function MoneyTab() {
    const { darkMode, colors, supabaseUser, allUsers, t } = useApp();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [newTx, setNewTx] = useState({ type: 'debt' as any, amount: '', description: '', person_id: '' });

    const [payTx, setPayTx] = useState<Transaction | null>(null);
    const [payDetails, setPayDetails] = useState({ upiId: '', notes: '' });
    const [paying, setPaying] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [paymentHistoryFilter, setPaymentHistoryFilter] = useState<'all' | 'paid_by_me' | 'paid_to_me'>('all');
    const [rejectTx, setRejectTx] = useState<Transaction | null>(null);
    const [secretCode, setSecretCode] = useState('');
    const [secretError, setSecretError] = useState('');
    const [showRejectHistory, setShowRejectHistory] = useState(false);

    const cardBg = darkMode ? '#1f2937' : '#ffffff';
    const textPrimary = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const inputBg = darkMode ? '#374151' : '#f9fafb';
    const inputBorder = darkMode ? '#4b5563' : '#d1d5db';

    const otherUsers = allUsers.filter(u => u.id !== supabaseUser?.id);

    const loadTransactions = useCallback(async () => {
        if (!supabaseUser) return;
        const { data } = await fetchTransactions(supabaseUser.id);
        if (data) setTransactions(data as Transaction[]);
        setLoading(false);
        setRefreshing(false);
    }, [supabaseUser]);

    useEffect(() => { loadTransactions(); }, [loadTransactions]);

    useEffect(() => {
        if (!supabaseUser) return;
        const sub = subscribeToTransactions(supabaseUser.id, () => loadTransactions());
        return () => { sub.unsubscribe(); };
    }, [supabaseUser, loadTransactions]);

    const getUserName = (id: string) => {
        if (id === supabaseUser?.id) return t.you;
        const u = allUsers.find(x => x.id === id);
        return u?.name || t.unknown;
    };

    const handleCreate = async () => {
        if (!newTx.amount || !newTx.description.trim() || !newTx.person_id || !supabaseUser) return;
        await createTransactionDB({
            type: newTx.type,
            amount: parseFloat(newTx.amount),
            description: newTx.description,
            created_by: supabaseUser.id,
            person_id: newTx.person_id,
        });
        setNewTx({ type: 'debt', amount: '', description: '', person_id: '' });
        setShowNew(false);
        loadTransactions();
    };

    const handlePayment = async () => {
        if (!payTx || !supabaseUser) return;
        setPaying(true);
        let newDesc = payTx.description;
        const extras = [];
        if (payDetails.upiId) extras.push(`UPI: ${payDetails.upiId}`);
        if (payDetails.notes) extras.push(`Notes: ${payDetails.notes}`);
        if (extras.length > 0) newDesc += `\n\n[Paid - ${extras.join(' | ')}]`;

        await updateTransactionDB(payTx.id, {
            status: 'completed',
            description: newDesc
        });

        setPaying(false);
        setPayTx(null);
        setPayDetails({ upiId: '', notes: '' });
        loadTransactions();
    };

    const handleRejectPayment = async () => {
        if (!rejectTx || !supabaseUser) return;
        setSecretError('');
        if (secretCode !== 'X570') {
            setSecretError('Incorrect secret code. Try again.');
            return;
        }

        const { error } = await updateTransactionDB(rejectTx.id, {
            status: 'rejected'
        });

        if (error) {
            console.error('Error rejecting payment:', error);
            Alert.alert('Database Error', 'Could not reject payment. You may need to run this SQL in Supabase: ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check; ALTER TABLE public.transactions ADD CONSTRAINT transactions_status_check CHECK (status IN (\'pending\', \'completed\', \'rejected\'));');
        }

        setRejectTx(null);
        setSecretCode('');
        setSecretError('');
        loadTransactions();
    };

    const activeTransactions = transactions.filter(tx => tx.status === 'pending');
    const completedTransactions = transactions.filter(tx => tx.status === 'completed' || tx.type === 'payment');
    const rejectedTransactions = transactions.filter(tx => tx.status === 'rejected');

    const activeDebts = activeTransactions.filter(tx =>
        (tx.type === 'debt' && tx.created_by === supabaseUser?.id) ||
        (tx.type === 'lending' && tx.person_id === supabaseUser?.id)
    );
    const activeLendings = activeTransactions.filter(tx =>
        (tx.type === 'lending' && tx.created_by === supabaseUser?.id) ||
        (tx.type === 'debt' && tx.person_id === supabaseUser?.id)
    );

    const filteredCompletedTransactions = completedTransactions.filter(tx => {
        if (paymentHistoryFilter === 'all') return true;
        const paidByMe = (tx.type === 'debt' && tx.created_by === supabaseUser?.id) || (tx.type === 'lending' && tx.person_id === supabaseUser?.id) || (tx.type === 'payment' && tx.created_by === supabaseUser?.id);
        const paidToMe = (tx.type === 'lending' && tx.created_by === supabaseUser?.id) || (tx.type === 'debt' && tx.person_id === supabaseUser?.id) || (tx.type === 'payment' && tx.person_id === supabaseUser?.id);
        if (paymentHistoryFilter === 'paid_by_me') return paidByMe;
        if (paymentHistoryFilter === 'paid_to_me') return paidToMe;
        return true;
    });

    const totalOwed = activeDebts.reduce((sum, tx) => sum + tx.amount, 0);
    const totalLent = activeLendings.reduce((sum, tx) => sum + tx.amount, 0);
    const netBalance = totalLent - totalOwed;

    const txCard = (tx: Transaction, color: string, prefix: string, showPay: boolean = false) => {
        const otherPersonId = tx.created_by === supabaseUser?.id ? tx.person_id : tx.created_by;
        return (
            <View key={tx.id} style={[s.card, { backgroundColor: cardBg }]}>
                <View style={s.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.cardTitle, { color: textPrimary }]}>{tx.description}</Text>
                        <Text style={{ fontSize: 13, color: textSecondary }}>{prefix}: {getUserName(otherPersonId)}</Text>
                        <Text style={{ fontSize: 11, color: textSecondary, marginTop: 4 }}>
                            {new Date(tx.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 16, fontWeight: '600', color }}>{prefix === 'To' ? '-' : prefix === 'From' ? '+' : ''}₹{Number(tx.amount.toFixed(2))}</Text>
                        <View style={[s.badge, { backgroundColor: tx.status === 'pending' ? '#fef9c3' : tx.status === 'completed' ? '#dcfce7' : '#fee2e2', marginTop: 4 }]}>
                            <Text style={[s.badgeText, { color: tx.status === 'pending' ? '#a16207' : tx.status === 'completed' ? '#15803d' : '#ef4444' }]}>{tx.status}</Text>
                        </View>
                    </View>
                </View>
                {showPay && tx.status === 'pending' && (
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                        <TouchableOpacity onPress={() => setPayTx(tx)} style={{ flex: 1, backgroundColor: colors.primary, padding: 10, borderRadius: 8, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>{t.payNow || 'Pay Now'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setRejectTx(tx)} style={{ flex: 1, backgroundColor: '#ef4444', padding: 10, borderRadius: 8, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontWeight: '600' }}>{t.reject || 'Reject'}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={colors.primary} /></View>;
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadTransactions(); }} tintColor={colors.primary} />}
            >
                {/* Summary Cards */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                    <LinearGradient colors={['#ef4444', '#dc2626']} style={[s.summaryCard, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <TrendingDown size={16} color="#fff" />
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{t.iOwe}</Text>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>₹{Number(totalOwed.toFixed(2))}</Text>
                    </LinearGradient>
                    <LinearGradient colors={['#22c55e', '#16a34a']} style={[s.summaryCard, { flex: 1 }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <TrendingUp size={16} color="#fff" />
                            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{t.imOwed}</Text>
                        </View>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: '#fff' }}>₹{Number(totalLent.toFixed(2))}</Text>
                    </LinearGradient>
                </View>

                {/* Net Balance */}
                <View style={[s.card, { backgroundColor: netBalance >= 0 ? '#f0fdf4' : '#fef2f2', marginBottom: 16 }]}>
                    <Text style={{ fontSize: 13, color: textSecondary, marginBottom: 4 }}>{t.netBalance}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <Text style={{ fontSize: 24, fontWeight: '700', color: netBalance >= 0 ? '#16a34a' : '#dc2626' }}>₹{Number(Math.abs(netBalance).toFixed(2))}</Text>
                        <Text style={{ fontSize: 13, color: netBalance >= 0 ? '#16a34a' : '#dc2626' }}>{netBalance >= 0 ? t.inYourFavor : t.youOwe}</Text>
                    </View>
                </View>

                <TouchableOpacity onPress={() => setShowNew(true)} activeOpacity={0.8}>
                    <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.createBtn}>
                        <Plus size={20} color="#fff" />
                        <Text style={s.createBtnText}>{t.addTransaction}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={[s.sectionTitle, { color: textSecondary }]}>{t.iOwe}</Text>
                {activeDebts.length === 0 ? <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>{t.noDebts}</Text></View> : activeDebts.map(tx => txCard(tx, '#dc2626', 'To', true))}

                <Text style={[s.sectionTitle, { color: textSecondary, marginTop: 24 }]}>{t.imOwed}</Text>
                {activeLendings.length === 0 ? <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>{t.noLendings}</Text></View> : activeLendings.map(tx => txCard(tx, '#16a34a', 'From'))}

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginTop: 24, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: inputBorder }}
                    onPress={() => setShowPaymentHistory(!showPaymentHistory)}
                >
                    <Text style={[s.sectionTitle, { color: textSecondary, marginTop: 0 }]}>{t.paymentHistory} ({completedTransactions.length})</Text>
                    <ChevronDown size={20} color={textSecondary} style={{ transform: [{ rotate: showPaymentHistory ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {showPaymentHistory && (
                    <View style={{ marginTop: 12 }}>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            {(['all', 'paid_by_me', 'paid_to_me'] as const).map(filter => (
                                <TouchableOpacity
                                    key={filter}
                                    onPress={() => setPaymentHistoryFilter(filter)}
                                    style={[s.chip, {
                                        backgroundColor: paymentHistoryFilter === filter ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'),
                                        borderColor: paymentHistoryFilter === filter ? colors.primary : inputBorder,
                                        paddingVertical: 6, paddingHorizontal: 12
                                    }]}
                                >
                                    <Text style={{
                                        color: paymentHistoryFilter === filter ? '#fff' : textPrimary,
                                        fontSize: 12, fontWeight: paymentHistoryFilter === filter ? '600' : '400'
                                    }}>
                                        {filter === 'all' ? 'All' : filter === 'paid_by_me' ? 'Paid by me' : 'Paid to me'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {filteredCompletedTransactions.length === 0 ? (
                            <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>No payment history</Text></View>
                        ) : filteredCompletedTransactions.map(tx => {
                            const isPaidByMe = (tx.type === 'debt' && tx.created_by === supabaseUser?.id) || (tx.type === 'lending' && tx.person_id === supabaseUser?.id) || (tx.type === 'payment' && tx.created_by === supabaseUser?.id);
                            const pfx = tx.type === 'payment' ? 'With' : (isPaidByMe ? 'To' : 'From');
                            const clr = tx.type === 'payment' ? textPrimary : (isPaidByMe ? '#dc2626' : '#16a34a');
                            return txCard(tx, clr, pfx);
                        })}
                    </View>
                )}

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, marginTop: 24, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: inputBorder }}
                    onPress={() => setShowRejectHistory(!showRejectHistory)}
                >
                    <Text style={[s.sectionTitle, { color: '#ef4444', marginTop: 0 }]}>Rejected Payments ({rejectedTransactions.length})</Text>
                    <ChevronDown size={20} color={textSecondary} style={{ transform: [{ rotate: showRejectHistory ? '180deg' : '0deg' }] }} />
                </TouchableOpacity>

                {showRejectHistory && (
                    <View style={{ marginTop: 12 }}>
                        {rejectedTransactions.length === 0 ? (
                            <View style={[s.emptyCard, { backgroundColor: cardBg }]}><Text style={{ color: textSecondary }}>No rejected payments</Text></View>
                        ) : rejectedTransactions.map(tx => {
                            const isPaidByMe = (tx.type === 'debt' && tx.created_by === supabaseUser?.id) || (tx.type === 'lending' && tx.person_id === supabaseUser?.id) || (tx.type === 'payment' && tx.created_by === supabaseUser?.id);
                            const pfx = tx.type === 'payment' ? 'With' : (isPaidByMe ? 'To' : 'From');
                            return txCard(tx, '#ef4444', pfx);
                        })}
                    </View>
                )}
            </ScrollView>

            {/* New Transaction Modal */}
            <Modal visible={showNew} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textPrimary }]}>{t.addTransaction}</Text>
                            <TouchableOpacity onPress={() => setShowNew(false)}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        <Text style={[s.label, { color: textSecondary }]}>{t.type}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <TouchableOpacity onPress={() => setNewTx({ ...newTx, type: 'debt' })} style={[s.chip, { flex: 1, backgroundColor: newTx.type === 'debt' ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'), borderColor: newTx.type === 'debt' ? colors.primary : inputBorder }]}>
                                <Text style={{ color: newTx.type === 'debt' ? '#fff' : textPrimary, fontSize: 13, textAlign: 'center' }}>{t.iOwe}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setNewTx({ ...newTx, type: 'lending' })} style={[s.chip, { flex: 1, backgroundColor: newTx.type === 'lending' ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'), borderColor: newTx.type === 'lending' ? colors.primary : inputBorder }]}>
                                <Text style={{ color: newTx.type === 'lending' ? '#fff' : textPrimary, fontSize: 13, textAlign: 'center' }}>{t.imOwed}</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[s.label, { color: textSecondary }]}>{t.amount}</Text>
                        <TextInput value={newTx.amount} onChangeText={v => setNewTx({ ...newTx, amount: v })} placeholder="0.00" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <Text style={[s.label, { color: textSecondary }]}>{t.description}</Text>
                        <TextInput value={newTx.description} onChangeText={v => setNewTx({ ...newTx, description: v })} placeholder={t.whatIsThisFor} placeholderTextColor="#9ca3af" multiline numberOfLines={3} style={[s.input, s.textarea, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />
                        <Text style={[s.label, { color: textSecondary }]}>{t.person}</Text>
                        {otherUsers.length === 0 ? (
                            <Text style={{ color: textSecondary, fontSize: 13, marginBottom: 16 }}>{t.noUsersFound}</Text>
                        ) : (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {otherUsers.map(u => (
                                    <TouchableOpacity key={u.id} onPress={() => setNewTx({ ...newTx, person_id: u.id })}
                                        style={[s.chip, { backgroundColor: newTx.person_id === u.id ? colors.primary : (darkMode ? '#374151' : '#f3f4f6'), borderColor: newTx.person_id === u.id ? colors.primary : inputBorder }]}>
                                        <Text style={{ color: newTx.person_id === u.id ? '#fff' : textPrimary, fontSize: 13 }}>{u.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                        <TouchableOpacity onPress={handleCreate} disabled={!newTx.amount || !newTx.description.trim() || !newTx.person_id} style={[s.fullBtn, { backgroundColor: newTx.amount && newTx.description.trim() && newTx.person_id ? colors.primary : '#d1d5db' }]}>
                            <Text style={s.fullBtnText}>{t.addTransaction}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Pay Transaction Modal */}
            <Modal visible={!!payTx} transparent animationType="slide">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: textPrimary }]}>{t.payNow || 'Pay Now'}</Text>
                            <TouchableOpacity onPress={() => { setPayTx(null); setPayDetails({ upiId: '', notes: '' }); }}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {payTx && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 24, fontWeight: '700', color: textPrimary, marginBottom: 4 }}>₹{payTx.amount}</Text>
                                <Text style={{ color: textSecondary }}>To: {getUserName(payTx.created_by === supabaseUser?.id ? payTx.person_id : payTx.created_by)}</Text>
                            </View>
                        )}
                        <Text style={[s.label, { color: textSecondary }]}>{t.upiIdOptional || 'UPI ID (Optional)'}</Text>
                        <TextInput value={payDetails.upiId} onChangeText={v => setPayDetails({ ...payDetails, upiId: v })} placeholder="user@upi" placeholderTextColor="#9ca3af" autoCapitalize="none" style={[s.input, { backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />

                        <Text style={[s.label, { color: textSecondary }]}>{t.notesOptional || 'Notes (Optional)'}</Text>
                        <TextInput value={payDetails.notes} onChangeText={v => setPayDetails({ ...payDetails, notes: v })} placeholder="Transaction reference..." placeholderTextColor="#9ca3af" multiline numberOfLines={2} style={[s.input, s.textarea, { height: 80, backgroundColor: inputBg, borderColor: inputBorder, color: textPrimary }]} />

                        <TouchableOpacity onPress={handlePayment} disabled={paying} style={[s.fullBtn, { backgroundColor: colors.primary }]}>
                            {paying ? <ActivityIndicator color="#fff" /> : <Text style={s.fullBtnText}>{t.submitPayment || 'Submit Payment'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Reject Payment Modal */}
            <Modal visible={!!rejectTx} transparent animationType="fade">
                <View style={s.overlay}>
                    <View style={[s.modalCard, { backgroundColor: cardBg }]}>
                        <View style={s.modalHeader}>
                            <Text style={[s.modalTitle, { color: '#ef4444' }]}>Reject Payment</Text>
                            <TouchableOpacity onPress={() => { setRejectTx(null); setSecretCode(''); }}><X size={24} color={textSecondary} /></TouchableOpacity>
                        </View>
                        {rejectTx && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={{ fontSize: 14, color: textPrimary, marginBottom: 4 }}>Are you sure you want to reject this ₹{rejectTx.amount} debt?</Text>
                            </View>
                        )}
                        <Text style={[s.label, { color: textSecondary }]}>Secret Code Required</Text>
                        <TextInput
                            value={secretCode}
                            onChangeText={setSecretCode}
                            placeholder="Enter code..."
                            placeholderTextColor="#9ca3af"
                            secureTextEntry
                            style={[s.input, { backgroundColor: inputBg, borderColor: secretError ? '#ef4444' : inputBorder, color: textPrimary, marginBottom: secretError ? 4 : 16 }]}
                        />
                        {!!secretError && <Text style={{ color: '#ef4444', fontSize: 13, marginBottom: 16 }}>{secretError}</Text>}
                        <TouchableOpacity onPress={handleRejectPayment} disabled={!secretCode.trim()} style={[s.fullBtn, { backgroundColor: secretCode.trim() ? '#ef4444' : '#d1d5db' }]}>
                            <Text style={s.fullBtnText}>Reject Payment</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ==================== HOME SCREEN ====================
export default function HomeScreen() {
    const { darkMode, colors, t } = useApp();
    const [activeTab, setActiveTab] = useState<'tasks' | 'money'>('tasks');

    const tabBarBg = darkMode ? '#1f2937' : '#ffffff';
    const inactiveColor = darkMode ? '#9ca3af' : '#6b7280';

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: darkMode ? '#111827' : colors.lightBg }} edges={['top']}>
            <LinearGradient colors={colors.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 }}>
                <Text style={{ fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 }}>{t.taskx}</Text>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>{t.manageTasksFinances}</Text>
            </LinearGradient>

            <View style={{ backgroundColor: tabBarBg, flexDirection: 'row' }}>
                <TouchableOpacity onPress={() => setActiveTab('tasks')}
                    style={[s.tabBtn, activeTab === 'tasks' && { borderBottomColor: colors.primary }]}>
                    <CheckSquare size={20} color={activeTab === 'tasks' ? colors.text : inactiveColor} />
                    <Text style={{ color: activeTab === 'tasks' ? colors.text : inactiveColor, fontWeight: '500' }}>{t.tasks}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setActiveTab('money')}
                    style={[s.tabBtn, activeTab === 'money' && { borderBottomColor: colors.primary }]}>
                    <DollarSign size={20} color={activeTab === 'money' ? colors.text : inactiveColor} />
                    <Text style={{ color: activeTab === 'money' ? colors.text : inactiveColor, fontWeight: '500' }}>{t.money}</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flex: 1, backgroundColor: darkMode ? '#111827' : colors.lightBg }}>
                {activeTab === 'tasks' ? <TasksTab /> : <MoneyTab />}
            </View>
        </SafeAreaView>
    );
}

// ==================== STYLES ====================
const s = StyleSheet.create({
    card: { borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardTitle: { fontSize: 16, fontWeight: '600' },
    cardDesc: { fontSize: 14, marginBottom: 8 },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
    badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
    avatarText: { fontSize: 12 },
    noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 10, marginBottom: 12 },
    noteText: { fontSize: 13, flex: 1 },
    buttonRow: { flexDirection: 'row', gap: 8 },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
    actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '500' },
    createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    createBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    emptyCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 12 },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 16 },
    modalCard: { borderRadius: 20, padding: 24 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '600' },
    label: { fontSize: 13, marginBottom: 6 },
    input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
    textarea: { minHeight: 80, textAlignVertical: 'top' },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
    fullBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 4 },
    fullBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    infoBox: { padding: 14, borderRadius: 10, marginBottom: 16 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    summaryCard: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3 },
});
