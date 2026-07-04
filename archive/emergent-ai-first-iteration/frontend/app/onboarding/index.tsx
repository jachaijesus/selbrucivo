/**
 * Router gate for /onboarding — figures out which folio the user is on.
 * If guild already chosen, jump to place; if place set, jump to ceremony's downstream.
 */
import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { palette } from '../../theme';

export default function OnboardingRouter() {
  const router = useRouter();
  useEffect(() => {
    (async () => {
      try {
        const me = await api.get('/api/auth/me');
        if (me.onboarded) router.replace('/(tabs)/ambient');
        else router.replace('/onboarding/philosophy');
      } catch {
        router.replace('/auth/login');
      }
    })();
  }, [router]);
  return (
    <View style={{ flex: 1, backgroundColor: palette.ink, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color={palette.parchment} style={{ opacity: 0.35 }} />
    </View>
  );
}
