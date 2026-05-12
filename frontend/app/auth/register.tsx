import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return Alert.alert('Required', 'Username and passphrase required');
    if (password.length < 6) return Alert.alert('Too short', 'At least 6 characters');
    if (password !== confirm) return Alert.alert('Mismatch', 'Passphrases do not match');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/register', { username, email: email || null, password });
      await storage.setItem('auth_token', data.access_token);
      await storage.setItem('user', JSON.stringify(data.user));
      router.replace('/onboarding');
    } catch (e: any) {
      Alert.alert('Could not inscribe', e?.response?.data?.detail || 'Try a different identifier');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <ScrollView contentContainerStyle={s.inner} keyboardShouldPersistTaps="handled">
        <FadeIn>
          <Text style={s.catalogTop}>register · entrance to the archive</Text>
          <Text style={s.title}>Inscribe.</Text>
          <View style={s.rule} />
        </FadeIn>

        <Text style={s.label}>Identifier</Text>
        <TextInput testID="register-username-input" style={s.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="username" placeholderTextColor={palette.faint} />

        <Text style={s.label}>Correspondence (optional)</Text>
        <TextInput testID="register-email-input" style={s.input} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@somewhere" placeholderTextColor={palette.faint} />

        <Text style={s.label}>Passphrase</Text>
        <TextInput testID="register-password-input" style={s.input} value={password} onChangeText={setPassword} secureTextEntry placeholder="at least 6 characters" placeholderTextColor={palette.faint} />

        <Text style={s.label}>Confirm passphrase</Text>
        <TextInput testID="register-confirm-input" style={s.input} value={confirm} onChangeText={setConfirm} secureTextEntry placeholderTextColor={palette.faint} />

        <Pressable testID="register-submit-button" style={({ pressed }) => [s.cta, pressed && s.ctaPressed]} onPress={submit} disabled={loading}>
          {loading ? <ActivityIndicator color={palette.ink} /> : <Text style={s.ctaText}>Begin</Text>}
        </Pressable>

        <Link href="/auth/login" asChild>
          <Pressable style={s.link}>
            <Text style={s.linkText}>I already have a record</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  inner: { paddingHorizontal: space.xl, paddingTop: 96, paddingBottom: 64, maxWidth: 480, alignSelf: 'stretch', width: '100%' },
  catalogTop: { ...type.catalog },
  title: { ...type.displayL, color: palette.paper, fontStyle: 'italic', marginTop: space.s },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.l, width: 64 },
  label: { ...type.label, marginBottom: space.s, marginTop: space.base },
  input: { borderBottomWidth: 1, borderBottomColor: palette.rule, color: palette.paper, fontSize: 16, paddingVertical: space.m, fontFamily: fonts.sans },
  cta: { marginTop: space.xl, backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { ...type.label, color: palette.ink, fontWeight: '600', fontSize: 11 },
  link: { marginTop: space.xl, alignItems: 'center' },
  linkText: { color: palette.dim, fontSize: 13 },
});
