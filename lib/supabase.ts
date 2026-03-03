import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://iqtwhrtywrginsrpjmkn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxdHdocnR5d3JnaW5zcnBqbWtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0Njk2ODksImV4cCI6MjA4ODA0NTY4OX0.PkNev0gqUUeB8YzsPh4mlJfxFhJe8waNUnzmpXGVrA0';

// Custom storage adapter for React Native using expo-secure-store
const ExpoSecureStoreAdapter = {
    getItem: async (key: string): Promise<string | null> => {
        try {
            if (Platform.OS === 'web') {
                return localStorage.getItem(key);
            }
            return await SecureStore.getItemAsync(key);
        } catch {
            return null;
        }
    },
    setItem: async (key: string, value: string): Promise<void> => {
        try {
            if (Platform.OS === 'web') {
                localStorage.setItem(key, value);
                return;
            }
            await SecureStore.setItemAsync(key, value);
        } catch {
            // ignore
        }
    },
    removeItem: async (key: string): Promise<void> => {
        try {
            if (Platform.OS === 'web') {
                localStorage.removeItem(key);
                return;
            }
            await SecureStore.deleteItemAsync(key);
        } catch {
            // ignore
        }
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Important for React Native
    },
});
// ==================== REQUEST TRACKER ====================
// Global counters for the debug menu
export const requestTracker = { sent: 0, received: 0, errors: 0 };

// ==================== CONSOLE CAPTURE ====================
export interface ConsoleEntry {
    type: 'log' | 'warn' | 'error';
    message: string;
    time: string;
}
export const consoleLogs: ConsoleEntry[] = [];
const MAX_LOGS = 100;

// Intercept console methods
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

const captureLog = (type: 'log' | 'warn' | 'error', args: any[]) => {
    const message = args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a, null, 0).slice(0, 200) : String(a); }
        catch { return String(a); }
    }).join(' ');
    const now = new Date();
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    consoleLogs.unshift({ type, message: message.slice(0, 300), time });
    if (consoleLogs.length > MAX_LOGS) consoleLogs.pop();
};

console.log = (...args: any[]) => { captureLog('log', args); origLog(...args); };
console.warn = (...args: any[]) => { captureLog('warn', args); origWarn(...args); };
console.error = (...args: any[]) => { captureLog('error', args); origError(...args); };

export async function trackRequest<T>(promise: PromiseLike<{ data: T; error: any }>): Promise<{ data: T; error: any }> {
    requestTracker.sent++;
    const result = await promise;
    if (result.error) {
        requestTracker.errors++;
    } else {
        requestTracker.received++;
    }
    return result;
}

// ==================== DATABASE HELPERS ====================

