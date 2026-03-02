import { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { CheckCircle, Eye, EyeOff, Mail, Lock, User, AlertCircle } from 'lucide-react-native';

export default function LoginScreen() {
    const router = useRouter();
    const { login, register, darkMode, colors, isLoggedIn, t } = useApp();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // Auto-redirect if already logged in
    useEffect(() => {
        if (isLoggedIn) router.replace('/(tabs)');
    }, [isLoggedIn]);

    const handleLogin = async () => {
        setError('');
        if (!email || !password) {
            setError(t.fillAllFields);
            return;
        }
        setLoading(true);
        const result = await login(email, password);
        setLoading(false);
        if (!result.success) {
            setError(result.error || 'Invalid email or password');
        } else {
            router.replace('/(tabs)');
        }
    };

    const handleRegister = async () => {
        setError('');
        if (!name || !email || !password || !confirmPassword) {
            setError(t.fillAllFields);
            return;
        }
        if (password !== confirmPassword) {
            setError(t.passwordsDontMatch);
            return;
        }
        if (password.length < 6) {
            setError(t.passwordTooShort);
            return;
        }
        setLoading(true);
        const result = await register(name, email, password);
        setLoading(false);
        if (!result.success) {
            setError(result.error || 'Registration failed');
        } else {
            setSuccess(t.accountCreated);
            router.replace('/(tabs)');
        }
    };

    const switchMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setSuccess('');
    };



    const bg = darkMode ? '#111827' : undefined;
    const cardBg = darkMode ? '#1f2937' : '#ffffff';
    const inputBg = darkMode ? '#374151' : '#f9fafb';
    const inputBorder = darkMode ? '#4b5563' : '#e5e7eb';
    const textPrimary = darkMode ? '#f3f4f6' : '#1f2937';
    const textSecondary = darkMode ? '#9ca3af' : '#6b7280';
    const placeholderColor = darkMode ? '#6b7280' : '#9ca3af';

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <View style={{ flex: 1, backgroundColor: bg }}>
                {/* Top Gradient Section */}
                <LinearGradient
                    colors={[...colors.gradient, '#4338ca']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.topSection}
                >
                    <View style={styles.logoContainer}>
                        <CheckCircle size={40} color="#ffffff" />
                    </View>
                    <Text style={styles.appTitle}>TASKX</Text>
                    <Text style={styles.appSubtitle}>{t.manageTeam} {t.taskx}</Text>
                </LinearGradient>

                {/* Form Card */}
                <ScrollView
                    style={[styles.formCard, { backgroundColor: cardBg }]}
                    contentContainerStyle={styles.formContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Text style={[styles.formTitle, { color: textPrimary }]}>
                        {isRegister ? t.createAccount : t.welcomeBack}
                    </Text>
                    <Text style={[styles.formSubtitle, { color: textSecondary }]}>
                        {isRegister ? 'Sign up to get started' : 'Sign in to continue'}
                    </Text>

                    {error ? (
                        <View style={styles.errorBox}>
                            <AlertCircle size={16} color="#dc2626" />
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {success ? (
                        <View style={styles.successBox}>
                            <CheckCircle size={16} color="#16a34a" />
                            <Text style={styles.successText}>{success}</Text>
                        </View>
                    ) : null}

                    {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textSecondary }]}>{t.fullName}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                <User size={20} color={placeholderColor} style={styles.inputIcon} />
                                <TextInput
                                    value={name}
                                    onChangeText={setName}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={placeholderColor}
                                    style={[styles.textInput, { color: textPrimary }]}
                                />
                            </View>
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: textSecondary }]}>{t.email}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                            <Mail size={20} color={placeholderColor} style={styles.inputIcon} />
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                placeholder="Enter your email"
                                placeholderTextColor={placeholderColor}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                style={[styles.textInput, { color: textPrimary }]}
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[styles.label, { color: textSecondary }]}>{t.password}</Text>
                        <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                            <Lock size={20} color={placeholderColor} style={styles.inputIcon} />
                            <TextInput
                                value={password}
                                onChangeText={setPassword}
                                placeholder="Enter your password"
                                placeholderTextColor={placeholderColor}
                                secureTextEntry={!showPassword}
                                style={[styles.textInput, { color: textPrimary, flex: 1 }]}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                {showPassword ? <EyeOff size={20} color={placeholderColor} /> : <Eye size={20} color={placeholderColor} />}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {isRegister && (
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, { color: textSecondary }]}>{t.confirmPassword}</Text>
                            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: inputBorder }]}>
                                <Lock size={20} color={placeholderColor} style={styles.inputIcon} />
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm your password"
                                    placeholderTextColor={placeholderColor}
                                    secureTextEntry={!showPassword}
                                    style={[styles.textInput, { color: textPrimary }]}
                                />
                            </View>
                        </View>
                    )}

                    <TouchableOpacity onPress={isRegister ? handleRegister : handleLogin} activeOpacity={0.8} disabled={loading}>
                        <LinearGradient
                            colors={colors.gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={[styles.submitButton, loading && { opacity: 0.7 }]}
                        >
                            <Text style={styles.submitButtonText}>
                                {loading ? (isRegister ? t.creatingAccount : t.signingIn) : (isRegister ? t.createAccount : t.signIn)}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.switchRow}>
                        <TouchableOpacity onPress={switchMode}>
                            <Text style={[styles.switchLink, { color: colors.text }]}>
                                {isRegister ? t.alreadyHaveAccount : t.dontHaveAccount}
                            </Text>
                        </TouchableOpacity>
                    </View>

                </ScrollView>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    topSection: {
        flex: 0.4,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingBottom: 32,
        paddingHorizontal: 24,
    },
    logoContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    appTitle: {
        fontSize: 36,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
    },
    appSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    formCard: {
        flex: 0.6,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        marginTop: -20,
    },
    formContent: {
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 40,
    },
    formTitle: {
        fontSize: 24,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 4,
    },
    formSubtitle: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#fef2f2',
        borderWidth: 1,
        borderColor: '#fecaca',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    errorText: { fontSize: 13, color: '#dc2626', flex: 1 },
    successBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#f0fdf4',
        borderWidth: 1,
        borderColor: '#bbf7d0',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 16,
    },
    successText: { fontSize: 13, color: '#16a34a', flex: 1 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, marginBottom: 6 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
    },
    inputIcon: { marginRight: 8 },
    textInput: {
        flex: 1,
        paddingVertical: 14,
        fontSize: 15,
    },
    eyeButton: { padding: 4 },
    submitButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 24,
    },
    switchText: { fontSize: 14 },
    switchLink: { fontSize: 14, fontWeight: '600' },
    demoSection: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
    },
    demoLabel: {
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 12,
    },
    demoButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    demoButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    demoButtonText: { fontSize: 12, fontWeight: '500' },
});
