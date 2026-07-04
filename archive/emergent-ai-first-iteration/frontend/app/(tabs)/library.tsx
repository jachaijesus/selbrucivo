import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

type Lib = {
  id: string; city: string; region: string; country: string;
  member_count: number;
  guild_counts: { illustrator: number; animator: number; designer: number };
  is_global: boolean;
  global_thresholds: { total: number; per_guild: number };
  approved_artwork_count?: number;
};
type Metrics = { total_members: number; total_local_libraries: number; global_libraries: number; approved_artworks: number; guild_distribution: any };

export default function Library() {
  const [lib, setLib] = useState<Lib | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.all([api.get<Lib>('/api/library/me'), api.get<Metrics>('/api/metrics/global')]);
      setLib(l); setMetrics(m);
    } catch { setLib(null); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={[s.root, s.center]}><ActivityIndicator color={palette.parchment} /></View>;
  if (!lib) return <View style={[s.root, s.center]}><Text style={s.empty}>No library record.</Text></View>;

  const pTot = Math.min(1, lib.member_count / lib.global_thresholds.total);
  const pI = Math.min(1, lib.guild_counts.illustrator / lib.global_thresholds.per_guild);
  const pA = Math.min(1, lib.guild_counts.animator / lib.global_thresholds.per_guild);
  const pD = Math.min(1, lib.guild_counts.designer / lib.global_thresholds.per_guild);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="library-screen">
      <FadeIn>
        <Text style={s.catalog}>local library · fol. {lib.is_global ? 'iv' : 'ii'}</Text>
        <Text style={s.city}>{lib.city}</Text>
        <Text style={s.subloc}>{[lib.region, lib.country].filter(Boolean).join(' · ').toUpperCase()}</Text>
        <View style={s.rule} />
      </FadeIn>

      <FadeIn delay={120}>
        <View style={s.statusRow}>
          <View style={[s.badge, lib.is_global && s.badgeGlobal]} testID="library-status-badge">
            <Text style={[s.badgeText, lib.is_global && s.badgeTextGlobal]}>{lib.is_global ? '◉  global' : '○  local'}</Text>
          </View>
          <Text style={s.archivedCount}>{lib.approved_artwork_count ?? 0} works archived</Text>
        </View>

        <Text style={s.section}>Membership</Text>
        <View style={s.statGrid}>
          <Stat label="Members" value={lib.member_count} />
          <Stat label="Illustrators" value={lib.guild_counts.illustrator} />
          <Stat label="Animators" value={lib.guild_counts.animator} />
          <Stat label="Designers" value={lib.guild_counts.designer} />
        </View>

        <Text style={s.section}>Path to global archive</Text>
        <Text style={s.helper}>Three thousand members. One thousand of each guild. Then the local library joins the network.</Text>

        <ProgressLine label="total" current={lib.member_count} target={lib.global_thresholds.total} value={pTot} />
        <ProgressLine label="illustrators" current={lib.guild_counts.illustrator} target={lib.global_thresholds.per_guild} value={pI} />
        <ProgressLine label="animators" current={lib.guild_counts.animator} target={lib.global_thresholds.per_guild} value={pA} />
        <ProgressLine label="designers" current={lib.guild_counts.designer} target={lib.global_thresholds.per_guild} value={pD} />

        {metrics && (
          <>
            <Text style={s.section}>The network</Text>
            <View style={s.statGrid}>
              <Stat label="Local libraries" value={metrics.total_local_libraries} />
              <Stat label="Global libraries" value={metrics.global_libraries} />
              <Stat label="Archived works" value={metrics.approved_artworks} />
              <Stat label="Total members" value={metrics.total_members} />
            </View>
          </>
        )}
      </FadeIn>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.stat}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function ProgressLine({ label, current, target, value }: { label: string; current: number; target: number; value: number }) {
  return (
    <View style={s.progWrap}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={s.progLabel}>{label}</Text>
        <Text style={s.progNum}>{current} / {target}</Text>
      </View>
      <View style={s.progTrack}><View style={[s.progFill, { width: `${value * 100}%` }]} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: 80, paddingBottom: 120 },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { color: palette.dim },
  catalog: { ...type.catalog },
  city: { fontFamily: fonts.display, color: palette.paper, fontSize: 52, fontStyle: 'italic', marginTop: space.s, letterSpacing: -0.8, lineHeight: 56 },
  subloc: { fontFamily: fonts.mono, color: palette.gunsmoke, fontSize: 10, letterSpacing: 3, marginTop: space.xs },
  rule: { height: 1, backgroundColor: palette.rule, width: 64, marginVertical: space.l },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.l },
  badge: { paddingHorizontal: space.m, paddingVertical: 5, borderWidth: 1, borderColor: palette.rule },
  badgeGlobal: { backgroundColor: palette.coral, borderColor: palette.coral },
  badgeText: { fontFamily: fonts.mono, fontSize: 10, letterSpacing: 2, color: palette.dim, textTransform: 'uppercase' },
  badgeTextGlobal: { color: palette.paper },
  archivedCount: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.parchment, fontSize: 14 },
  section: { ...type.label, marginTop: space.xl, marginBottom: space.m, color: palette.parchment, fontSize: 11 },
  helper: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 14, lineHeight: 22, marginBottom: space.base },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.m },
  stat: { flexBasis: '47%', paddingVertical: space.base, borderTopWidth: 1, borderTopColor: palette.rule },
  statValue: { fontFamily: fonts.display, fontSize: 30, color: palette.paper, fontStyle: 'italic' },
  statLabel: { fontFamily: fonts.mono, color: palette.dim, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginTop: space.xs },
  progWrap: { marginBottom: space.base },
  progLabel: { fontFamily: fonts.mono, color: palette.parchment, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  progNum: { fontFamily: fonts.mono, color: palette.dim, fontSize: 10, letterSpacing: 1 },
  progTrack: { height: 1, backgroundColor: palette.rule, marginTop: space.s },
  progFill: { height: 1, backgroundColor: palette.coral },
});
