import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(11,11,13,0.92)',
          borderTopWidth: 1,
          borderTopColor: palette.rule,
          height: Platform.OS === 'ios' ? 86 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 6,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: palette.coral,
        tabBarInactiveTintColor: palette.faint,
      }}
    >
      <Tabs.Screen name="ambient" options={{ tabBarIcon: ({ color }) => <View testID="tab-ambient"><Ionicons name="ellipse-outline" size={9} color={color} /></View> }} />
      <Tabs.Screen name="library" options={{ tabBarIcon: ({ color }) => <View testID="tab-library"><Ionicons name="book-outline" size={18} color={color} /></View> }} />
      <Tabs.Screen name="upload" options={{ tabBarIcon: ({ color }) => <View testID="tab-upload"><Ionicons name="add" size={22} color={color} /></View> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ color }) => <View testID="tab-profile"><Ionicons name="person-outline" size={18} color={color} /></View> }} />
    </Tabs>
  );
}
