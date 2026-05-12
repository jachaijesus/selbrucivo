import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const TITLES: Record<string, string> = {
  illustrator: "Illustrator's Guild",
  animator: "Animator's Guild",
  designer: "Designer's Guild",
};

export default function Ceremony() {
  const router = useRouter();
  const { guild, city } = useLocalSearchParams<{ guild?: string; city?: string }>();
  const g = (guild || 'illustrator') as keyof typeof TITLES;
  const guildTitle = TITLES[g] || TITLES.illustrator;

  return (
    <View style={styles.root} testID="ceremony-screen">
      <View style={styles.card}>
        <Text style={styles.eyebrow}>let it be recorded</Text>
        <Text style={styles.intro}>Another rises through the ranks.</Text>
        <View style={styles.rule} />
        <Text style={styles.youAre}>You are now a member of</Text>
        <Text style={styles.guild}>{guildTitle}</Text>
        <Text style={styles.city}>{(city || '').toString().toUpperCase()}</Text>
        <View style={styles.rule} />
        <Text style={styles.note}>
          Your contributions will be archived in your local library. When a city reaches three thousand members across all three guilds, its archive joins the global network.
        </Text>
      </View>
      <Pressable testID="ceremony-enter" style={styles.cta} onPress={() => router.replace('/(tabs)/ambient')}>
        <Text style={styles.ctaText}>Enter the library</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c', paddingHorizontal: 32, paddingTop: 96, paddingBottom: 64, justifyContent: 'space-between' },
  card: {},
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  intro: { color: '#f3ecd9', fontSize: 30, fontWeight: '300', marginTop: 16, lineHeight: 36 },
  rule: { height: 1, backgroundColor: '#1f1e1a', marginVertical: 28, width: 72 },
  youAre: { color: '#7a7568', fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 14 },
  guild: { color: '#d6c9a8', fontSize: 26, fontWeight: '400', marginBottom: 8 },
  city: { color: '#f3ecd9', fontSize: 14, letterSpacing: 4 },
  note: { color: '#7a7568', fontSize: 13, lineHeight: 22, fontStyle: 'italic' },
  cta: { backgroundColor: '#d6c9a8', height: 52, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#0a0a0c', letterSpacing: 3, fontSize: 12, textTransform: 'uppercase', fontWeight: '600' },
});
