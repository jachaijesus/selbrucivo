import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';
import { storage } from '../../utils/storage';

type Guild = 'illustrator' | 'animator' | 'designer';

const GUILDS: { key: Guild; numeral: string; label: string; charge: string }[] = [
  { key: 'illustrator', numeral: 'I', label: 'Illustrator', charge: 'Drawn line · painted folio · hand-rendered narrative.' },
  { key: 'animator', numeral: 'II', label: 'Animator', charge: 'Frames in sequence · motion as memory · time as material.' },
  { key: 'designer', numeral: 'III', label: 'Designer', charge: 'Type · system · form · the grammar of visual order.' },
];

export default function GuildStep() {
  const router = useRouter();
  const [guild, setGuild] = useState<Guild | null>(null);

  const next = async () => {
    if (!guild) return;
    await storage.setItem('onboarding_guild', guild);
    router.push('/onboarding/place');
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="onboarding-guild">
      <FadeIn duration={900}>
        <Text style={s.catalog}>fol. iii · the guild</Text>
        <Text style={s.title}>Pick your <Text style={s.italic}>guild.</Text></Text>
        <View style={s.rule} />
        <Text style={s.helper}>One vocation. It shapes the works you inscribe and the corner of the library that holds them.</Text>
      </FadeIn>

      <View style={{ marginTop: space.xl }}>
        {GUILDS.map((g, i) => (
          <FadeIn key={g.key} duration={700} delay={300 + i * 180} translateY={6}>
            <Pressable
              testID={`guild-${g.key}`}
              onPress={() => setGuild(g.key)}
              style={({ pressed }) => [s.card, guild === g.key && s.cardActive, pressed && { opacity: 0.94 }]}
            >
              <Text style={[s.numeral, guild === g.key && s.numeralActive]}>{g.numeral}.</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.label, guild === g.key && s.labelActive]}>{g.label}</Text>
                <Text style={s.charge}>{g.charge}</Text>
              </View>
              {guild === g.key && <View style={s.tick} />}
            </Pressable>
          </FadeIn>
        ))}
      </View>

      <View style={{ height: space.xxl }} />

      <Pressable
        testID="guild-continue"
        disabled={!guild}
        onPress={next}
        style={({ pressed }) => [s.cta, !guild && s.ctaDisabled, pressed && s.ctaPressed]}
      >
        <Text style={[s.ctaText, !guild && { color: palette.dim }]}>Continue</Text>
      </Pressable>
      <Text style={s.footnote}>fol. iii / vii</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.mega, paddingBottom: space.xxl, maxWidth: 560, alignSelf: 'stretch', width: '100%' },
  catalog: { ...type.catalog, color: palette.faint },
  title: { fontFamily: fonts.display, fontSize: 40, color: palette.paper, marginTop: space.s, lineHeight: 46, letterSpacing: -0.4 },
  italic: { fontStyle: 'italic', color: palette.coral },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.l, width: 64 },
  helper: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 14, lineHeight: 22 },
  card: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: space.l, paddingHorizontal: space.base, borderBottomWidth: 1, borderBottomColor: palette.rule, gap: space.l, position: 'relative' },
  cardActive: { backgroundColor: 'rgba(192,78,85,0.06)', borderBottomColor: palette.coral },
  numeral: { fontFamily: fonts.display, color: palette.dim, fontSize: 24, width: 36, fontStyle: 'italic' },
  numeralActive: { color: palette.coral },
  label: { fontFamily: fonts.display, color: palette.paper, fontSize: 26, marginBottom: space.xs, letterSpacing: -0.3 },
  labelActive: { color: palette.paper },
  charge: { fontFamily: fonts.sans, color: palette.dim, fontSize: 12, lineHeight: 19 },
  tick: { position: 'absolute', right: 0, top: '50%', width: 6, height: 6, borderRadius: 3, backgroundColor: palette.coral, marginTop: -3 },
  cta: { backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { backgroundColor: palette.rule },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: '600' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
