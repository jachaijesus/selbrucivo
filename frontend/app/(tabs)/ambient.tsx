import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, ActivityIndicator, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { palette, type, space, fonts, motion } from '../../theme';
import { Fader, FadeIn } from '../../utils/motion';

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
};

const GUILD_NUMERAL: Record<string, string> = { illustrator: 'I', animator: 'II', designer: 'III' };

export default function Ambient() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [scope, setScope] = useState<'local' | 'global'>('local');
  const [guildFilter, setGuildFilter] = useState<string | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const hideTimer = useRef<any>(null);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setOverlayVisible(false), motion.hold);
  }, []);

  useEffect(() => {
    setOverlayVisible(true);
    scheduleHide();
    return () => hideTimer.current && clearTimeout(hideTimer.current);
  }, [scheduleHide, index]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { scope };
      if (guildFilter) params.guild = guildFilter;
      const data = await api.get('/api/artworks/feed', { params });
      setItems(data);
      setIndex(0);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [scope, guildFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onViewable = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (loading) {
    return (
      <View style={[s.root, s.center]} testID="ambient-loading">
        <ActivityIndicator color={palette.parchment} />
        <Text style={s.loadText}>drawing from archive</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[s.root, s.center]} testID="ambient-empty">
        <FadeIn>
          <Text style={s.emptyCatalog}>quiet</Text>
          <Text style={s.emptyTitle}>No works yet.</Text>
          <Text style={s.emptyBody}>
            {scope === 'global' ? 'No global libraries have unlocked yet.' : 'Your local library has not been seeded.'}
          </Text>
          <Pressable testID="ambient-empty-upload" style={s.uploadBtn} onPress={() => router.push('/(tabs)/upload')}>
            <Text style={s.uploadBtnText}>Inscribe the first work</Text>
          </Pressable>
        </FadeIn>
      </View>
    );
  }

  const reveal = () => { setOverlayVisible(true); scheduleHide(); };

  return (
    <View style={s.root} testID="ambient-screen">
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <Pressable onPress={reveal} style={{ width, height }}>
            <Image
              source={{ uri: `data:${item.image_mime};base64,${item.image_base64}` }}
              style={{ width, height }}
              contentFit="cover"
              transition={motion.ambient}
            />
            <View style={s.bottomShade} />
            <Fader visible={overlayVisible} duration={motion.reveal} style={s.metaBlock}>
              <Text style={s.metaCatalog}>{GUILD_NUMERAL[item.guild] || '·'}.  {item.guild.toUpperCase()}</Text>
              <Text style={s.metaTitle} numberOfLines={2}>{item.title}</Text>
              <Text style={s.metaCreator}>{item.creator_name}</Text>
              <Text style={s.metaCity}>{item.city}{item.region ? `,  ${item.region}` : ''}{item.country ? `  ·  ${item.country}` : ''}</Text>
            </Fader>
          </Pressable>
        )}
      />

      <Fader visible={overlayVisible} duration={motion.reveal} style={s.topBar}>
        <View style={s.brandRow}>
          <Text style={s.brand}>selbrucivo</Text>
          <Text style={s.pageNo}>{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</Text>
        </View>
        <View style={s.scopeRow}>
          <ScopeChip label="Local" active={scope === 'local'} onPress={() => setScope('local')} testID="scope-local" />
          <ScopeChip label="Global" active={scope === 'global'} onPress={() => setScope('global')} testID="scope-global" />
          <View style={{ width: 1, height: 14, backgroundColor: 'rgba(244,236,218,0.18)', marginHorizontal: space.s }} />
          <ScopeChip label="All" active={!guildFilter} onPress={() => setGuildFilter(null)} testID="guild-filter-all" small />
          <ScopeChip label="Ill" active={guildFilter === 'illustrator'} onPress={() => setGuildFilter('illustrator')} testID="guild-filter-ill" small />
          <ScopeChip label="Anim" active={guildFilter === 'animator'} onPress={() => setGuildFilter('animator')} testID="guild-filter-anim" small />
          <ScopeChip label="Des" active={guildFilter === 'designer'} onPress={() => setGuildFilter('designer')} testID="guild-filter-des" small />
        </View>
      </Fader>
    </View>
  );
}

function ScopeChip({ label, active, onPress, testID, small }: { label: string; active: boolean; onPress: () => void; testID: string; small?: boolean }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[s.chip, small && s.chipSmall, active && s.chipActive]}>
      <Text style={[s.chipText, small && s.chipTextSmall, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  loadText: { ...type.catalog, color: palette.dim, marginTop: space.base },
  emptyCatalog: { ...type.catalog, color: palette.faint },
  emptyTitle: { ...type.displayM, color: palette.paper, marginTop: space.s, fontStyle: 'italic' },
  emptyBody: { ...type.body, color: palette.dim, textAlign: 'center', marginTop: space.m, maxWidth: 320 },
  uploadBtn: { marginTop: space.xl, paddingHorizontal: space.l, paddingVertical: space.base, backgroundColor: palette.paper },
  uploadBtnText: { ...type.label, color: palette.ink, fontSize: 11, fontWeight: '600' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 320, backgroundColor: 'rgba(11,11,13,0.72)' },
  metaBlock: { position: 'absolute', left: space.l, right: space.l, bottom: space.l + 8 },
  metaCatalog: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 4, color: palette.coral, textTransform: 'uppercase' },
  metaTitle: { fontFamily: fonts.display, color: palette.paper, fontSize: 32, lineHeight: 36, marginTop: space.s, letterSpacing: -0.3 },
  metaCreator: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.parchment, fontSize: 15, marginTop: space.s },
  metaCity: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 3, color: palette.gunsmoke, textTransform: 'uppercase', marginTop: space.m },
  topBar: { position: 'absolute', top: 48, left: 0, right: 0, paddingHorizontal: space.l },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontFamily: fonts.display, fontSize: 16, color: palette.paper, fontStyle: 'italic', letterSpacing: 0.5 },
  pageNo: { fontFamily: fonts.mono, fontSize: 11, color: palette.parchment, letterSpacing: 3 },
  scopeRow: { flexDirection: 'row', marginTop: space.m, alignItems: 'center', flexWrap: 'wrap' },
  chip: { paddingHorizontal: space.m, paddingVertical: 5, marginRight: 6, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(244,236,218,0.18)' },
  chipSmall: { paddingHorizontal: 9, paddingVertical: 4 },
  chipActive: { borderColor: palette.coral, backgroundColor: 'rgba(192,78,85,0.18)' },
  chipText: { fontFamily: fonts.mono, fontSize: 10, color: palette.parchment, letterSpacing: 2, textTransform: 'uppercase' },
  chipTextSmall: { fontSize: 9 },
  chipTextActive: { color: palette.paper },
});
