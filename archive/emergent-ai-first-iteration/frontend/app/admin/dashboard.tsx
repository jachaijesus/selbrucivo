import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Image as RNImage, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';

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
  uploaded_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [pending, setPending] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<Artwork[]>('/api/admin/artworks/pending', { admin: true });
      setPending(data);
    } catch (e: any) {
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        router.replace('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const approve = async (id: string) => {
    try {
      await api.post(`/api/admin/artworks/${id}/approve`, {}, { admin: true });
      setPending((p) => p.filter((a) => a.id !== id));
    } catch (e: any) {
      Alert.alert('Could not approve', e?.response?.data?.detail || '');
    }
  };

  const reject = async (id: string) => {
    try {
      await api.post(`/api/admin/artworks/${id}/reject`, { reason: rejectReason }, { admin: true });
      setPending((p) => p.filter((a) => a.id !== id));
      setRejectingId(null);
      setRejectReason('');
    } catch (e: any) {
      Alert.alert('Could not withhold', e?.response?.data?.detail || '');
    }
  };

  const logout = async () => {
    await storage.removeItem('admin_token');
    router.replace('/admin/login');
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="admin-dashboard">
      <View style={s.header}>
        <View>
          <Text style={s.eyebrow}>curator review</Text>
          <Text style={s.title}>moderation queue</Text>
        </View>
        <Pressable testID="admin-logout" onPress={logout} style={s.logout}><Text style={s.logoutText}>Exit</Text></Pressable>
      </View>
      <View style={s.rule} />
      <Text style={s.countLabel}>{pending.length} works awaiting review</Text>

      {loading && <ActivityIndicator color="#d6c9a8" style={{ marginTop: 32 }} />}

      {!loading && pending.length === 0 && (
        <Text style={s.empty}>The queue is empty. The archive sleeps.</Text>
      )}

      {pending.map((a) => (
        <View key={a.id} style={s.card} testID={`pending-${a.id}`}>
          <RNImage source={{ uri: `data:${a.image_mime};base64,${a.image_base64}` }} style={s.thumb} resizeMode="cover" />
          <Text style={s.aTitle}>{a.title}</Text>
          <Text style={s.aMeta}>{a.creator_name} · {a.guild.toUpperCase()} · {a.city}</Text>
          <Text style={s.aMeta}>{a.width} × {a.height}</Text>
          {a.description ? <Text style={s.aDesc}>{a.description}</Text> : null}
          {a.tags?.length ? <Text style={s.aTags}>{a.tags.join(' · ')}</Text> : null}

          {rejectingId === a.id ? (
            <>
              <TextInput
                testID={`reject-reason-${a.id}`}
                style={s.reasonInput}
                value={rejectReason}
                onChangeText={setRejectReason}
                placeholder="Reason for withholding (optional)"
                placeholderTextColor="#4a4738"
              />
              <View style={s.actionRow}>
                <Pressable style={[s.btn, s.btnGhost]} onPress={() => { setRejectingId(null); setRejectReason(''); }}>
                  <Text style={s.btnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable testID={`confirm-reject-${a.id}`} style={[s.btn, s.btnReject]} onPress={() => reject(a.id)}>
                  <Text style={s.btnRejectText}>Withhold</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={s.actionRow}>
              <Pressable testID={`reject-${a.id}`} style={[s.btn, s.btnGhost]} onPress={() => setRejectingId(a.id)}>
                <Text style={s.btnGhostText}>Withhold</Text>
              </Pressable>
              <Pressable testID={`approve-${a.id}`} style={[s.btn, s.btnApprove]} onPress={() => approve(a.id)}>
                <Text style={s.btnApproveText}>Approve</Text>
              </Pressable>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  scroll: { paddingHorizontal: 24, paddingTop: 64, paddingBottom: 80 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  title: { color: '#f3ecd9', fontSize: 26, fontWeight: '300', marginTop: 4 },
  logout: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: '#2a2820' },
  logoutText: { color: '#9c978a', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' },
  rule: { height: 1, backgroundColor: '#1f1e1a', width: 64, marginVertical: 18 },
  countLabel: { color: '#7a7568', fontSize: 12, marginBottom: 16 },
  empty: { color: '#7a7568', fontSize: 13, fontStyle: 'italic', marginTop: 24 },
  card: { borderWidth: 1, borderColor: '#1f1e1a', backgroundColor: '#0e0e10', padding: 16, marginBottom: 18 },
  thumb: { width: '100%', aspectRatio: 9 / 16, backgroundColor: '#1a1a1c' },
  aTitle: { color: '#f3ecd9', fontSize: 18, marginTop: 14, fontWeight: '400' },
  aMeta: { color: '#9c978a', fontSize: 11, letterSpacing: 1, marginTop: 4 },
  aDesc: { color: '#7a7568', fontSize: 13, marginTop: 8, lineHeight: 20, fontStyle: 'italic' },
  aTags: { color: '#6e6a5e', fontSize: 11, marginTop: 6 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn: { flex: 1, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  btnGhost: { borderWidth: 1, borderColor: '#2a2820' },
  btnGhostText: { color: '#9c978a', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  btnApprove: { backgroundColor: '#d6c9a8' },
  btnApproveText: { color: '#0a0a0c', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '600' },
  btnReject: { backgroundColor: '#5a3030' },
  btnRejectText: { color: '#f3ecd9', fontSize: 11, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '600' },
  reasonInput: { borderBottomWidth: 1, borderBottomColor: '#2a2820', color: '#f3ecd9', fontSize: 14, paddingVertical: 10, marginTop: 12 },
});
