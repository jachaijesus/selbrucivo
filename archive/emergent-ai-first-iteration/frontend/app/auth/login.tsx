import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { storage } from '../../utils/storage';
import { api } from '../../utils/api';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!username || !password) return Alert.alert('Required', 'Please enter username and password');
    setLoading(true);
    try {
      const data = await api.post('/api/auth/login', { username, password });
      await storage.setItem('auth_token', data.access_token);
      await storage.setItem('user', JSON.stringify(data.user));
      router.replace(data.user.onboarded ? '/(tabs)/ambient' : '/onboarding');
    } catch (e: any) {
      Alert.alert('Could not enter', e?.response?.data?.detail || 'Invalid credentials');
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.root}>
      <View style={s.inner}>
        <FadeIn duration={600}>
          <Text style={s.catalogTop}>est. mmxxvi · vol. i</Text>
          <Text style={s.brand}>selbrucivo</Text>
          <Text style={s.tagline}>the academia of self</Text>
          <View style={s.rule} />
        </FadeIn>

        <FadeIn duration={600} delay={120}>
          <Text style={s.label}>Identifier</Text>
          <TextInput
            testID="login-username-input"
            style={s.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            placeholder="username"
            placeholderTextColor={palette.faint}
          />

          <Text style={s.label}>Passphrase</Text>
          <TextInput
            testID="login-password-input"
            style={s.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={palette.faint}
          />

          <Pressable testID="login-submit-button" style={({ pressed }) => [s.cta, pressed && s.ctaPressed]} onPress={submit} disabled={loading}>
            {loading ? <ActivityIndicator color={palette.ink} /> : <Text style={s.ctaText}>Enter the archive</Text>}
          </Pressable>

          <Link href="/auth/register" asChild>
            <Pressable testID="login-go-register" style={s.link}>
              <Text style={s.linkText}>No record yet · <Text style={s.linkAccent}>inscribe me</Text></Text>
            </Pressable>
          </Link>

          <Link href="/admin/login" asChild>
            <Pressable testID="login-go-admin" style={s.adminLink}>
              <Text style={s.adminLinkText}>Curator portal</Text>
            </Pressable>
          </Link>
        </FadeIn>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  inner: { flex: 1, paddingHorizontal: space.xl, justifyContent: 'center', maxWidth: 480, alignSelf: 'stretch', width: '100%' },
  catalogTop: { ...type.catalog },
  brand: { ...type.displayL, color: palette.paper, fontStyle: 'italic', marginTop: space.s },
  tagline: { ...type.body, color: palette.dim, marginTop: space.s, fontFamily: fonts.display, fontStyle: 'italic', fontSize: 16 },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.xl, width: 64 },
  label: { ...type.label, marginBottom: space.s, marginTop: space.base },
  input: { borderBottomWidth: 1, borderBottomColor: palette.rule, color: palette.paper, fontSize: 16, paddingVertical: space.m, fontFamily: fonts.sans },
  cta: { marginTop: space.xl, backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { ...type.label, color: palette.ink, fontWeight: '600', fontSize: 11 },
  link: { marginTop: space.xl, alignItems: 'center' },
  linkText: { color: palette.dim, fontSize: 13, fontFamily: fonts.sans },
  linkAccent: { color: palette.coral, fontFamily: fonts.display, fontStyle: 'italic' },
  adminLink: { marginTop: space.base, alignItems: 'center' },
  adminLinkText: { ...type.catalog, fontSize: 9 },
});
