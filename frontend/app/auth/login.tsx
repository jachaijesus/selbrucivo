import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) {
      Alert.alert('Required', 'Please enter username and password');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { username, password });
      await storage.setItem('auth_token', data.access_token);
      await storage.setItem('user', JSON.stringify(data.user));
      if (data.user.onboarded) router.replace('/(tabs)/ambient');
      else router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('Could not enter', e?.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
      <View style={styles.inner}>
        <Text style={styles.brand} testID="login-title">selbrucivo</Text>
        <Text style={styles.tagline}>the academia of self</Text>
        <View style={styles.divider} />

        <Text style={styles.label}>Identifier</Text>
        <TextInput
          testID="login-username-input"
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="username"
          placeholderTextColor="#4a4738"
        />

        <Text style={styles.label}>Passphrase</Text>
        <TextInput
          testID="login-password-input"
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#4a4738"
        />

        <Pressable testID="login-submit-button" style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color="#0a0a0c" /> : <Text style={styles.ctaText}>Enter the archive</Text>}
        </Pressable>

        <Link href="/auth/register" asChild>
          <Pressable testID="login-go-register" style={styles.link}>
            <Text style={styles.linkText}>No record yet · inscribe me</Text>
          </Pressable>
        </Link>

        <Link href="/admin/login" asChild>
          <Pressable testID="login-go-admin" style={styles.adminLink}>
            <Text style={styles.adminLinkText}>Curator portal</Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  inner: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
  brand: { fontSize: 30, letterSpacing: 6, color: '#f3ecd9', fontWeight: '300' },
  tagline: { fontSize: 10, letterSpacing: 4, color: '#7a7568', marginTop: 6, textTransform: 'uppercase' },
  divider: { height: 1, backgroundColor: '#1f1e1a', marginVertical: 36, width: 64 },
  label: { fontSize: 10, letterSpacing: 3, color: '#6e6a5e', textTransform: 'uppercase', marginBottom: 8, marginTop: 18 },
  input: { backgroundColor: 'transparent', borderBottomWidth: 1, borderBottomColor: '#2a2820', color: '#f3ecd9', fontSize: 16, paddingVertical: 12 },
  cta: { marginTop: 40, backgroundColor: '#d6c9a8', height: 52, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: '#c2b58f' },
  ctaText: { color: '#0a0a0c', letterSpacing: 3, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  link: { marginTop: 28, alignItems: 'center' },
  linkText: { color: '#7a7568', fontSize: 12, letterSpacing: 1 },
  adminLink: { marginTop: 16, alignItems: 'center' },
  adminLinkText: { color: '#4a4738', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
});
