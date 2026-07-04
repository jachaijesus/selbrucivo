import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api } from '../../utils/api';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

type Artwork = { id: string; image_base64: string; image_mime: string; title: string };

/**
 * Step 5 — Ambient Mode introduction.
 * Shows a live preview that drifts horizontally with a slow opacity rhythm,
 * and three explanatory lines that fade in sequence. Visuals over text.
 */
export default function AmbientIntro() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [items, setItems] = useState<Artwork[]>([]);
  const drift = useRef(new Animated.Value(0)).current;
  const cross = useRef(new Animated.Value(0)).current;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Artwork[]>('/api/artworks/feed', { params: { scope: 'local', limit: 6 } });
        setItems(data);
      } catch { setItems([]); }
    })();
  }, []);

  // Slow horizontal drift loop
  useEffect(() => {
    drift.setValue(0);
    Animated.loop(
      Animated.timing(drift, { toValue: 1, duration: 12000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ).start();
  }, [drift]);

  // Slow crossfade between artworks every 5s
  useEffect(() => {
    if (items.length < 2) return;
    const t = setInterval(() => {
      Animated.timing(cross, { toValue: 1, duration: 1400, useNativeDriver: true }).start(() => {
        setIdx((i) => (i + 1) % items.length);
        cross.setValue(0);
      });
    }, 5000);
    return () => clearInterval(t);
  }, [items, cross]);

  const driftX = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const next = items[(idx + 1) % Math.max(items.length, 1)];
  const cur = items[idx];

  return (
    <View style={s.root} testID="onboarding-ambient">
      {/* Preview window */}
      <View style={[s.previewWrap, { height: height * 0.52 }]}>
        {cur && (
          <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: driftX }] }]}>
            <Image source={{ uri: `data:${cur.image_mime};base64,${cur.image_base64}` }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        )}
        {next && (
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: cross }]}>
            <Image source={{ uri: `data:${next.image_mime};base64,${next.image_base64}` }} style={StyleSheet.absoluteFill} contentFit="cover" />
          </Animated.View>
        )}
        <View style={s.previewShade} />
        <View style={s.previewLabel}>
          <Text style={s.previewLabelText}>ambient mode · preview</Text>
        </View>
      </View>

      {/* Explanation */}
      <View style={s.body}>
        <FadeIn duration={1000} delay={300}>
          <Text style={s.catalog}>fol. vi · ambient mode</Text>
          <Text style={s.lead}>A way of <Text style={s.italic}>looking,</Text>{'\n'}not a way of scrolling.</Text>
          <View style={s.rule} />
        </FadeIn>

        <FadeIn duration={900} delay={1000}>
          <View style={s.row}><Text style={s.bullet}>—</Text><Text style={s.line}>Swipe horizontally. One work, then the next.</Text></View>
        </FadeIn>
        <FadeIn duration={900} delay={1500}>
          <View style={s.row}><Text style={s.bullet}>—</Text><Text style={s.line}>Overlays disappear. The artwork remains.</Text></View>
        </FadeIn>
        <FadeIn duration={900} delay={2000}>
          <View style={s.row}><Text style={s.bullet}>—</Text><Text style={s.line}>Tap to bring the meta back when you want it.</Text></View>
        </FadeIn>
      </View>

      <FadeIn duration={900} delay={2600}>
        <Pressable
          testID="ambient-intro-continue"
          style={({ pressed }) => [s.cta, pressed && s.ctaPressed]}
          onPress={() => router.replace('/onboarding/contribute')}
        >
          <Text style={s.ctaText}>Continue</Text>
        </Pressable>
        <Text style={s.footnote}>fol. vi / vii</Text>
      </FadeIn>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink, paddingBottom: space.xxl },
  previewWrap: { width: '100%', backgroundColor: palette.shark, overflow: 'hidden' },
  previewShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,11,13,0.18)' },
  previewLabel: { position: 'absolute', top: space.l, left: space.l, paddingHorizontal: space.s, paddingVertical: 4, backgroundColor: 'rgba(11,11,13,0.55)' },
  previewLabelText: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 3, color: palette.parchment, textTransform: 'uppercase' },
  body: { paddingHorizontal: space.xl, paddingTop: space.xl, flex: 1 },
  catalog: { ...type.catalog, color: palette.faint },
  lead: { fontFamily: fonts.display, fontSize: 28, lineHeight: 34, color: palette.paper, marginTop: space.s },
  italic: { fontStyle: 'italic', color: palette.coral },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.l, width: 64 },
  row: { flexDirection: 'row', gap: space.m, marginBottom: space.base, alignItems: 'flex-start' },
  bullet: { color: palette.coral, fontFamily: fonts.display, fontSize: 16, fontStyle: 'italic' },
  line: { color: palette.parchment, fontFamily: fonts.display, fontSize: 16, lineHeight: 24, fontStyle: 'italic', flex: 1 },
  cta: { marginHorizontal: space.xl, backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: '600' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
