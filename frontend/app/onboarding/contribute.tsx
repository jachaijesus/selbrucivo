import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

/**
 * Step 6 — Optional first contribution.
 * Contribution is welcomed, never required. Two equal paths: browse or inscribe.
 */
export default function Contribute() {
  const router = useRouter();
  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="onboarding-contribute">
      <FadeIn duration={900}>
        <Text style={s.catalog}>fol. vii · an open invitation</Text>
        <Text style={s.title}>Contribute,{'\n'}<Text style={s.italic}>or simply read.</Text></Text>
        <View style={s.rule} />
      </FadeIn>

      <FadeIn duration={900} delay={300}>
        <Text style={s.body}>
          The archive welcomes inscriptions, but does not demand them. You may begin by looking — wander the local library, sit with the works, return when there is something you wish to leave behind.
        </Text>
      </FadeIn>

      <View style={{ height: space.xxl }} />

      <FadeIn duration={900} delay={700}>
        <Pressable
          testID="contribute-inscribe"
          style={({ pressed }) => [s.primary, pressed && s.primaryPressed]}
          onPress={() => router.replace('/(tabs)/upload')}
        >
          <Text style={s.primaryText}>Inscribe a first work</Text>
        </Pressable>

        <Pressable
          testID="contribute-browse"
          style={({ pressed }) => [s.ghost, pressed && { borderColor: palette.parchment }]}
          onPress={() => router.replace('/(tabs)/ambient')}
        >
          <Text style={s.ghostText}>Browse the library first</Text>
        </Pressable>
      </FadeIn>

      <FadeIn duration={900} delay={1100}>
        <Text style={s.footer}>You may inscribe at any time, from the upload tab. There is no rush.</Text>
        <Text style={s.footnote}>fol. vii / vii</Text>
      </FadeIn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.mega, paddingBottom: space.xxl, maxWidth: 560, alignSelf: 'stretch', width: '100%' },
  catalog: { ...type.catalog, color: palette.faint },
  title: { fontFamily: fonts.display, fontSize: 38, color: palette.paper, marginTop: space.s, lineHeight: 44, letterSpacing: -0.4 },
  italic: { fontStyle: 'italic', color: palette.coral },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.l, width: 64 },
  body: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 16, lineHeight: 26 },
  primary: { backgroundColor: palette.paper, height: 56, alignItems: 'center', justifyContent: 'center' },
  primaryPressed: { backgroundColor: palette.parchment },
  primaryText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: '600' },
  ghost: { marginTop: space.m, height: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.rule },
  ghostText: { fontFamily: fonts.mono, color: palette.parchment, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase' },
  footer: { fontFamily: fonts.sans, color: palette.dim, fontSize: 12, lineHeight: 20, marginTop: space.xl, textAlign: 'center', fontStyle: 'italic' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
