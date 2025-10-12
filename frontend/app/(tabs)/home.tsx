import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [wallpaper, setWallpaper] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadTodaysWallpaper();
  }, []);

  const loadTodaysWallpaper = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userData = await AsyncStorage.getItem('user');
      
      if (userData) {
        setUser(JSON.parse(userData));
      }

      const response = await axios.get(`${BACKEND_URL}/api/wallpapers/today`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setWallpaper(response.data);
    } catch (error: any) {
      console.error('Error loading wallpaper:', error);
      if (error.response?.status === 404) {
        Alert.alert(
          'No Wallpaper',
          'No wallpaper available for your timezone yet. Check back later!'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReaction = async (reactionType: string) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${BACKEND_URL}/api/wallpapers/${wallpaper.id}/react`,
        { reaction_type: reactionType },
        {
          headers: { Authorization: `Bearer ${token}` },
          params: { reaction_type: reactionType },
        }
      );
      Alert.alert('Success', 'Thank you for your reaction!');
    } catch (error) {
      console.error('Error saving reaction:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Loading today's inspiration...</Text>
      </View>
    );
  }

  if (!wallpaper) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="image-outline" size={80} color="#444" />
        <Text style={styles.emptyText}>No wallpaper available</Text>
        <Text style={styles.emptySubtext}>Check back later for your daily inspiration</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Inspiration</Text>
        <Text style={styles.headerDate}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</Text>
        <Text style={styles.timezone}>{user?.current_timezone || 'America/New_York'}</Text>
      </View>

      <View style={styles.imageContainer}>
        <Image
          source={{ uri: `data:image/jpeg;base64,${wallpaper.image_base64}` }}
          style={styles.wallpaperImage}
          resizeMode="cover"
        />
        <View style={styles.gradient} />
      </View>

      <View style={styles.infoSection}>
        <View style={styles.creditContainer}>
          <Ionicons name="person-circle-outline" size={20} color="#888" />
          <Text style={styles.creditText}>{wallpaper.creator_credit}</Text>
        </View>

        <View style={styles.reactionSection}>
          <Text style={styles.reactionTitle}>How does this inspire you?</Text>
          <View style={styles.reactionButtons}>
            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => handleReaction('motivated')}
            >
              <Ionicons name="flame" size={24} color="#f59e0b" />
              <Text style={styles.reactionLabel}>Motivated</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => handleReaction('peaceful')}
            >
              <Ionicons name="leaf" size={24} color="#10b981" />
              <Text style={styles.reactionLabel}>Peaceful</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => handleReaction('empowered')}
            >
              <Ionicons name="flash" size={24} color="#6366f1" />
              <Text style={styles.reactionLabel}>Empowered</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => handleReaction('grateful')}
            >
              <Ionicons name="heart" size={24} color="#ec4899" />
              <Text style={styles.reactionLabel}>Grateful</Text>
            </TouchableOpacity>
          </View>
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
  scrollContent: {
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#888',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0c0c0c',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  headerDate: {
    fontSize: 14,
    color: '#888',
  },
  timezone: {
    marginTop: 4,
    fontSize: 12,
    color: '#6366f1',
  },
  imageContainer: {
    width: width,
    height: width * 1.5,
    position: 'relative',
  },
  wallpaperImage: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'transparent',
  },
  infoSection: {
    padding: 24,
  },
  creditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
  },
  creditText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  reactionSection: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
  },
  reactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  reactionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  reactionButton: {
    width: '48%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  reactionLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
});
