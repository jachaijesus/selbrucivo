import { Stack } from 'expo-router';

export default function ArtworkLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0B0D' },
        animation: 'fade',
        animationDuration: 500,
      }}
    />
  );
}
