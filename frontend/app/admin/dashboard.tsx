import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function AdminDashboardScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('upload');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout from admin portal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('admin_token');
            await AsyncStorage.removeItem('admin');
            router.replace('/(tabs)/home');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upload' && styles.tabActive]}
            onPress={() => setActiveTab('upload')}
          >
            <Text style={[styles.tabText, activeTab === 'upload' && styles.tabTextActive]}>
              Upload
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.tabActive]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
              History
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'applications' && styles.tabActive]}
            onPress={() => setActiveTab('applications')}
          >
            <Text style={[styles.tabText, activeTab === 'applications' && styles.tabTextActive]}>
              Applications
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'upload' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload New Wallpaper</Text>
            <View style={styles.uploadArea}>
              <Ionicons name="cloud-upload-outline" size={64} color="#444" />
              <Text style={styles.uploadText}>Tap to upload wallpaper</Text>
              <Text style={styles.uploadSubtext}>High-resolution images only</Text>
            </View>
          </View>
        )}

        {activeTab === 'history' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upload History</Text>
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>No uploads yet</Text>
            </View>
          </View>
        )}

        {activeTab === 'applications' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Applications</Text>
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={64} color="#444" />
              <Text style={styles.emptyText}>No applications pending</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  tabs: {
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
  },
  tabActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
  tabTextActive: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  uploadArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
    padding: 48,
    alignItems: 'center',
  },
  uploadText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  uploadSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
  },
  emptyState: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
});
