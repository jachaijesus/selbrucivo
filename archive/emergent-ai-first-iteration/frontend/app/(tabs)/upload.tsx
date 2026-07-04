import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, TextInput, Alert, ActivityIndicator, Image as RNImage, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../utils/api';

// Web file input fallback: we use a hidden HTML input on web.
// On native, expo-image-picker would be preferred — adding it is out of P0 scope. For now web-only upload (preview env).

const MIN_W = 720;
const MIN_H = 1280;

export default function Upload() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageDims, setImageDims] = useState<{ w: number; h: number } | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [submitting, setSubmitting] = useState(false);

  const pickFromBrowser = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Use the web preview', 'Native upload picker arrives in a later iteration. Please use the web preview to upload from your device.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const img = new window.Image();
        img.onload = () => {
          if (img.width < MIN_W || img.height < MIN_H) {
            Alert.alert('Resolution too low', `Minimum is ${MIN_W} × ${MIN_H}. Got ${img.width} × ${img.height}.`);
            return;
          }
          if (img.height <= img.width) {
            Alert.alert('Portrait required', `Width must be less than height. Got ${img.width} × ${img.height}.`);
            return;
          }
          const ratio = img.width / img.height;
          if (ratio > 9 / 16 + 0.05) {
            Alert.alert('Too wide', 'Aspect ratio must be 9:16 or narrower.');
            return;
          }
          setImageMime(file.type || 'image/jpeg');
          setImageBase64(dataUrl);
          setImageDims({ w: img.width, h: img.height });
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const submit = async () => {
    if (!title.trim()) return Alert.alert('Title needed', 'Title the work for archival reference.');
    if (!imageBase64) return Alert.alert('Image needed', 'Select an image to upload.');
    setSubmitting(true);
    try {
      const data = await api.post('/api/artworks/upload', {
        title,
        description,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        image_base64: imageBase64,
      });
      Alert.alert('Submitted', 'Your inscription has been sent for curator review.', [
        { text: 'Done', onPress: () => router.replace('/(tabs)/profile') },
      ]);
      setTitle(''); setDescription(''); setTags(''); setImageBase64(null); setImageDims(null);
    } catch (e: any) {
      Alert.alert('Could not submit', e?.response?.data?.detail || 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={s.root} contentContainerStyle={s.scroll} testID="upload-screen" keyboardShouldPersistTaps="handled">
      <Text style={s.eyebrow}>inscribe a work</Text>
      <Text style={s.title}>To the archive.</Text>
      <View style={s.rule} />

      <Pressable testID="upload-pick" style={s.imageBox} onPress={pickFromBrowser}>
        {imageBase64 ? (
          <RNImage source={{ uri: imageBase64 }} style={s.preview} resizeMode="contain" />
        ) : (
          <View style={s.placeholder}>
            <Text style={s.placeholderGlyph}>＋</Text>
            <Text style={s.placeholderText}>Select portrait image</Text>
            <Text style={s.placeholderHint}>minimum {MIN_W} × {MIN_H} · 9:16 or narrower</Text>
          </View>
        )}
      </Pressable>
      {imageDims && (
        <Text style={s.dims}>{imageDims.w} × {imageDims.h}</Text>
      )}

      <Text style={s.label}>Title</Text>
      <TextInput testID="upload-title" style={s.input} value={title} onChangeText={setTitle} placeholder="Untitled folio no. ii" placeholderTextColor="#4a4738" />

      <Text style={s.label}>Description (optional)</Text>
      <TextInput testID="upload-description" style={[s.input, { minHeight: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Brief, archival note." placeholderTextColor="#4a4738" />

      <Text style={s.label}>Tags (comma separated)</Text>
      <TextInput testID="upload-tags" style={s.input} value={tags} onChangeText={setTags} placeholder="ink, monochrome, study" placeholderTextColor="#4a4738" />

      <Pressable testID="upload-submit" style={({ pressed }) => [s.submit, pressed && s.submitPressed]} onPress={submit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#0a0a0c" /> : <Text style={s.submitText}>Send to curator</Text>}
      </Pressable>

      <Text style={s.disclaimer}>Submissions are reviewed by archive curators. Once approved, the work appears in your local library.</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0c' },
  scroll: { paddingHorizontal: 28, paddingTop: 80, paddingBottom: 120 },
  eyebrow: { color: '#6e6a5e', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase' },
  title: { color: '#f3ecd9', fontSize: 32, fontWeight: '300', marginTop: 8 },
  rule: { height: 1, backgroundColor: '#1f1e1a', width: 64, marginVertical: 24 },
  imageBox: { borderWidth: 1, borderColor: '#2a2820', borderStyle: 'dashed', aspectRatio: 9 / 16, borderRadius: 2, overflow: 'hidden', backgroundColor: '#0e0e10' },
  preview: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  placeholderGlyph: { color: '#3a3830', fontSize: 56, fontWeight: '200' },
  placeholderText: { color: '#9c978a', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginTop: 8 },
  placeholderHint: { color: '#6e6a5e', fontSize: 11, marginTop: 8 },
  dims: { color: '#9c978a', fontSize: 11, marginTop: 8, textAlign: 'right' },
  label: { color: '#6e6a5e', fontSize: 10, letterSpacing: 3, textTransform: 'uppercase', marginTop: 20, marginBottom: 6 },
  input: { borderBottomWidth: 1, borderBottomColor: '#2a2820', color: '#f3ecd9', fontSize: 15, paddingVertical: 10 },
  submit: { marginTop: 32, backgroundColor: '#d6c9a8', height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  submitPressed: { backgroundColor: '#c2b58f' },
  submitText: { color: '#0a0a0c', fontSize: 12, letterSpacing: 3, textTransform: 'uppercase', fontWeight: '600' },
  disclaimer: { color: '#6e6a5e', fontSize: 11, fontStyle: 'italic', marginTop: 20, lineHeight: 18 },
});
