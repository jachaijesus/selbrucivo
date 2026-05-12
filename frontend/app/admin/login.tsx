import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return Alert.alert('Required', 'Enter credentials');
    setLoading(true);
    try {
      const data = await api.post('/api/admin/auth/login', { username, password });
      await storage.setItem('admin_token', data.access_token);
      await storage.setItem('admin', JSON.stringify(data.admin));
      router.replace('/admin/dashboard');
    } catch (e: any) {
      Alert.alert('Denied', e?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <View style={s.inner}>
        <Text style={s.eyebrow}>curator portal</Text>
        <Text style={s.title}>archive review</Text>
        <View style={s.rule} />

        <Text style={s.label}>Curator identifier</Text>
        <TextInput testID="admin-username" style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="admin" placeholderTextColor="#4a4738" />

        <Text style={s.label}>Passphrase</Text>
        <TextInput testID="admin-password" style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#4a4738" />

        <Pressable testID="admin-submit" onPress={submit} style={({ pressed }) => [s.cta, pressed && s.ctaPressed]} disabled={loading}>
          {loading ? <ActivityIndicator color="#0a0a0c" /> : <Text style={s.ctaText}>Enter</Text>}
        </Pressable>

        <Link href="/auth/login" asChild>
          <Pressable style={s.back}><Text style={s.backText}>← back to archive</Text></Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  title: { color: '#f3ecd9', fontSize: 30, fontWeight: '300', marginTop: 8, letterSpacing: -0.5 },
  rule: { height: 1, backgroundColor: '#1f1e1a', width: 64, marginVertical: 24 },
  label: { color: '#6e6a5e', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: { borderBottomWidth: 1, borderBottomColor: '#2a2820', color: '#f3ecd9', fontSize: 15, paddingVertical: 12 },
  cta: { marginTop: 32, backgroundColor: '#d6c9a8', height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  ctaPressed: { backgroundColor: '#c2b58f' },
  ctaText: { color: '#0a0a0c', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '600' },
  back: { marginTop: 24, alignItems: 'center' },
  backText: { color: '#7a7568', fontSize: 12 },
});
