import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

const GUILD_TITLES: Record<string, string> = {
  illustrator: "Illustrator's Guild",
  animator: "Animator's Guild",
  designer: "Designer's Guild",
};

export default function Ceremony() {
  const router = useRouter();
  const { guild, city, region, country } = useLocalSearchParams<{ guild?: string; city?: string; region?: string; country?: string }>();
  const guildTitle = GUILD_TITLES[(guild as string) || 'illustrator'] || GUILD_TITLES.illustrator;
  const place = [city, region].filter(Boolean).join(', ');
  const placeUpper = (region ? `${city}, ${region}` : `${city || ''}`).toUpperCase();

  return (
    <View style={s.root} testID="onboarding-ceremony">
      <View style={s.body}>
        <FadeIn duration={1000} delay={200}>
          <Text style={s.catalog}>fol. v · let it be recorded</Text>
        </FadeIn>

        <FadeIn duration={1200} delay={700} translateY={12}>
          <Text style={s.declaration}>You are now connected to</Text>
        </FadeIn>

        <FadeIn duration={1500} delay={1500} translateY={14}>
          <View style={s.placard}>
            <Text style={s.placardGuild}>{guildTitle}</Text>
            <View style={s.placardRule} />
            <Text style={s.placardCity}>{placeUpper || '—'}</Text>
            {country ? <Text style={s.placardCountry}>{String(country).toUpperCase()}</Text> : null}
          </View>
        </FadeIn>

        <FadeIn duration={1100} delay={2700}>
          <Text style={s.note}>
            Your works will be archived here. When your city reaches three thousand members across the three guilds, its archive joins the global network.
          </Text>
        </FadeIn>
      </View>

      <FadeIn duration={900} delay={3300}>
        <Pressable
          testID="ceremony-continue"
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
          onPress={() => router.replace('/onboarding/ambient')}
        >
          <Text style={s.ctaText}>Continue</Text>
        </Pressable>
        <Text style={s.footnote}>fol. v / vii</Text>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, paddingHorizontal: space.xl, paddingTop: space.mega, paddingBottom: space.xxl, justifyContent: 'space-between' },
  body: { flex: 1, justifyContent: 'center' },
  catalog: { ...type.catalog, color: palette.faint },
  declaration: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.parchment, fontSize: 22, marginTop: space.l, lineHeight: 30 },
  placard: { backgroundColor: palette.coral, paddingHorizontal: space.l, paddingVertical: space.xl, marginTop: space.xl },
  placardGuild: { fontFamily: fonts.display, color: palette.paper, fontSize: 32, fontStyle: 'italic', letterSpacing: -0.4 },
  placardRule: { height: 1, backgroundColor: 'rgba(244,236,218,0.55)', marginVertical: space.l, width: 56 },
  placardCity: { fontFamily: fonts.mono, color: palette.paper, fontSize: 14, letterSpacing: 5 },
  placardCountry: { fontFamily: fonts.mono, color: palette.paper, opacity: 0.7, fontSize: 11, letterSpacing: 4, marginTop: space.xs },
  note: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 14, lineHeight: 24, marginTop: space.xl },
  cta: { backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: '600' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
