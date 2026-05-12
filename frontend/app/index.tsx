import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { api } from '../utils/api';
import { palette, type, space } from '../theme';
import { FadeIn } from '../utils/motion';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await storage.getItem('auth_token');
      if (!token) { router.replace('/auth/login'); return; }
      try {
        const me = await api.get('/api/auth/me');
        if (!me.onboarded) router.replace('/onboarding');
        else router.replace('/(tabs)/ambient');
      } catch {
        await storage.removeItem('auth_token');
        router.replace('/auth/login');
      }
    })();
  }, [router]);

  return (
    <View style={styles.container} testID="splash-screen">
      <FadeIn duration={800}>
        <Text style={styles.brand}>selbrucivo</Text>
        <Text style={styles.sub}>the academia of self</Text>
      </FadeIn>
      <ActivityIndicator color={palette.parchment} style={{ marginTop: space.xxl, opacity: 0.4 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' },
  brand: { ...type.displayM, color: palette.paper, fontStyle: 'italic', textAlign: 'center' },
  sub: { ...type.catalog, marginTop: space.m, textAlign: 'center' },
});
