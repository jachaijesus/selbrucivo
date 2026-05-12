import React, { useCallback, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, useWindowDimensions, ActivityIndicator, Pressable, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';

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

const GUILD_GLYPH: Record<string, string> = {
  illustrator: '✦',
  animator: '◐',
  designer: '▣',
};

export default function Ambient() {
  const { width, height } = useWindowDimensions();
  const router = useRouter();
  const [items, setItems] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [scope, setScope] = useState<'local' | 'global'>('local');
  const [guildFilter, setGuildFilter] = useState<string | null>(null);
  const [overlayHidden, setOverlayHidden] = useState(false);
  const listRef = useRef<FlatList<Artwork>>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { scope };
      if (guildFilter) params.guild = guildFilter;
      const data = await api.get('/api/artworks/feed', { params });
      setItems(data);
      setIndex(0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [scope, guildFilter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onViewable = useRef(({ viewableItems }: any) => {
    if (viewableItems?.[0]?.index != null) setIndex(viewableItems[0].index);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (loading) {
    return (
      <View style={[s.root, s.center]} testID="ambient-loading">
        <ActivityIndicator color="#d6c9a8" />
        <Text style={s.loadText}>Drawing from archive…</Text>
      </View>
    );
  }

  if (!items.length) {
    return (
      <View style={[s.root, s.center]} testID="ambient-empty">
        <Text style={s.emptyEyebrow}>quiet here</Text>
        <Text style={s.emptyTitle}>No works yet.</Text>
        <Text style={s.emptyBody}>
          {scope === 'global'
            ? 'No global libraries have unlocked yet.'
            : 'Your local library has not been seeded with works.'}
        </Text>
        <Pressable testID="ambient-empty-upload" style={s.uploadBtn} onPress={() => router.push('/(tabs)/upload')}>
          <Text style={s.uploadBtnText}>Inscribe the first work</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.root} testID="ambient-screen">
      <FlatList
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item }) => (
          <Pressable onPress={() => setOverlayHidden((v) => !v)} style={{ width, height }}>
            <Image
              source={{ uri: `data:${item.image_mime};base64,${item.image_base64}` }}
              style={{ width, height }}
              contentFit="cover"
              transition={400}
            />
            {!overlayHidden && (
              <>
                <View style={s.topShade} pointerEvents="none" />
                <View style={s.bottomShade} pointerEvents="none" />
                <View style={s.metaBlock}>
                  <Text style={s.title} numberOfLines={2}>{item.title}</Text>
                  <Text style={s.creator}>{item.creator_name}</Text>
                  <View style={s.metaRow}>
                    <Text style={s.metaGlyph}>{GUILD_GLYPH[item.guild] || '·'}</Text>
                    <Text style={s.metaText}>{item.guild.toUpperCase()}</Text>
                    <Text style={s.metaDot}>·</Text>
                    <Text style={s.metaText} numberOfLines={1}>{item.city}{item.region ? `, ${item.region}` : ''}</Text>
                  </View>
                </View>
              </>
            )}
          </Pressable>
        )}
      />

      {!overlayHidden && (
        <View style={s.topBar} pointerEvents="box-none">
          <View style={s.brandWrap}>
            <Text style={s.brand}>selbrucivo</Text>
            <Text style={s.counter}>{String(index + 1).padStart(2, '0')} · {String(items.length).padStart(2, '0')}</Text>
          </View>
          <View style={s.scopeRow}>
            <Pressable
              testID="scope-local"
              onPress={() => setScope('local')}
              style={[s.scopeBtn, scope === 'local' && s.scopeBtnActive]}
            >
              <Text style={[s.scopeBtnText, scope === 'local' && s.scopeBtnTextActive]}>Local</Text>
            </Pressable>
            <Pressable
              testID="scope-global"
              onPress={() => setScope('global')}
              style={[s.scopeBtn, scope === 'global' && s.scopeBtnActive]}
            >
              <Text style={[s.scopeBtnText, scope === 'global' && s.scopeBtnTextActive]}>Global</Text>
            </Pressable>
          </View>
          <View style={s.guildRow}>
            <GuildPill label="All" active={!guildFilter} onPress={() => setGuildFilter(null)} testID="guild-filter-all" />
            <GuildPill label="Ill" active={guildFilter === 'illustrator'} onPress={() => setGuildFilter('illustrator')} testID="guild-filter-ill" />
            <GuildPill label="Anim" active={guildFilter === 'animator'} onPress={() => setGuildFilter('animator')} testID="guild-filter-anim" />
            <GuildPill label="Des" active={guildFilter === 'designer'} onPress={() => setGuildFilter('designer')} testID="guild-filter-des" />
          </View>
        </View>
      )}
    </View>
  );
}

function GuildPill({ label, active, onPress, testID }: { label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[s.pill, active && s.pillActive]}>
      <Text style={[s.pillText, active && s.pillTextActive]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  loadText: { color: '#7a7568', marginTop: 16, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' },
  emptyEyebrow: { color: '#4a4738', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  emptyTitle: { color: '#f3ecd9', fontSize: 28, fontWeight: '300', marginTop: 12 },
  emptyBody: { color: '#7a7568', fontSize: 14, textAlign: 'center', marginTop: 14, lineHeight: 22 },
  uploadBtn: { marginTop: 28, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: '#d6c9a8', borderRadius: 2 },
  uploadBtnText: { color: '#0a0a0c', letterSpacing: 3, textTransform: 'uppercase', fontSize: 11, fontWeight: '600' },
  topShade: { position: 'absolute', top: 0, left: 0, right: 0, height: 240, backgroundColor: 'rgba(0,0,0,0.5)' },
  bottomShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 280, backgroundColor: 'rgba(0,0,0,0.65)' },
  metaBlock: { position: 'absolute', left: 28, right: 28, bottom: 28 },
  title: { color: '#f3ecd9', fontSize: 28, fontWeight: '300', letterSpacing: -0.5, lineHeight: 32 },
  creator: { color: '#d6c9a8', fontSize: 13, marginTop: 8, letterSpacing: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  metaGlyph: { color: '#d6c9a8', fontSize: 14 },
  metaText: { color: '#9c978a', fontSize: 11, letterSpacing: 2 },
  metaDot: { color: '#4a4738', marginHorizontal: 2 },
  topBar: { position: 'absolute', top: 56, left: 0, right: 0, paddingHorizontal: 24 },
  brandWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: '#d6c9a8', fontSize: 12, letterSpacing: 4, textTransform: 'uppercase' },
  counter: { color: '#7a7568', fontSize: 11, letterSpacing: 3 },
  scopeRow: { flexDirection: 'row', marginTop: 14, gap: 6 },
  scopeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(214,201,168,0.25)', backgroundColor: 'rgba(10,10,12,0.5)' },
  scopeBtnActive: { backgroundColor: 'rgba(214,201,168,0.85)', borderColor: '#d6c9a8' },
  scopeBtnText: { color: '#d6c9a8', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  scopeBtnTextActive: { color: '#0a0a0c', fontWeight: '600' },
  guildRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(214,201,168,0.2)', backgroundColor: 'rgba(10,10,12,0.45)' },
  pillActive: { backgroundColor: 'rgba(214,201,168,0.18)', borderColor: '#d6c9a8' },
  pillText: { color: '#9c978a', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase' },
  pillTextActive: { color: '#f3ecd9', fontWeight: '600' },
});
