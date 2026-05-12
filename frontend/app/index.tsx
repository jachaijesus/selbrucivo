import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await storage.getItem('auth_token');
      if (!token) {
        router.replace('/auth/login');
        return;
      }
      try {
        const me = await api.get('/api/auth/me');
        if (!me.onboarded) {
          router.replace('/onboarding');
        } else {
          router.replace('/(tabs)/ambient');
        }
      } catch {
        await storage.removeItem('auth_token');
        router.replace('/auth/login');
      }
    })();
  }, []);

  return (
    <View style={styles.container} testID="splash-screen">
      <Text style={styles.brand}>selbrucivo</Text>
      <Text style={styles.sub}>the academia of self</Text>
      <ActivityIndicator color="#d6c9a8" style={{ marginTop: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0c', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 28, letterSpacing: 6, color: '#f3ecd9', fontWeight: '300' },
  sub: { fontSize: 11, letterSpacing: 4, color: '#7a7568', marginTop: 12, textTransform: 'uppercase' },
});
