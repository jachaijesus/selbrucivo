import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';

const GUILD_TITLE: Record<string, string> = {
  illustrator: "Illustrator's Guild",
  animator: "Animator's Guild",
  designer: "Designer's Guild",
};

type Me = {
  id: string;
  username: string;
  guild: string;
  city: string;
  region: string;
  country: string;
  created_at: string;
};

type Artwork = {
  id: string;
  title: string;
  status: string;
  uploaded_at: string;
  reject_reason: string | null;
};

export default function Profile() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [mine, setMine] = useState<Artwork[]>([]);

  const load = useCallback(async () => {
    try {
      const [u, m] = await Promise.all([api.get<Me>('/api/auth/me'), api.get<Artwork[]>('/api/artworks/mine')]);
      setMe(u);
      setMine(m);
    } catch {}
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const logout = async () => {
    await storage.removeItem('auth_token');
    await storage.removeItem('user');
    router.replace('/auth/login');
  };

  if (!me) return <View style={[s.root, s.center]}><Text style={s.dim}>…</Text></View>;

  const approved = mine.filter((a) => a.status === 'approved').length;
  const pending = mine.filter((a) => a.status === 'pending').length;
  const rejected = mine.filter((a) => a.status === 'rejected').length;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="profile-screen">
      <Text style={s.eyebrow}>identifier</Text>
      <Text style={s.handle}>{me.username}</Text>
      <Text style={s.guildLine}>{GUILD_TITLE[me.guild] || me.guild} · {me.city}</Text>
      <View style={s.rule} />

      <Text style={s.section}>Your inscriptions</Text>
      <View style={s.statRow}>
        <Stat label="Archived" value={approved} testID="profile-stat-approved" />
        <Stat label="Pending" value={pending} testID="profile-stat-pending" />
        <Stat label="Withheld" value={rejected} testID="profile-stat-rejected" />
      </View>

      <View style={{ marginTop: 18 }}>
        {mine.length === 0 ? (
          <Text style={s.dim}>No inscriptions yet.</Text>
        ) : (
          mine.map((a) => (
            <View key={a.id} style={s.row} testID={`profile-artwork-${a.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{a.title}</Text>
                <Text style={s.rowMeta}>{a.uploaded_at?.slice(0, 10)}</Text>
                {a.status === 'rejected' && a.reject_reason ? (
                  <Text style={s.rowReason}>{a.reject_reason}</Text>
                ) : null}
              </View>
              <Text style={[s.statusTag, a.status === 'approved' && s.statusApproved, a.status === 'pending' && s.statusPending, a.status === 'rejected' && s.statusRejected]}>
                {a.status}
              </Text>
            </View>
          ))
        )}
      </View>

      <Pressable testID="logout-button" style={s.logout} onPress={() => Alert.alert('Leave the archive?', 'You can return any time.', [{ text: 'Stay' }, { text: 'Leave', style: 'destructive', onPress: logout }])}>
        <Text style={s.logoutText}>Leave the archive</Text>
      </Pressable>
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
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  scroll: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 120 },
  center: { alignItems: 'center', justifyContent: 'center' },
  dim: { color: '#7a7568', fontSize: 13 },
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  handle: { color: '#f3ecd9', fontSize: 32, fontWeight: '300', marginTop: 8 },
  guildLine: { color: '#9c978a', fontSize: 13, marginTop: 6 },
  rule: { height: 1, backgroundColor: '#1f1e1a', width: 64, marginVertical: 24 },
  section: { color: '#d6c9a8', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 14 },
  statRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, padding: 14, borderWidth: 1, borderColor: '#1f1e1a' },
  statValue: { color: '#f3ecd9', fontSize: 22, fontWeight: '300' },
  statLabel: { color: '#6e6a5e', fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1a1a1c', paddingVertical: 16 },
  rowTitle: { color: '#f3ecd9', fontSize: 15 },
  rowMeta: { color: '#6e6a5e', fontSize: 11, marginTop: 4 },
  rowReason: { color: '#a06868', fontSize: 11, fontStyle: 'italic', marginTop: 4 },
  statusTag: { fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  statusApproved: { color: '#d6c9a8', borderColor: '#d6c9a8' },
  statusPending: { color: '#9c978a', borderColor: '#3a3830' },
  statusRejected: { color: '#a06868', borderColor: '#3a2828' },
  logout: { marginTop: 48, alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#2a2820' },
  logoutText: { color: '#7a7568', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
});
