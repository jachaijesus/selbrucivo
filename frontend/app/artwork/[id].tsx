import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, Pressable, ActivityIndicator, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../utils/api';
import { palette, type, space, fonts, motion } from '../../theme';
import { FadeIn, Fader } from '../../utils/motion';

type Artwork = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  guild: string;
  image_base64: string;
  image_mime: string;
  width: number;
  height: number;
  city: string;
  region: string;
  country: string;
  creator_name: string;
  approved_at: string | null;
  uploaded_at: string;
  status: string;
  same_hand?: { id: string; title: string }[];
};

const GUILD_NUMERAL: Record<string, string> = { illustrator: 'I', animator: 'II', designer: 'III' };
const GUILD_LABEL: Record<string, string> = { illustrator: 'Illustrator', animator: 'Animator', designer: 'Designer' };

/**
 * Single Artwork — exhibition encounter.
 * Fullscreen plate first; the placard slides up beneath on scroll.
 * Tap the plate to enter pure viewing (chrome recedes).
 */
export default function ArtworkDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width, height } = useWindowDimensions();
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [chromeVisible, setChromeVisible] = useState(true);
  const hideTimer = useRef<any>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Artwork>(`/api/artworks/${id}`);
        setArt(data);
      } catch {
        setArt(null);
      } finally { setLoading(false); }
    })();
  }, [id]);

  const armHide = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setChromeVisible(false), motion.hold);
  };

  useEffect(() => { armHide(); return () => hideTimer.current && clearTimeout(hideTimer.current); }, []);

  if (loading) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator color={palette.parchment} style={{ opacity: 0.35 }} />
      </View>
    );
  }

  if (!art) {
    return (
      <View style={[s.root, s.center]} testID="artwork-not-found">
        <Text style={s.notFoundCatalog}>not in record</Text>
        <Text style={s.notFoundTitle}>This folio is unavailable.</Text>
        <Pressable style={s.backCta} onPress={() => router.back()}>
          <Text style={s.backCtaText}>← Return</Text>
        </Pressable>
      </View>
    );
  }

  const plateHeight = Math.min(height * 0.92, height - 36);
  const catalogNo = `№ ${art.id.slice(-6).toUpperCase()}`;
  const acquired = (art.approved_at || art.uploaded_at || '').slice(0, 10);
  const place = [art.city, art.region, art.country].filter(Boolean).join(' · ');

  return (
    <ScrollView
      style={s.root}
      onScrollBeginDrag={() => { setChromeVisible(true); armHide(); }}
      onMomentumScrollEnd={armHide}
      scrollEventThrottle={32}
      testID="artwork-detail"
    >
      {/* PLATE */}
      <Pressable onPress={() => { setChromeVisible((v) => !v); armHide(); }} style={{ width, height: plateHeight, backgroundColor: '#000' }}>
        <Image
          source={{ uri: `data:${art.image_mime};base64,${art.image_base64}` }}
          style={{ width, height: plateHeight }}
          contentFit="contain"
          transition={motion.ambient}
        />

        {/* Top frame: catalog + return */}
        <Fader visible={chromeVisible} duration={motion.reveal} style={s.topFrame}>
          <Pressable testID="artwork-back" onPress={() => router.back()} hitSlop={12}>
            <Text style={s.frameMark}>← Return</Text>
          </Pressable>
          <Text style={s.frameMark}>{catalogNo}</Text>
        </Fader>

        {/* Lower whisper inviting placard */}
        <Fader visible={chromeVisible} duration={motion.reveal} style={s.scrollHint}>
          <Text style={s.scrollHintText}>scroll for placard</Text>
          <View style={s.scrollHintLine} />
        </Fader>
      </Pressable>

      {/* PLACARD */}
      <View style={s.placard}>
        <FadeIn duration={900}>
          <Text style={s.placardCatalog}>{GUILD_NUMERAL[art.guild] || '·'}.  {GUILD_LABEL[art.guild]?.toUpperCase()} · {catalogNo}</Text>
        </FadeIn>

        <FadeIn duration={900} delay={150}>
          <Text style={s.title}>{art.title}</Text>
        </FadeIn>

        <FadeIn duration={900} delay={300}>
          <Text style={s.creator}>by <Text style={s.creatorName}>{art.creator_name}</Text></Text>
        </FadeIn>

        <View style={s.divider} />

        <FadeIn duration={900} delay={450}>
          <MetaRow label="Guild" value={GUILD_LABEL[art.guild] + "'s Guild"} />
          <MetaRow label="Local library" value={place || '—'} />
          <MetaRow label="Acquired" value={acquired || '—'} />
          <MetaRow label="Dimensions" value={`${art.width} × ${art.height}`} />
          <MetaRow label="Status" value={art.status} />
        </FadeIn>

        {art.description ? (
          <FadeIn duration={900} delay={600}>
            <Text style={s.sectionLabel}>Note</Text>
            <Text style={s.description}>{art.description}</Text>
          </FadeIn>
        ) : null}

        {art.tags?.length ? (
          <FadeIn duration={900} delay={700}>
            <Text style={s.sectionLabel}>Subject</Text>
            <View style={s.tagRow}>
              {art.tags.map((t) => (
                <View key={t} style={s.tagPill}><Text style={s.tagText}>{t}</Text></View>
              ))}
            </View>
          </FadeIn>
        ) : null}

        {art.same_hand && art.same_hand.length > 0 ? (
          <FadeIn duration={900} delay={800}>
            <View style={s.sameHandWrap} testID="same-hand">
              <Text style={s.sameHandLabel}>Same hand</Text>
              <Text style={s.sameHandPrologue}>Also archived under {art.creator_name}, in this library.</Text>
              <View style={s.sameHandList}>
                {art.same_hand.map((w, i) => (
                  <Pressable
                    key={w.id}
                    testID={`same-hand-${w.id}`}
                    onPress={() => router.replace(`/artwork/${w.id}` as any)}
                    style={s.sameHandRow}
                  >
                    <Text style={s.sameHandNumeral}>{['i', 'ii', 'iii'][i] || '·'}.</Text>
                    <Text style={s.sameHandTitle}>{w.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </FadeIn>
        ) : null}

        <FadeIn duration={900} delay={850}>
          <View style={s.footerRule} />
          <Text style={s.colophon}>Inscribed in the Selbrucivo archive · vol. i</Text>
        </FadeIn>
      </View>
    </ScrollView>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}</Text>
      <Text style={s.metaValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl, flex: 1 },
  notFoundCatalog: { ...type.catalog, color: palette.faint },
  notFoundTitle: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.parchment, fontSize: 22, marginTop: space.s },
  backCta: { marginTop: space.xl, paddingHorizontal: space.l, paddingVertical: space.m, borderWidth: 1, borderColor: palette.rule },
  backCtaText: { fontFamily: fonts.mono, color: palette.parchment, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },

  topFrame: { position: 'absolute', top: 36, left: space.l, right: space.l, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  frameMark: { fontFamily: fonts.mono, fontSize: 10, color: palette.parchment, letterSpacing: 3, textTransform: 'uppercase' },

  scrollHint: { position: 'absolute', bottom: space.l, left: 0, right: 0, alignItems: 'center' },
  scrollHintText: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 4, color: palette.parchment, textTransform: 'uppercase', opacity: 0.7 },
  scrollHintLine: { width: 1, height: 22, backgroundColor: palette.parchment, marginTop: 6, opacity: 0.4 },

  placard: { paddingHorizontal: space.xl, paddingTop: space.xxl, paddingBottom: space.ultra, maxWidth: 720, alignSelf: 'stretch', width: '100%' },
  placardCatalog: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 4, color: palette.coral, textTransform: 'uppercase' },
  title: { fontFamily: fonts.display, fontSize: 44, color: palette.paper, marginTop: space.base, lineHeight: 50, letterSpacing: -0.5, fontStyle: 'italic' },
  creator: { fontFamily: fonts.display, color: palette.parchment, fontSize: 17, marginTop: space.m, fontStyle: 'italic' },
  creatorName: { color: palette.paper, fontStyle: 'normal' },
  divider: { height: 1, backgroundColor: palette.rule, marginVertical: space.xl, width: 56 },

  metaRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: palette.rule, paddingVertical: space.m, gap: space.l },
  metaLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 3, color: palette.dim, textTransform: 'uppercase', width: 120 },
  metaValue: { fontFamily: fonts.display, fontSize: 15, color: palette.paper, flex: 1, lineHeight: 22 },

  sectionLabel: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 3, color: palette.dim, textTransform: 'uppercase', marginTop: space.xl, marginBottom: space.m },
  description: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.parchment, fontSize: 16, lineHeight: 26 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  tagPill: { paddingHorizontal: space.s, paddingVertical: 5, borderWidth: 1, borderColor: palette.rule },
  tagText: { fontFamily: fonts.mono, fontSize: 10, color: palette.parchment, letterSpacing: 2, textTransform: 'uppercase' },

  sameHandWrap: { marginTop: space.xxl, paddingTop: space.l, borderTopWidth: 1, borderTopColor: palette.rule },
  sameHandLabel: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 13, letterSpacing: 0.5 },
  sameHandPrologue: { fontFamily: fonts.sans, color: palette.faint, fontSize: 11, marginTop: space.xs, lineHeight: 16 },
  sameHandList: { marginTop: space.base },
  sameHandRow: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 6, gap: space.s },
  sameHandNumeral: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.faint, fontSize: 12, width: 18 },
  sameHandTitle: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.parchment, fontSize: 15, flex: 1 },

  footerRule: { height: 1, backgroundColor: palette.rule, marginTop: space.xxl, marginBottom: space.base, width: '100%' },
  colophon: { fontFamily: fonts.mono, fontSize: 9, color: palette.faint, letterSpacing: 4, textTransform: 'uppercase', textAlign: 'center' },
});
