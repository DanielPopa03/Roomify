import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Blue, Neutral, Spacing } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function CompleteProfileScreen() {
    const { user, getAccessToken, setIsProfileComplete, refreshUser } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Form State
    const initialEmail = user?.email?.includes('@no-email') ? '' : (user?.email || '');

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(initialEmail);
    const [phone, setPhone] = useState('');
    const [role, setRole] = useState<'USER' | 'LANDLORD'>('USER');

    // UI & Validation State
    const [touched, setTouched] = useState({ name: false, phone: false, email: false });
    const [loading, setLoading] = useState(false);

    // Email Check State
    const [isEmailTaken, setIsEmailTaken] = useState(false);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);

    // --- VALIDATION LOGIC ---
    const isNameValid = name.trim().length > 1;
    const isPhoneValid = /^[+]?[0-9\s\-()]{10,15}$/.test(phone.trim());
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    // --- DEBOUNCED EMAIL CHECK ---
    useEffect(() => {
        // Only check if email format is valid and different from initial
        if (isEmailValid && email !== initialEmail) {
            const delayDebounceFn = setTimeout(() => {
                checkEmailAvailability(email);
            }, 500);

            return () => clearTimeout(delayDebounceFn);
        } else {
            setIsEmailTaken(false);
        }
    }, [email, isEmailValid]);

    const checkEmailAvailability = async (emailToCheck: string) => {
        setIsCheckingEmail(true);
        try {
            const token = await getAccessToken();
            const apiUrl = 'http://' + process.env.EXPO_PUBLIC_BACKEND_IP + ':8080';
            const response = await fetch(`${apiUrl}/user/check-email?email=${encodeURIComponent(emailToCheck)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            setIsEmailTaken(data.isTaken);
        } catch (error) {
            console.error("Email check failed", error);
        } finally {
            setIsCheckingEmail(false);
        }
    };

    const isFormValid = isNameValid && isPhoneValid && isEmailValid && !isEmailTaken && !isCheckingEmail;

    const handleSubmit = async () => {
        if (!isFormValid) {
            setTouched({ name: true, phone: true, email: true });
            return;
        }

        setLoading(true);
        try {
            const token = await getAccessToken();
            const userId = encodeURIComponent(user?.sub || '');
            const apiUrl = 'http://' + process.env.EXPO_PUBLIC_BACKEND_IP + ':8080';

            const response = await fetch(`${apiUrl}/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    phoneNumber: phone.trim(),
                    role: role,
                    bio: role === 'LANDLORD' ? "New Landlord" : "Looking for a home"
                })
            });

            if (response.ok) {
                await refreshUser();
                setIsProfileComplete(true);
                Alert.alert("Welcome!", "Your profile is ready.", [
                    { text: "Let's Start", onPress: () => router.replace('/') }
                ]);
            } else {
                Alert.alert("Error", "Could not save profile. The email might have been taken just now.");
            }
        } catch (error) {
            Alert.alert("Error", "Network request failed.");
        } finally {
            setLoading(false);
        }
    };

    const getBorderColor = (field: 'name' | 'phone' | 'email', isValid: boolean) => {
        if (field === 'email' && isEmailTaken) return '#EF4444';
        if (!touched[field]) return Neutral[300];
        return isValid ? Blue[500] : '#EF4444';
    };

    return (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top + 40 }]}>
                <Text style={styles.title}>Finish Setting Up</Text>
                <Text style={styles.subtitle}>Tell us a bit about yourself and how you'll use Roomify.</Text>

                <View style={styles.form}>
                    {/* ROLE SELECTION */}
                    <Text style={styles.label}>I want to...</Text>
                    <View style={styles.roleContainer}>
                        <TouchableOpacity
                            style={[styles.roleCard, role === 'USER' && styles.activeRoleCard]}
                            onPress={() => setRole('USER')}
                        >
                            <Ionicons name="person" size={28} color={role === 'USER' ? Blue[600] : Neutral[400]} />
                            <Text style={[styles.roleText, role === 'USER' && styles.activeRoleText]}>Find a Room</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.roleCard, role === 'LANDLORD' && styles.activeRoleCard]}
                            onPress={() => setRole('LANDLORD')}
                        >
                            <Ionicons name="business" size={28} color={role === 'LANDLORD' ? Blue[600] : Neutral[400]} />
                            <Text style={[styles.roleText, role === 'LANDLORD' && styles.activeRoleText]}>List a Property</Text>
                        </TouchableOpacity>
                    </View>

                    {/* NAME */}
                    <View>
                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={[styles.input, { borderColor: getBorderColor('name', isNameValid) }]}
                            value={name}
                            onChangeText={setName}
                            onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                            placeholder="John Doe"
                        />
                        {touched.name && !isNameValid && <Text style={styles.errorText}>Please enter your name</Text>}
                    </View>

                    {/* EMAIL */}
                    <View>
                        <Text style={styles.label}>Email Address</Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, { flex: 1, borderColor: getBorderColor('email', isEmailValid) }]}
                                value={email}
                                onChangeText={setEmail}
                                onBlur={() => setTouched(prev => ({ ...prev, email: true }))}
                                placeholder="you@example.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                            {isCheckingEmail && (
                                <View style={styles.inputLoader}>
                                    <ActivityIndicator size="small" color={Blue[600]} />
                                </View>
                            )}
                        </View>
                        {isEmailTaken && <Text style={styles.errorText}>This email is already associated with another account.</Text>}
                        {touched.email && !isEmailValid && !isEmailTaken && <Text style={styles.errorText}>Please enter a valid email</Text>}
                    </View>

                    {/* PHONE */}
                    <View>
                        <Text style={styles.label}>Phone Number</Text>
                        <TextInput
                            style={[styles.input, { borderColor: getBorderColor('phone', isPhoneValid) }]}
                            value={phone}
                            onChangeText={setPhone}
                            onBlur={() => setTouched(prev => ({ ...prev, phone: true }))}
                            placeholder="07xx xxx xxx"
                            keyboardType="phone-pad"
                        />
                        {touched.phone && !isPhoneValid && <Text style={styles.errorText}>Enter a valid phone number</Text>}
                    </View>

                    <TouchableOpacity
                        style={[styles.button, (!isFormValid || loading) && styles.buttonDisabled]}
                        onPress={handleSubmit}
                        disabled={!isFormValid || loading}
                    >
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Complete Profile</Text>}
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: '#fff', padding: 24 },
    title: { fontSize: 28, fontWeight: 'bold', color: '#171717', marginBottom: 8 },
    subtitle: { fontSize: 16, color: '#737373', marginBottom: 32, lineHeight: 24 },
    form: { gap: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#404040', marginBottom: 4 },
    roleContainer: { flexDirection: 'row', gap: 12 },
    roleCard: { flex: 1, borderWidth: 2, borderColor: Neutral[200], borderRadius: 16, padding: 20, alignItems: 'center', backgroundColor: '#fff' },
    activeRoleCard: { borderColor: Blue[600], backgroundColor: Blue[50] },
    roleText: { marginTop: 10, fontWeight: '700', color: Neutral[500], fontSize: 13 },
    activeRoleText: { color: Blue[600] },
    inputWrapper: { flexDirection: 'row', alignItems: 'center' },
    input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 16, backgroundColor: '#fff' },
    inputLoader: { position: 'absolute', right: 14 },
    errorText: { color: '#EF4444', fontSize: 12, marginTop: 4 },
    button: { backgroundColor: Blue[600], padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    buttonDisabled: { backgroundColor: '#93C5FD', opacity: 0.7 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});