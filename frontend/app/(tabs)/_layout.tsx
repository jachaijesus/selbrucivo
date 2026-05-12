import React from 'react';
import { Tabs } from 'expo-router';
import { Platform, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,12,0.92)',
          borderTopWidth: 1,
          borderTopColor: '#1a1a1c',
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarActiveTintColor: '#d6c9a8',
        tabBarInactiveTintColor: '#4a4738',
      }}
    >
      <Tabs.Screen
        name="ambient"
        options={{
          tabBarIcon: ({ color }) => (
            <View testID="tab-ambient"><Ionicons name="square-outline" size={20} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          tabBarIcon: ({ color }) => (
            <View testID="tab-library"><Ionicons name="library-outline" size={20} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="upload"
        options={{
          tabBarIcon: ({ color }) => (
            <View testID="tab-upload"><Ionicons name="add-outline" size={26} color={color} /></View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color }) => (
            <View testID="tab-profile"><Ionicons name="person-outline" size={20} color={color} /></View>
          ),
        }}
      />
    </Tabs>
  );
}
