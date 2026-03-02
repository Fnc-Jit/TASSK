import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { supabase, fetchUserProfile, fetchNotifications as fetchNotifs, fetchAllUsers } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Language, getTranslations, TranslationKeys, languageNames } from '../lib/i18n';

// ==================== TYPES ====================
export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  location: string;
  joinDate: string;
  profileImage: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'task' | 'money' | 'system';
}

export interface ThemeColors {
  gradient: [string, string];
  primary: string;
  primaryLight: string;
  primaryDark: string;
  text: string;
  lightBg: string;
  shadow: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  is_active: boolean;
}

interface AppContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
  themeColor: string;
  setThemeColor: (value: string) => void;
  colors: ThemeColors;
  isLoggedIn: boolean;
  currentUser: UserProfile | null;
  supabaseUser: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
  notifications: Notification[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  clearNotifications: () => void;
  unreadCount: number;
  allUsers: AppUser[];
  isLoading: boolean;
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
}

const AppContext = createContext<AppContextType | undefined>(undefined);



// ==================== THEME ====================
function getThemeColors(color: string): ThemeColors {
  const themes: Record<string, ThemeColors> = {
    violet: {
      gradient: ['#7c3aed', '#9333ea'],
      primary: '#7c3aed',
      primaryLight: '#ede9fe',
      primaryDark: '#6d28d9',
      text: '#7c3aed',
      lightBg: '#f5f3ff',
      shadow: 'rgba(124, 58, 237, 0.25)',
    },
    blue: {
      gradient: ['#2563eb', '#0891b2'],
      primary: '#2563eb',
      primaryLight: '#dbeafe',
      primaryDark: '#1d4ed8',
      text: '#2563eb',
      lightBg: '#eff6ff',
      shadow: 'rgba(37, 99, 235, 0.25)',
    },
    emerald: {
      gradient: ['#059669', '#0d9488'],
      primary: '#059669',
      primaryLight: '#d1fae5',
      primaryDark: '#047857',
      text: '#059669',
      lightBg: '#ecfdf5',
      shadow: 'rgba(5, 150, 105, 0.25)',
    },
    rose: {
      gradient: ['#e11d48', '#db2777'],
      primary: '#e11d48',
      primaryLight: '#ffe4e6',
      primaryDark: '#be123c',
      text: '#e11d48',
      lightBg: '#fff1f2',
      shadow: 'rgba(225, 29, 72, 0.25)',
    },
    amber: {
      gradient: ['#d97706', '#ea580c'],
      primary: '#d97706',
      primaryLight: '#fef3c7',
      primaryDark: '#b45309',
      text: '#d97706',
      lightBg: '#fffbeb',
      shadow: 'rgba(217, 119, 6, 0.25)',
    },
    indigo: {
      gradient: ['#4f46e5', '#2563eb'],
      primary: '#4f46e5',
      primaryLight: '#e0e7ff',
      primaryDark: '#4338ca',
      text: '#4f46e5',
      lightBg: '#eef2ff',
      shadow: 'rgba(79, 70, 229, 0.25)',
    },
  };
  return themes[color] || themes.violet;
}

