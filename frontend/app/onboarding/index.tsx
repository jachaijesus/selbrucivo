import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';

type Guild = 'illustrator' | 'animator' | 'designer';

const GUILDS: { key: Guild; label: string; sigil: string; charge: string }[] = [
  { key: 'illustrator', label: "Illustrator's Guild", sigil: '✦', charge: 'Drawn line. Painted folio. Hand-rendered narrative.' },
  { key: 'animator', label: "Animator's Guild", sigil: '◐', charge: 'Frames in sequence. Motion as memory. Time as material.' },
  { key: 'designer', label: "Designer's Guild", sigil: '▣', charge: 'Type, system, form. The grammar of visual order.' },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<'guild' | 'place' | 'review'>('guild');
  const [guild, setGuild] = useState<Guild | null>(null);
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [locating, setLocating] = useState(false);

  const requestLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Place unknown', 'Location was declined. You may enter your city manually.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      try {
        const places = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        const p = places?.[0];
        if (p) {
          setCity(p.city || p.subregion || '');
          setRegion(p.region || '');
          setCountry(p.country || '');
        }
      } catch {
        /* manual fallback */
      }
    } catch (e: any) {
      Alert.alert('Place unknown', 'Could not read location. Enter manually.');
    } finally {
      setLocating(false);
    }
  };

  const submit = async () => {
    if (!guild) return setStep('guild');
    if (!city || !country) {
      Alert.alert('Place required', 'City and country are needed to assign your local library.');
      return;
    }
    setSubmitting(true);
    try {
      const data = await api.post('/api/auth/onboarding', {
        guild,
        city,
        region,
        country,
        latitude: coords?.lat ?? null,
        longitude: coords?.lon ?? null,
      });
      await storage.setItem('library', JSON.stringify(data.library));
      router.replace({ pathname: '/onboarding/ceremony', params: { guild, city, lib: data.library.slug } } as any);
    } catch (e: any) {
      Alert.alert('Could not assign', e?.response?.data?.detail || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scroll} testID="onboarding-screen">
      <Text style={styles.eyebrow}>onboarding · 1 of 1</Text>
      <Text style={styles.title}>Welcome to{'\n'}the archive.</Text>
      <View style={styles.rule} />

      {step === 'guild' && (
        <>
          <Text style={styles.section}>Pick your guild</Text>
          <Text style={styles.helper}>One vocation. It will shape your local library.</Text>
          <View style={{ marginTop: 24 }}>
            {GUILDS.map((g) => (
              <Pressable
                key={g.key}
                testID={`guild-${g.key}`}
                onPress={() => setGuild(g.key)}
                style={({ pressed }) => [styles.guildCard, guild === g.key && styles.guildCardActive, pressed && { opacity: 0.85 }]}
              >
                <Text style={styles.guildSigil}>{g.sigil}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guildLabel}>{g.label}</Text>
                  <Text style={styles.guildCharge}>{g.charge}</Text>
                </View>
              </Pressable>
            ))}
          </View>
          <Pressable
            testID="onboarding-next-place"
            disabled={!guild}
            onPress={() => setStep('place')}
            style={({ pressed }) => [styles.cta, !guild && styles.ctaDisabled, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </>
      )}

      {step === 'place' && (
        <>
          <Text style={styles.section}>Your place</Text>
          <Text style={styles.helper}>Your local library is your city. Allow location, or write it in yourself.</Text>

          <Pressable testID="onboarding-locate" style={styles.locateBtn} onPress={requestLocation} disabled={locating}>
            {locating ? <ActivityIndicator color="#d6c9a8" /> : <Text style={styles.locateText}>{coords ? '✓ Place detected' : 'Detect place'}</Text>}
          </Pressable>

          <Text style={styles.label}>City</Text>
          <TextInput testID="onboarding-city" style={styles.input} value={city} onChangeText={setCity} placeholder="Tampa" placeholderTextColor="#4a4738" />

          <Text style={styles.label}>Region / State</Text>
          <TextInput testID="onboarding-region" style={styles.input} value={region} onChangeText={setRegion} placeholder="FL" placeholderTextColor="#4a4738" />

          <Text style={styles.label}>Country</Text>
          <TextInput testID="onboarding-country" style={styles.input} value={country} onChangeText={setCountry} placeholder="USA" placeholderTextColor="#4a4738" />

          <View style={{ flexDirection: 'row', gap: 12, marginTop: 36 }}>
            <Pressable style={styles.backBtn} onPress={() => setStep('guild')}>
              <Text style={styles.backBtnText}>Back</Text>
            </Pressable>
            <Pressable
              testID="onboarding-submit"
              onPress={submit}
              disabled={submitting}
              style={({ pressed }) => [styles.cta, { flex: 1 }, pressed && styles.ctaPressed]}
            >
              {submitting ? <ActivityIndicator color="#0a0a0c" /> : <Text style={styles.ctaText}>Assign me</Text>}
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  scroll: { paddingHorizontal: 32, paddingTop: 80, paddingBottom: 80 },
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  title: { color: '#f3ecd9', fontSize: 38, lineHeight: 44, fontWeight: '300', marginTop: 12, letterSpacing: -0.5 },
  rule: { height: 1, backgroundColor: '#1f1e1a', marginVertical: 32, width: 72 },
  section: { color: '#d6c9a8', fontSize: 14, letterSpacing: 3, textTransform: 'uppercase' },
  helper: { color: '#7a7568', fontSize: 13, marginTop: 8, lineHeight: 20 },
  guildCard: { flexDirection: 'row', alignItems: 'flex-start', padding: 22, borderWidth: 1, borderColor: '#1f1e1a', borderRadius: 4, marginBottom: 14, gap: 18, backgroundColor: '#0e0e10' },
  guildCardActive: { borderColor: '#d6c9a8', backgroundColor: '#141312' },
  guildSigil: { color: '#d6c9a8', fontSize: 26, lineHeight: 28, width: 32 },
  guildLabel: { color: '#f3ecd9', fontSize: 16, fontWeight: '500', marginBottom: 4 },
  guildCharge: { color: '#7a7568', fontSize: 12, lineHeight: 18 },
  label: { fontSize: 10, letterSpacing: 3, color: '#6e6a5e', textTransform: 'uppercase', marginBottom: 8, marginTop: 18 },
  input: { borderBottomWidth: 1, borderBottomColor: '#2a2820', color: '#f3ecd9', fontSize: 16, paddingVertical: 12 },
  locateBtn: { marginTop: 22, padding: 16, borderWidth: 1, borderColor: '#2a2820', borderStyle: 'dashed', alignItems: 'center', borderRadius: 2 },
  locateText: { color: '#d6c9a8', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' },
  cta: { marginTop: 36, backgroundColor: '#d6c9a8', height: 52, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { backgroundColor: '#2a2820' },
  ctaPressed: { backgroundColor: '#c2b58f' },
  ctaText: { color: '#0a0a0c', letterSpacing: 3, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
  backBtn: { paddingHorizontal: 24, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a2820', borderRadius: 2 },
  backBtnText: { color: '#d6c9a8', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase' },
});