// ---- Users ----
export async function fetchUserProfile(userId: string) {
    // 1. Fetch user_profiles and the core users table (for name)
    const { data: profileData, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*, users(name)')
        .eq('user_id', userId)
        .single();

    if (profileErr) console.log(`[fetchUserProfile] Profile Error:`, profileErr);

    // 2. Fetch user_settings separately (since it links to users.id, not user_profiles.id)
    const { data: settingsData, error: settingsErr } = await supabase
        .from('user_settings')
        .select('dark_mode, notifications_enabled, theme_color, language')
        .eq('user_id', userId)
        .single();

    if (settingsErr && settingsErr.code !== 'PGRST116') { // Ignore "Row not found" error for settings
        console.log(`[fetchUserProfile] Settings Error:`, settingsErr);
    }

    if (profileData) {
        // Flatten the nested name and attach settings
        const userName = Array.isArray(profileData.users) ? profileData.users[0]?.name : profileData.users?.name;
        return {
            data: {
                ...profileData,
                name: userName,
                settings: settingsData || undefined
            },
            error: null
        };
    }

    return { data: null, error: profileErr };
}

export async function updateUserProfile(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
        .from('user_profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
        .select()
        .single();
    return { data, error };
}

export async function fetchUserSettings(userId: string) {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    return { data, error };
}

export async function updateUserSettings(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
        .from('user_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
    return { data, error };
}

// ---- Tasks ----
export async function fetchTasks(userId: string) {
    return trackRequest(supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${userId},assigned_by.eq.${userId}`)
        .order('created_at', { ascending: false }));
}

export async function createTask(task: {
    title: string;
    description: string;
    assigned_to: string;
    assigned_by: string;
}) {
    const { data, error } = await supabase
        .from('tasks')
        .insert({
            ...task,
            status: 'pending',
        })
        .select()
        .single();
    return { data, error };
}

export async function updateTask(taskId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
        .from('tasks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', taskId)
        .select()
        .single();
    return { data, error };
}

export async function deleteTask(taskId: string) {
    const { data, error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);
    return { data, error };
}

export async function createTaskRedirect(redirect: {
    task_id: string;
    redirected_by: string;
    redirected_from: string;
    redirected_to: string;
    notes: string;
}) {
    const { data, error } = await supabase
        .from('task_redirects')
        .insert(redirect)
        .select()
        .single();
    return { data, error };
}

// ---- Transactions ----
export async function fetchTransactions(userId: string) {
    return trackRequest(supabase
        .from('transactions')
        .select('*')
        .or(`created_by.eq.${userId},person_id.eq.${userId}`)
        .order('created_at', { ascending: false }));
}

export async function createTransaction(transaction: {
    type: 'debt' | 'lending' | 'payment';
    amount: number;
    description: string;
    created_by: string;
    person_id: string;
}) {
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            ...transaction,
            status: 'pending',
        })
        .select()
        .single();
    return { data, error };
}

export async function updateTransaction(txId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', txId)
        .select()
        .single();
    if (error) console.log('updateTransaction error:', error);
    return { data, error };
}

// ---- Transaction Proofs ----
export async function uploadPaymentProof(txId: string, userId: string, fileUri: string) {
    const fileName = `${userId}/${txId}_${Date.now()}.jpg`;

    const response = await fetch(fileUri);
    const blob = await response.blob();

    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, blob, { contentType: 'image/jpeg' });

    if (uploadError) return { data: null, error: uploadError };

    const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

    const { data, error } = await supabase
        .from('transaction_proofs')
        .insert({
            transaction_id: txId,
            uploaded_by: userId,
            image_url: urlData.publicUrl,
        })
        .select()
        .single();

    return { data, error };
}

// ---- Chat ----
export async function fetchChatMessages(limit = 50) {
    return trackRequest(supabase
        .from('chat_messages')
        .select('*, users:sender_id(name)')
        .order('created_at', { ascending: true })
        .limit(limit));
}

export async function sendChatMessage(message: {
    sender_id: string;
    text: string;
    type?: 'text' | 'image' | 'system';
}) {
    const { data, error } = await supabase
        .from('chat_messages')
        .insert({
            ...message,
            type: message.type || 'text',
        })
        .select()
        .single();
    return { data, error };
}

export async function fetchChatMembers() {
    const { data, error } = await supabase
        .from('chat_members')
        .select('*, users:user_id(name, is_active)')
        .eq('is_active', true);
    return { data, error };
}

// ---- Notifications ----
export async function fetchNotifications(userId: string) {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
    return { data, error };
}

export async function markNotificationRead(notifId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notifId);
    return { error };
}

export async function markAllNotificationsRead(userId: string) {
    const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);
    return { error };
}

export async function clearAllNotifications(userId: string) {
    const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);
    return { error };
}

// ---- Connections ----
export async function fetchConnections(userId: string) {
    const { data, error } = await supabase
        .from('connections')
        .select('*, connected_user:connected_user_id(name, is_active)')
        .eq('user_id', userId)
        .eq('status', 'accepted');
    return { data, error };
}

// ---- All Users (for assigning tasks/transactions) ----
export async function fetchAllUsers() {
    // Try with last_seen join first
    const { data, error } = await supabase
        .from('users')
        .select('id, name, email, is_active, user_profiles(last_seen)')
        .eq('is_active', true)
        .order('name');

    if (!error && data) {
        const users = data.map((u: any) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            is_active: u.is_active,
            last_seen: u.user_profiles?.last_seen || null,
        }));
        return { data: users, error: null };
    }

    // Fallback: fetch without last_seen if join fails
    const { data: fb, error: fbErr } = await supabase
        .from('users')
        .select('id, name, email, is_active')
        .eq('is_active', true)
        .order('name');

    const users = fb?.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        is_active: u.is_active,
        last_seen: null,
    })) || [];

    return { data: users, error: fbErr };
}

// ---- Presence ----
export async function updateLastSeen(userId: string) {
    const { error } = await supabase
        .from('user_profiles')
        .upsert({
            user_id: userId,
            last_seen: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    return { error };
}

export function isUserOnline(lastSeen: string | null, minutesThreshold = 5): boolean {
    if (!lastSeen) return false;
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < minutesThreshold * 60 * 1000;
}

// ---- Privacy Settings ----
export async function fetchPrivacySettings(userId: string) {
    const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
    return { data, error };
}

export async function updatePrivacySettings(userId: string, updates: Record<string, any>) {
    const { data, error } = await supabase
        .from('privacy_settings')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
    return { data, error };
}

// ---- Profile Image Upload ----
import { Buffer } from 'buffer';

export async function uploadProfileImage(userId: string, base64: string) {
    const fileName = `${userId}/avatar_${Date.now()}.jpg`;

    try {
        // base-64 -> ArrayBuffer decoding securely in React Native Data
        const buffer = Buffer.from(base64, 'base64');
        const arrayBuffer = new Uint8Array(buffer).buffer; // Cleaner conversion from Buffer to ArrayBuffer

        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profile-images')
            .upload(fileName, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (uploadError) return { url: null, error: uploadError };

        const { data: urlData } = supabase.storage
            .from('profile-images')
            .getPublicUrl(fileName);

        return { url: urlData.publicUrl, error: null };
    } catch (err: any) {
        return { url: null, error: err };
    }
}

// ---- Realtime Subscriptions ----
export function subscribeToChatMessages(callback: (payload: any) => void) {
    return supabase
        .channel('chat_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, callback)
        .subscribe();
}

export function subscribeToNotifications(userId: string, callback: (payload: any) => void) {
    return supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, callback)
        .subscribe();
}

export function subscribeToTasks(userId: string, callback: (payload: any) => void) {
    return supabase
        .channel(`tasks:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, callback)
        .subscribe();
}

export function subscribeToTransactions(userId: string, callback: (payload: any) => void) {
    return supabase
        .channel(`transactions:${userId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, callback)
        .subscribe();
}