// ==================== PROVIDER ====================
export function AppProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [themeColor, setThemeColor] = useState('violet');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [language, setLanguage] = useState<Language>('en');
  const t = useMemo(() => getTranslations(language), [language]);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        setIsLoggedIn(true);
        loadUserProfile(session.user);
        loadAllUsers();
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setSupabaseUser(session?.user ?? null);
      if (session?.user) {
        setIsLoggedIn(true);
        loadUserProfile(session.user);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!supabaseUser) return;

    const channel = supabase
      .channel(`notifications:${supabaseUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${supabaseUser.id}`,
      }, (payload) => {
        const newNotif = payload.new as any;
        setNotifications(prev => [{
          id: newNotif.id,
          title: newNotif.title,
          message: newNotif.message,
          time: 'Just now',
          read: false,
          type: newNotif.type || 'system',
        }, ...prev]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabaseUser]);

  const loadUserProfile = async (user: User) => {
    try {
      const { data: profile } = await fetchUserProfile(user.id);
      if (profile) {
        setCurrentUser({
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: profile.phone || '',
          bio: profile.bio || '',
          location: profile.location || '',
          joinDate: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          profileImage: profile.profile_image || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        });
        // Apply saved settings
        if (profile.settings) {
          setDarkMode(profile.settings.dark_mode ?? false);
          setNotificationsEnabled(profile.settings.notifications_enabled ?? true);
          setThemeColor(profile.settings.theme_color || 'violet');
          setLanguage((profile.settings.language as Language) || 'en');
        }
      } else {
        // Profile not loaded from DB; set from auth metadata
        setCurrentUser({
          name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          phone: '',
          bio: '',
          location: '',
          joinDate: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          profileImage: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        });
      }

      // Load notifications from DB
      const { data: notifs } = await fetchNotifs(user.id);
      if (notifs) {
        setNotifications(notifs.map((n: any) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          time: getRelativeTime(n.created_at),
          read: n.read,
          type: n.type || 'system',
        })));
      }
    } catch (error) {
      console.log('Using local fallback for profile:', error);
    }
  };

  const loadAllUsers = async () => {
    try {
      const { data } = await fetchAllUsers();
      if (data) {
        setAllUsers(data as AppUser[]);
      }
    } catch (error) {
      console.log('Could not load users:', error);
    }
  };

  // Sync settings to DB when they change
  useEffect(() => {
    if (!supabaseUser || !isLoggedIn || isLoading) return;

    // We use a small timeout to avoid spamming the DB on rapid toggles
    const timeoutId = setTimeout(() => {
      supabase.from('user_settings').upsert({
        user_id: supabaseUser.id,
        dark_mode: darkMode,
        notifications_enabled: notificationsEnabled,
        theme_color: themeColor,
        language: language,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' }).then(({ error }) => {
        if (error) console.log('Error saving settings:', error.message);
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [darkMode, notificationsEnabled, themeColor, language, supabaseUser, isLoggedIn, isLoading]);

  // ---- Auth Methods ----
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        await loadAllUsers();
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' };
    }
  };

  const register = async (name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        // Update display name in profiles table
        await supabase.from('user_profiles').upsert({
          user_id: data.user.id,
          display_name: name,
        });
        await loadAllUsers();
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Connection failed' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setSupabaseUser(null);
    setSession(null);
    setNotifications([]);
  };

  const updateProfile = (profile: Partial<UserProfile>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, ...profile });
    }
    // Save to Supabase
    if (supabaseUser) {
      // Name is stored in the users table
      if (profile.name !== undefined) {
        supabase.from('users').update({ name: profile.name }).eq('id', supabaseUser.id).then(({ error }) => {
          if (error) console.log('Name update error:', error.message);
        });
      }
      // Phone, bio, location, profile_image are in user_profiles table
      const profileUpdates: Record<string, any> = {};
      if (profile.phone !== undefined) profileUpdates.phone = profile.phone;
      if (profile.bio !== undefined) profileUpdates.bio = profile.bio;
      if (profile.location !== undefined) profileUpdates.location = profile.location;
      if (profile.profileImage !== undefined) profileUpdates.profile_image = profile.profileImage;
      if (Object.keys(profileUpdates).length > 0) {
        supabase.from('user_profiles').update({ ...profileUpdates, updated_at: new Date().toISOString() }).eq('user_id', supabaseUser.id).then(({ error }) => {
          if (error) console.log('Profile update error:', error.message);
        });
      }
    }
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    if (supabaseUser) {
      supabase.from('notifications').update({ read: true }).eq('id', id).then(() => { });
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (supabaseUser) {
      supabase.from('notifications').update({ read: true }).eq('user_id', supabaseUser.id).eq('read', false).then(() => { });
    }
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (supabaseUser) {
      supabase.from('notifications').delete().eq('user_id', supabaseUser.id).then(() => { });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const colors = useMemo(() => getThemeColors(themeColor), [themeColor]);

  return (
    <AppContext.Provider
      value={{
        darkMode, setDarkMode,
        notificationsEnabled, setNotificationsEnabled,
        themeColor, setThemeColor,
        colors,
        isLoggedIn, currentUser,
        supabaseUser, session,
        login, register, logout, updateProfile,
        notifications, markNotificationRead, markAllNotificationsRead, clearNotifications, unreadCount,
        allUsers, isLoading,
        language, setLanguage, t,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ==================== UTILS ====================
function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return date.toLocaleDateString();
}
