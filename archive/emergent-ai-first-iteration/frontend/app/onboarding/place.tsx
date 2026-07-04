import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

export default function PlaceStep() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
        if (p) { setCity(p.city || p.subregion || ''); setRegion(p.region || ''); setCountry(p.country || ''); }
      } catch { /* manual */ }
    } catch {
      Alert.alert('Place unknown', 'Could not read location. Enter manually.');
    } finally { setLocating(false); }
  };

  const submit = async () => {
    if (!city || !country) return Alert.alert('Place required', 'City and country are needed.');
    const guild = await storage.getItem('onboarding_guild');
    if (!guild) { router.replace('/onboarding/guild'); return; }
    setSubmitting(true);
    try {
      const data = await api.post('/api/auth/onboarding', {
        guild, city, region, country,
        latitude: coords?.lat ?? null, longitude: coords?.lon ?? null,
      });
      await storage.setItem('library', JSON.stringify(data.library));
      router.replace({ pathname: '/onboarding/ceremony', params: { guild, city, region, country } } as any);
    } catch (e: any) {
      Alert.alert('Could not assign', e?.response?.data?.detail || 'Unknown error');
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="onboarding-place">
      <FadeIn duration={900}>
        <Text style={s.catalog}>fol. iv · your place</Text>
        <Text style={s.title}>Where are{'\n'}<Text style={s.italic}>you reading from?</Text></Text>
        <View style={s.rule} />
        <Text style={s.helper}>Your local library is your city. Selbrucivo organizes archives through Local Libraries — Tampa · Bangkok · Paris · the place that holds you.</Text>
      </FadeIn>

      <FadeIn duration={900} delay={300}>
        <Pressable testID="place-locate" style={s.locateBtn} onPress={requestLocation} disabled={locating}>
          {locating ? <ActivityIndicator color={palette.parchment} /> : <Text style={s.locateText}>{coords ? '·  place detected  ·' : 'allow location'}</Text>}
        </Pressable>

        <Text style={s.fieldLabel}>City</Text>
        <TextInput testID="place-city" style={s.input} value={city} onChangeText={setCity} placeholder="Tampa" placeholderTextColor={palette.faint} />
        <Text style={s.fieldLabel}>Region / state</Text>
        <TextInput testID="place-region" style={s.input} value={region} onChangeText={setRegion} placeholder="FL" placeholderTextColor={palette.faint} />
        <Text style={s.fieldLabel}>Country</Text>
        <TextInput testID="place-country" style={s.input} value={country} onChangeText={setCountry} placeholder="USA" placeholderTextColor={palette.faint} />
      </FadeIn>

      <View style={{ height: space.xxl }} />

      <View style={{ flexDirection: 'row', gap: space.m }}>
        <Pressable style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </Pressable>
        <Pressable
          testID="place-continue"
          onPress={submit}
          disabled={submitting}
          style={({ pressed }) => [s.cta, { flex: 1 }, pressed && s.ctaPressed]}
        >
          {submitting ? <ActivityIndicator color={palette.ink} /> : <Text style={s.ctaText}>Assign me</Text>}
        </Pressable>
      </View>
      <Text style={s.footnote}>fol. iv / vii</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.mega, paddingBottom: space.xxl, maxWidth: 560, alignSelf: 'stretch', width: '100%' },
  catalog: { ...type.catalog, color: palette.faint },
  title: { fontFamily: fonts.display, fontSize: 36, color: palette.paper, marginTop: space.s, lineHeight: 42, letterSpacing: -0.4 },
  italic: { fontStyle: 'italic', color: palette.coral },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.l, width: 64 },
  helper: { fontFamily: fonts.display, fontStyle: 'italic', color: palette.dim, fontSize: 14, lineHeight: 22 },
  locateBtn: { marginTop: space.l, padding: space.base, borderWidth: 1, borderColor: palette.rule, borderStyle: 'dashed', alignItems: 'center' },
  locateText: { fontFamily: fonts.mono, color: palette.parchment, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  fieldLabel: { ...type.label, marginBottom: space.s, marginTop: space.base },
  input: { borderBottomWidth: 1, borderBottomColor: palette.rule, color: palette.paper, fontSize: 16, paddingVertical: space.m, fontFamily: fonts.sans },
  cta: { backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { fontFamily: fonts.mono, color: palette.ink, fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', fontWeight: '600' },
  backBtn: { paddingHorizontal: space.l, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.rule },
  backText: { fontFamily: fonts.mono, color: palette.parchment, fontSize: 11, letterSpacing: 3, textTransform: 'uppercase' },
  footnote: { ...type.catalog, color: palette.faint, fontSize: 9, marginTop: space.base, textAlign: 'center' },
});
