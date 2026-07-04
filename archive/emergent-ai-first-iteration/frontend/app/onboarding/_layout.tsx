import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0B0B0D' },
        animation: 'fade',
        animationDuration: 500,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="philosophy" />
      <Stack.Screen name="guild" />
      <Stack.Screen name="place" />
      <Stack.Screen name="ceremony" />
      <Stack.Screen name="ambient" />
      <Stack.Screen name="contribute" />
    </Stack>
  );
}
