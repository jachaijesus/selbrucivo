import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return Alert.alert('Required', 'Username and passphrase required');
    if (password.length < 6) return Alert.alert('Too short', 'Passphrase must be at least 6 characters');
    if (password !== confirm) return Alert.alert('Mismatch', 'Passphrases do not match');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', { username, email: email || null, password });
      await storage.setItem('auth_token', data.access_token);
      await storage.setItem('user', JSON.stringify(data.user));
      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('Could not inscribe', e?.response?.data?.detail || 'Try a different identifier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>inscribe</Text>
        <Text style={styles.tagline}>your record in the archive</Text>
        <View style={styles.divider} />

        <Text style={styles.label}>Identifier</Text>
        <TextInput testID="register-username-input" style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" placeholderTextColor="#4a4738" />

        <Text style={styles.label}>Correspondence (optional)</Text>
        <TextInput testID="register-email-input" style={styles.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@somewhere" placeholderTextColor="#4a4738" />

        <Text style={styles.label}>Passphrase</Text>
        <TextInput testID="register-password-input" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="at least 6 characters" placeholderTextColor="#4a4738" />

        <Text style={styles.label}>Confirm passphrase</Text>
        <TextInput testID="register-confirm-input" style={styles.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholderTextColor="#4a4738" />

        <Pressable testID="register-submit-button" style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#0a0a0c" /> : <Text style={styles.ctaText}>Inscribe</Text>}
        </Pressable>

        <Link href="/auth/login" asChild>
          <Pressable style={styles.link}>
            <Text style={styles.linkText}>I already have a record</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  inner: { paddingHorizontal: 32, paddingTop: 96, paddingBottom: 64 },
  brand: { fontSize: 30, letterSpacing: 6, color: '#f3ecd9', fontWeight: '300' },
  tagline: { fontSize: 10, letterSpacing: 4, color: '#7a7568', marginTop: 6, textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#1f1e1a', marginVertical: 28, width: 64 },
  label: { fontSize: 10, letterSpacing: 3, color: '#6e6a5e', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: { borderBottomWidth: 1, borderBottomColor: '#2a2820', color: '#f3ecd9', fontSize: 16, paddingVertical: 12 },
  cta: { marginTop: 36, backgroundColor: '#d6c9a8', height: 52, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: '#c2b58f' },
  ctaText: { color: '#0a0a0c', letterSpacing: 3, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { color: '#7a7568', fontSize: 12 },
});
