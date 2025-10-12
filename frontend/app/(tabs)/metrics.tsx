import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface MetricCardProps {
  icon: string;
  title: string;
  value: string | number;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, color }) => (
  <View style={styles.metricCard}>
    <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon as any} size={24} color={color} />
    </View>
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricTitle}>{title}</Text>
  </View>
);

export default function MetricsScreen() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/metrics/global`);
      setMetrics(response.data);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Metrics</Text>
        <Text style={styles.headerSubtitle}>Community statistics</Text>
      </View>

      <View style={styles.metricsGrid}>
        <MetricCard
          icon="download-outline"
          title="Total Downloads"
          value={metrics?.total_downloads || 0}
          color="#6366f1"
        />
        <MetricCard
          icon="people-outline"
          title="Active Users"
          value={metrics?.active_users || 0}
          color="#10b981"
        />
        <MetricCard
          icon="location-outline"
          title="Users Checking In"
          value={metrics?.users_checking_in || 0}
          color="#f59e0b"
        />
        <MetricCard
          icon="checkmark-circle-outline"
          title="24hr Check-ins"
          value={metrics?.completed_24h_checkins || 0}
          color="#ec4899"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Types</Text>
        <View style={styles.deviceList}>
          {metrics?.device_types && Object.keys(metrics.device_types).length > 0 ? (
            Object.entries(metrics.device_types).map(([type, count]: [string, any]) => (
              <View key={type} style={styles.deviceItem}>
                <Ionicons name="phone-portrait-outline" size={20} color="#888" />
                <Text style={styles.deviceType}>{type}</Text>
                <Text style={styles.deviceCount}>{count}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No device data yet</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
  },
  metricsGrid: {
    padding: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    color: '#888',
  },
  section: {
    padding: 24,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  deviceList: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  deviceType: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#fff',
  },
  deviceCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingVertical: 16,
  },
});
