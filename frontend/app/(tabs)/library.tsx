import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';

type Lib = {
  id: string;
  city: string;
  region: string;
  country: string;
  member_count: number;
  guild_counts: { illustrator: number; animator: number; designer: number };
  is_global: boolean;
  global_thresholds: { total: number; per_guild: number };
  approved_artwork_count?: number;
};

type Metrics = {
  total_members: number;
  total_local_libraries: number;
  global_libraries: number;
  approved_artworks: number;
  guild_distribution: { illustrator: number; animator: number; designer: number };
};

export default function Library() {
  const [lib, setLib] = useState<Lib | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [l, m] = await Promise.all([api.get<Lib>('/api/library/me'), api.get<Metrics>('/api/metrics/global')]);
      setLib(l);
      setMetrics(m);
    } catch {
      setLib(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={[s.root, s.center]}><ActivityIndicator color="#d6c9a8" /></View>
    );
  }
  if (!lib) {
    return <View style={[s.root, s.center]}><Text style={s.empty}>No library record.</Text></View>;
  }

  const progressTotal = Math.min(1, lib.member_count / lib.global_thresholds.total);
  const progressIll = Math.min(1, lib.guild_counts.illustrator / lib.global_thresholds.per_guild);
  const progressAnim = Math.min(1, lib.guild_counts.animator / lib.global_thresholds.per_guild);
  const progressDes = Math.min(1, lib.guild_counts.designer / lib.global_thresholds.per_guild);

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="library-screen">
      <Text style={s.eyebrow}>local library</Text>
      <Text style={s.city}>{lib.city}</Text>
      <Text style={s.subloc}>{lib.region ? `${lib.region} · ` : ''}{lib.country}</Text>
      <View style={s.rule} />

      <View style={s.statusRow}>
        <View style={[s.statusBadge, lib.is_global && s.statusBadgeGlobal]} testID="library-status-badge">
          <Text style={[s.statusText, lib.is_global && s.statusTextGlobal]}>
            {lib.is_global ? '◉ global' : '○ local'}
          </Text>
        </View>
        <Text style={s.approved}>{lib.approved_artwork_count ?? 0} works archived</Text>
      </View>

      <Text style={s.section}>Membership</Text>
      <View style={s.statGrid}>
        <Stat label="Members" value={lib.member_count} />
        <Stat label="Illustrators" value={lib.guild_counts.illustrator} />
        <Stat label="Animators" value={lib.guild_counts.animator} />
        <Stat label="Designers" value={lib.guild_counts.designer} />
      </View>

      <Text style={s.section}>Path to global archive</Text>
      <Text style={s.helper}>3,000 members across the three guilds—1,000 of each—unlocks cross-regional visibility.</Text>

      <ProgressLine label={`Total ${lib.member_count} / ${lib.global_thresholds.total}`} value={progressTotal} />
      <ProgressLine label={`Illustrators ${lib.guild_counts.illustrator} / ${lib.global_thresholds.per_guild}`} value={progressIll} />
      <ProgressLine label={`Animators ${lib.guild_counts.animator} / ${lib.global_thresholds.per_guild}`} value={progressAnim} />
      <ProgressLine label={`Designers ${lib.guild_counts.designer} / ${lib.global_thresholds.per_guild}`} value={progressDes} />

      {metrics && (
        <>
          <Text style={[s.section, { marginTop: 36 }]}>Network</Text>
          <View style={s.statGrid}>
            <Stat label="Local libraries" value={metrics.total_local_libraries} />
            <Stat label="Global libraries" value={metrics.global_libraries} />
            <Stat label="Archived works" value={metrics.approved_artworks} />
            <Stat label="Total members" value={metrics.total_members} />
          </View>
        </>
      )}
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

function ProgressLine({ label, value }: { label: string; value: number }) {
  return (
    <View style={s.progWrap}>
      <Text style={s.progLabel}>{label}</Text>
      <View style={s.progTrack}><View style={[s.progFill, { width: `${value * 100}%` }]} /></View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  scroll: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 120 },
  center: { alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#7a7568' },
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  city: { color: '#f3ecd9', fontSize: 40, fontWeight: '300', marginTop: 8 },
  subloc: { color: '#7a7568', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginTop: 4 },
  rule: { height: 1, backgroundColor: '#1f1e1a', width: 64, marginVertical: 28 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2820', borderRadius: 999 },
  statusBadgeGlobal: { backgroundColor: '#d6c9a8', borderColor: '#d6c9a8' },
  statusText: { color: '#7a7568', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  statusTextGlobal: { color: '#0a0a0c', fontWeight: '600' },
  approved: { color: '#9c978a', fontSize: 12 },
  section: { color: '#d6c9a8', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', marginTop: 36, marginBottom: 14 },
  helper: { color: '#7a7568', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '47%', padding: 18, borderWidth: 1, borderColor: '#1f1e1a', borderRadius: 2 },
  statValue: { color: '#f3ecd9', fontSize: 26, fontWeight: '300' },
  statLabel: { color: '#6e6a5e', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  progWrap: { marginBottom: 14 },
  progLabel: { color: '#9c978a', fontSize: 11, letterSpacing: 1, marginBottom: 6 },
  progTrack: { height: 2, backgroundColor: '#1f1e1a', borderRadius: 1 },
  progFill: { height: 2, backgroundColor: '#d6c9a8', borderRadius: 1 },
});
