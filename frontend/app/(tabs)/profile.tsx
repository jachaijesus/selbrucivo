import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

const GUILD_TITLE: Record<string, string> = {
  illustrator: "Illustrator's Guild",
  animator: "Animator's Guild",
  designer: "Designer's Guild",
};

type Me = { id: string; username: string; guild: string; city: string; region: string; country: string; created_at: string };
type Artwork = { id: string; title: string; status: string; uploaded_at: string; reject_reason: string | null };

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [mine, setMine] = useState<Artwork[]>([]);

  const load = useCallback(async () => {
    try {
      const [u, m] = await Promise.all([api.get<Me>('/api/auth/me'), api.get<Artwork[]>('/api/artworks/mine')]);
      setMe(u); setMine(m);
    } catch {}
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => {
    await storage.removeItem('auth_token');
    await storage.removeItem('user');
    router.replace('/auth/login');
  };

  if (!me) return <View style={[s.root, s.center]}><Text style={s.dim}>—</Text></View>;
  const approved = mine.filter((a) => a.status === 'approved').length;
  const pending = mine.filter((a) => a.status === 'pending').length;
  const rejected = mine.filter((a) => a.status === 'rejected').length;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="profile-screen">
      <FadeIn>
        <Text style={s.catalog}>identifier · personal record</Text>
        <Text style={s.handle}>{me.username}</Text>
        <Text style={s.guildLine}>{GUILD_TITLE[me.guild] || me.guild}</Text>
        <Text style={s.cityLine}>{[me.city, me.region, me.country].filter(Boolean).join(' · ').toUpperCase()}</Text>
        <View style={s.rule} />
      </FadeIn>

      <FadeIn delay={100}>
        <Text style={s.section}>Your inscriptions</Text>
        <View style={s.statRow}>
          <Stat label="Archived" value={approved} testID="profile-stat-approved" />
          <Stat label="Pending" value={pending} testID="profile-stat-pending" />
          <Stat label="Withheld" value={rejected} testID="profile-stat-rejected" />
        </View>

        <View style={{ marginTop: space.l }}>
          {mine.length === 0 ? (
            <Text style={s.empty}>No inscriptions yet.</Text>
          ) : mine.map((a) => (
            <View key={a.id} style={s.row} testID={`profile-artwork-${a.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{a.title}</Text>
                <Text style={s.rowMeta}>{a.uploaded_at?.slice(0, 10)}</Text>
                {a.status === 'rejected' && a.reject_reason ? <Text style={s.rowReason}>“{a.reject_reason}”</Text> : null}
              </View>
              <Text style={[s.statusTag, a.status === 'approved' && s.statusApproved, a.status === 'pending' && s.statusPending, a.status === 'rejected' && s.statusRejected]}>
                {a.status}
              </Text>
            </View>
          ))}
        </View>

        <Pressable testID="logout-button" style={s.logout} onPress={() => Alert.alert('Leave the archive?', 'You can return any time.', [{ text: 'Stay' }, { text: 'Leave', style: 'destructive', onPress: logout }])}>
          <Text style={s.logoutText}>Leave the archive</Text>
        </Pressable>
      </FadeIn>
    </ScrollView>
  );
}

function Stat({ label, value, testID }: { label: string; value: number; testID?: string }) {
  return (
    <View style={s.stat} testID={testID}>
      <Text style={s.statValue}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: 80, paddingBottom: 120 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { color: palette.dim, fontSize: 13 },
  catalog: { ...type.catalog },
  handle: { fontFamily: fonts.display, fontSize: 44, color: palette.paper, marginTop: space.s, fontStyle: 'italic', letterSpacing: -0.4 },
  guildLine: { fontFamily: fonts.display, color: palette.coral, fontSize: 18, marginTop: space.s, fontStyle: 'italic' },
  cityLine: { fontFamily: fonts.mono, color: palette.gunsmoke, fontSize: 10, letterSpacing: 3, marginTop: space.xs },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.l, width: 64 },
  section: { ...type.label, marginBottom: space.base },
  statRow: { flexDirection: 'row', gap: space.m },
  stat: { flex: 1, paddingVertical: space.base, borderTopWidth: 1, borderTopColor: palette.rule },
  statValue: { fontFamily: fonts.display, fontSize: 28, color: palette.paper, fontStyle: 'italic' },
  statLabel: { fontFamily: fonts.mono, color: palette.dim, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginTop: space.xs },
  empty: { color: palette.dim, fontFamily: fonts.display, fontStyle: 'italic', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: palette.rule, paddingVertical: space.base },
  rowTitle: { fontFamily: fonts.display, color: palette.paper, fontSize: 18 },
  rowMeta: { fontFamily: fonts.mono, color: palette.dim, fontSize: 10, letterSpacing: 1, marginTop: space.xs },
  rowReason: { color: palette.coral, fontFamily: fonts.display, fontStyle: 'italic', fontSize: 12, marginTop: space.xs },
  statusTag: { fontFamily: fonts.mono, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', paddingHorizontal: space.s, paddingVertical: 3 },
  statusApproved: { color: palette.paper, backgroundColor: 'rgba(244,236,218,0.12)' },
  statusPending: { color: palette.parchment, backgroundColor: 'rgba(244,236,218,0.05)' },
  statusRejected: { color: palette.paper, backgroundColor: palette.coral },
  logout: { marginTop: space.xxl, alignItems: 'center', paddingVertical: space.base, borderTopWidth: 1, borderTopColor: palette.rule },
  logoutText: { fontFamily: fonts.mono, color: palette.dim, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
});
