import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { storage } from '../utils/storage';
import { api } from '../utils/api';
import { palette, type, space, fonts } from '../theme';
import { FadeIn } from '../utils/motion';

export default function Welcome() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  // If the user already has a session, route past the welcome screen quietly.
  useEffect(() => {
    (async () => {
      const token = await storage.getItem('auth_token');
      if (!token) { setChecking(false); return; }
      try {
        const me = await api.get('/api/auth/me');
        if (!me.onboarded) router.replace('/onboarding/philosophy');
        else router.replace('/(tabs)/ambient');
      } catch {
        await storage.removeItem('auth_token');
        setChecking(false);
      }
    })();
  }, [router]);

  if (checking) {
    return (
      <View style={s.root} testID="welcome-screen">
        <ActivityIndicator color={palette.parchment} style={{ opacity: 0.35 }} />
      </View>
    );
  }

  return (
    <View style={s.root} testID="welcome-screen">
      <View style={s.body}>
        <FadeIn duration={1100} translateY={6}>
          <Text style={s.catalog}>est. mmxxvi · vol. i</Text>
        </FadeIn>

        <FadeIn duration={1400} delay={400} translateY={10}>
          <Text style={s.wordmark}>Selbrucivo</Text>
        </FadeIn>

        <FadeIn duration={1100} delay={1200}>
          <View style={s.rule} />
          <Text style={s.tagline}>The Academia of Self.</Text>
          <Text style={s.subtext}>A living archive for Animation, Illustration, and Graphic Design.</Text>
        </FadeIn>
      </View>

      <FadeIn duration={900} delay={1900}>
        <Pressable
          testID="welcome-enter-button"
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
          onPress={() => router.push('/auth/login')}
        >
          <Text style={s.ctaText}>Enter</Text>
        </Pressable>
        <Text style={s.footnote}>fol. i / vii</Text>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, paddingHorizontal: space.xl, paddingTop: space.mega, paddingBottom: space.xxl, alignItems: 'stretch', justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center' },
  catalog: { ...type.catalog, color: palette.faint },
  wordmark: { fontFamily: fonts.display, fontSize: 56, lineHeight: 60, color: palette.paper, fontStyle: 'italic', marginTop: space.base, letterSpacing: -0.8 },
  rule: { height: 1, backgroundColor: palette.rule, width: 64, marginTop: space.xl, marginBottom: space.l },
  tagline: { fontFamily: fonts.display, fontSize: 22, color: palette.parchment, fontStyle: 'italic' },
  subtext: { fontFamily: fonts.sans, fontSize: 13, color: palette.dim, marginTop: space.base, lineHeight: 20, maxWidth: 320 },
  cta: { backgroundColor: palette.paper, height: 56, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 12, letterSpacing: 6, textTransform: 'uppercase', fontWeight: '600' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
