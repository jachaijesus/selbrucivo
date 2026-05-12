import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

const TITLES: Record<string, string> = {
  illustrator: "Illustrator's Guild",
  animator: "Animator's Guild",
  designer: "Designer's Guild",
};

export default function Ceremony() {
  const router = useRouter();
  const { guild, city, region } = useLocalSearchParams<{ guild?: string; city?: string; region?: string }>();
  const g = (guild || 'illustrator') as keyof typeof TITLES;
  const guildTitle = TITLES[g] || TITLES.illustrator;
  const place = [city, region].filter(Boolean).join(', ');

  return (
    <View style={s.root} testID="ceremony-screen">
      <View style={s.spacerTop} />
      <FadeIn duration={900} translateY={12}>
        <View style={s.placard}>
          <Text style={s.placardCatalog}>let it be recorded · fol. iii</Text>
          <View style={s.placardRule} />
          <Text style={s.placardLead}>Another rises{'\n'}through the ranks.</Text>
          <View style={s.placardRule} />
          <Text style={s.placardYouAre}>You are now a member of</Text>
          <Text style={s.placardGuild}>{guildTitle}</Text>
          <Text style={s.placardCity}>{place.toUpperCase() || '—'}</Text>
        </View>
      </FadeIn>

      <FadeIn duration={900} delay={400}>
        <Text style={s.body}>
          Your contributions will be archived in your local library. When a city reaches three thousand members across all three guilds, its archive joins the global network.
        </Text>
      </FadeIn>

      <View style={{ flex: 1 }} />

      <FadeIn duration={900} delay={700}>
        <Pressable testID="ceremony-enter" style={({ pressed }) => [s.cta, pressed && { backgroundColor: palette.parchment }]} onPress={() => router.replace('/(tabs)/ambient')}>
          <Text style={s.ctaText}>Enter the library</Text>
        </Pressable>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, paddingHorizontal: space.xl, paddingTop: 64, paddingBottom: space.xxl },
  spacerTop: { height: space.l },
  placard: { backgroundColor: palette.coral, paddingHorizontal: space.l, paddingVertical: space.xl, borderWidth: 1, borderColor: palette.coral },
  placardCatalog: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: palette.paper, opacity: 0.7 },
  placardRule: { height: 1, backgroundColor: 'rgba(244,236,218,0.5)', marginVertical: space.l, width: 56 },
  placardLead: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, color: palette.paper, fontStyle: 'italic', letterSpacing: -0.3 },
  placardYouAre: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 4, textTransform: 'uppercase', color: palette.paper, opacity: 0.75, marginBottom: space.s },
  placardGuild: { fontFamily: fonts.display, fontSize: 26, color: palette.paper, marginBottom: space.s },
  placardCity: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 4, color: palette.paper, opacity: 0.85 },
  body: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 15, lineHeight: 24, marginTop: space.xl },
  cta: { backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaText: { ...type.label, color: palette.ink, fontWeight: '600', fontSize: 11 },
});
