import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { palette, type, space, fonts } from '../../theme';
import { FadeIn } from '../../utils/motion';

type Guild = 'illustrator' | 'animator' | 'designer';

const GUILDS: { key: Guild; numeral: string; label: string; charge: string }[] = [
  { key: 'illustrator', numeral: 'I', label: 'Illustrator', charge: 'Drawn line. Painted folio. Hand-rendered narrative.' },
  { key: 'animator', numeral: 'II', label: 'Animator', charge: 'Frames in sequence. Motion as memory. Time as material.' },
  { key: 'designer', numeral: 'III', label: 'Designer', charge: 'Type, system, form. The grammar of visual order.' },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState<'guild' | 'place'>('guild');
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
        if (p) { setCity(p.city || p.subregion || ''); setRegion(p.region || ''); setCountry(p.country || ''); }
      } catch { /* manual */ }
    } catch {
      Alert.alert('Place unknown', 'Could not read location. Enter manually.');
    } finally { setLocating(false); }
  };

  const submit = async () => {
    if (!guild) return setStep('guild');
    if (!city || !country) return Alert.alert('Place required', 'City and country are needed.');
    setSubmitting(true);
    try {
      const data = await api.post('/api/auth/onboarding', {
        guild, city, region, country,
        latitude: coords?.lat ?? null, longitude: coords?.lon ?? null,
      });
      await storage.setItem('library', JSON.stringify(data.library));
      router.replace({ pathname: '/onboarding/ceremony', params: { guild, city, region } } as any);
    } catch (e: any) {
      Alert.alert('Could not assign', e?.response?.data?.detail || 'Unknown error');
    } finally { setSubmitting(false); }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="onboarding-screen">
      <FadeIn>
        <Text style={s.catalog}>fol. {step === 'guild' ? 'i' : 'ii'} · entrance</Text>
        <Text style={s.title}>Welcome to{'\n'}<Text style={s.titleItalic}>the archive.</Text></Text>
        <View style={s.rule} />
      </FadeIn>

      {step === 'guild' && (
        <FadeIn delay={120}>
          <Text style={s.section}>Pick your guild</Text>
          <Text style={s.helper}>One vocation. It shapes the works you will inscribe and the corner of the library that will hold them.</Text>

          <View style={{ marginTop: space.l }}>
            {GUILDS.map((g, i) => (
              <Pressable
                key={g.key}
                testID={`guild-${g.key}`}
                onPress={() => setGuild(g.key)}
                style={({ pressed }) => [s.guildCard, guild === g.key && s.guildCardActive, pressed && { opacity: 0.92 }]}
              >
                <Text style={[s.guildNumeral, guild === g.key && s.guildNumeralActive]}>{g.numeral}.</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.guildLabel, guild === g.key && s.guildLabelActive]}>{g.label}</Text>
                  <Text style={s.guildCharge}>{g.charge}</Text>
                </View>
              </Pressable>
            ))}
          </View>

          <Pressable
            testID="onboarding-next-place"
            disabled={!guild}
            onPress={() => setStep('place')}
            style={({ pressed }) => [s.cta, !guild && s.ctaDisabled, pressed && s.ctaPressed]}
          >
            <Text style={[s.ctaText, !guild && { color: palette.dim }]}>Continue</Text>
          </Pressable>
        </FadeIn>
      )}

      {step === 'place' && (
        <FadeIn delay={120}>
          <Text style={s.section}>Your place</Text>
          <Text style={s.helper}>Your local library is your city. Allow location, or write it in by hand.</Text>

          <Pressable testID="onboarding-locate" style={s.locateBtn} onPress={requestLocation} disabled={locating}>
            {locating
              ? <ActivityIndicator color={palette.parchment} />
              : <Text style={s.locateText}>{coords ? '·  place detected  ·' : 'detect place'}</Text>}
          </Pressable>

          <Text style={s.label}>City</Text>
          <TextInput testID="onboarding-city" style={s.input} value={city} onChangeText={setCity} placeholder="Tampa" placeholderTextColor={palette.faint} />
          <Text style={s.label}>Region / State</Text>
          <TextInput testID="onboarding-region" style={s.input} value={region} onChangeText={setRegion} placeholder="FL" placeholderTextColor={palette.faint} />
          <Text style={s.label}>Country</Text>
          <TextInput testID="onboarding-country" style={s.input} value={country} onChangeText={setCountry} placeholder="USA" placeholderTextColor={palette.faint} />

          <View style={{ flexDirection: 'row', gap: space.m, marginTop: space.xl }}>
            <Pressable style={s.backBtn} onPress={() => setStep('guild')}>
              <Text style={s.backBtnText}>← Back</Text>
            </Pressable>
            <Pressable testID="onboarding-submit" onPress={submit} disabled={submitting} style={({ pressed }) => [s.cta, { flex: 1, marginTop: 0 }, pressed && s.ctaPressed]}>
              {submitting ? <ActivityIndicator color={palette.ink} /> : <Text style={s.ctaText}>Assign me</Text>}
            </Pressable>
          </View>
        </FadeIn>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  scroll: { paddingHorizontal: space.xl, paddingTop: 80, paddingBottom: 80, maxWidth: 560, alignSelf: 'stretch', width: '100%' },
  catalog: { ...type.catalog },
  title: { ...type.displayL, color: palette.paper, marginTop: space.s, lineHeight: 48 },
  titleItalic: { fontStyle: 'italic', color: palette.coral, fontFamily: fonts.display },
  rule: { height: 1, backgroundColor: palette.rule, marginVertical: space.xl, width: 72 },
  section: { ...type.label, color: palette.parchment, fontSize: 11 },
  helper: { color: palette.dim, fontSize: 14, marginTop: space.s, lineHeight: 22, fontFamily: fonts.display, fontStyle: 'italic' },
  guildCard: { flexDirection: 'row', alignItems: 'flex-start', padding: space.l, borderBottomWidth: 1, borderBottomColor: palette.rule, gap: space.l, backgroundColor: 'transparent' },
  guildCardActive: { backgroundColor: 'rgba(192,78,85,0.06)', borderBottomColor: palette.coral },
  guildNumeral: { fontFamily: fonts.display, color: palette.dim, fontSize: 24, width: 36, fontStyle: 'italic' },
  guildNumeralActive: { color: palette.coral },
  guildLabel: { fontFamily: fonts.display, color: palette.paper, fontSize: 24, marginBottom: space.xs, letterSpacing: -0.2 },
  guildLabelActive: { color: palette.paper },
  guildCharge: { color: palette.dim, fontSize: 12, lineHeight: 19, fontFamily: fonts.sans },
  label: { ...type.label, marginBottom: space.s, marginTop: space.base },
  input: { borderBottomWidth: 1, borderBottomColor: palette.rule, color: palette.paper, fontSize: 16, paddingVertical: space.m, fontFamily: fonts.sans },
  locateBtn: { marginTop: space.l, padding: space.base, borderWidth: 1, borderColor: palette.rule, borderStyle: 'dashed', alignItems: 'center' },
  locateText: { color: palette.parchment, fontFamily: fonts.mono, fontSize: 10, letterSpacing: 3, textTransform: 'uppercase' },
  cta: { marginTop: space.xl, backgroundColor: palette.paper, height: 52, alignItems: 'center', justifyContent: 'center' },
  ctaDisabled: { backgroundColor: palette.rule },
  ctaPressed: { backgroundColor: palette.parchment },
  ctaText: { ...type.label, color: palette.ink, fontSize: 11, fontWeight: '600' },
  backBtn: { paddingHorizontal: space.l, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.rule },
  backBtnText: { ...type.label, color: palette.parchment },
});
