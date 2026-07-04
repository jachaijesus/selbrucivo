import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

const TENETS = [
  { kind: 'Observe', body: 'slowly.' },
  { kind: 'Contribute', body: 'intentionally.' },
  { kind: 'Browse', body: 'ambiently.' },
];

export default function Philosophy() {
  const router = useRouter();
  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="onboarding-philosophy">
      <FadeIn duration={900}>
        <Text style={s.catalog}>fol. ii · the philosophy</Text>
        <Text style={s.lead}>A contemplative visual library{'\n'}built around regional creative archives.</Text>
        <View style={s.rule} />
      </FadeIn>

      <View style={s.tenets}>
        {TENETS.map((t, i) => (
          <FadeIn key={t.kind} duration={900} delay={500 + i * 400} translateY={10}>
            <View style={s.tenetRow}>
              <Text style={s.tenetKind}>{t.kind}</Text>
              <Text style={s.tenetBody}>{t.body}</Text>
            </View>
          </FadeIn>
        ))}
      </View>

      <FadeIn duration={900} delay={2100}>
        <Text style={s.body}>
          There is no scoreboard here. No applause line. No counted glance.{'\n\n'}Selbrucivo is a slow institution — read it as you would a quiet room of works hung carefully, by hand.
        </Text>
      </FadeIn>

      <View style={{ height: space.xxl }} />

      <FadeIn duration={900} delay={2700}>
        <Pressable
          testID="philosophy-continue"
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
          onPress={() => router.push('/onboarding/guild')}
        >
          <Text style={s.ctaText}>Continue</Text>
        </Pressable>
        <Text style={s.footnote}>fol. ii / vii</Text>
      </FadeIn>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.mega, paddingBottom: space.xxl, maxWidth: 560, alignSelf: 'stretch', width: '100%' },
  catalog: { ...type.catalog, color: palette.faint },
  lead: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: palette.paper, marginTop: space.base, letterSpacing: -0.2 },
  rule: { height: 1, backgroundColor: palette.rule, width: 64, marginVertical: space.xl },
  tenets: { marginTop: space.s },
  tenetRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: space.base, gap: space.s },
  tenetKind: { fontFamily: fonts.display, fontSize: 26, color: palette.coral, fontStyle: 'italic' },
  tenetBody: { fontFamily: fonts.display, fontSize: 26, color: palette.parchment, fontStyle: 'italic' },
  body: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 15, lineHeight: 26, marginTop: space.xl },
  cta: { backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: '600' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
