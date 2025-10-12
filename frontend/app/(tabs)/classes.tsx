import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function ClassesScreen() {
  const [myClass, setMyClass] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [className, setClassName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadMyClass();
  }, []);

  const loadMyClass = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const response = await axios.get(`${BACKEND_URL}/api/classes/my-class`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyClass(response.data);
    } catch (error) {
      console.error('Error loading class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async () => {
    if (!className.trim()) {
      Alert.alert('Error', 'Please enter a class name');
      return;
    }

    setCreating(true);
    try {
      const token = await AsyncStorage.getItem('auth_token');
      await axios.post(
        `${BACKEND_URL}/api/classes/create`,
        { name: className },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Class created successfully!');
      setShowCreateModal(false);
      setClassName('');
      loadMyClass();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Could not create class');
    } finally {
      setCreating(false);
    }
  };

  const renderMember = ({ item }: { item: any }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberAvatar}>
        <Ionicons name="person" size={24} color="#6366f1" />
      </View>
      <Text style={styles.memberName}>{item.username}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Classes</Text>
        <Text style={styles.headerSubtitle}>Your learning community</Text>
      </View>

      {!myClass ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={80} color="#444" />
          <Text style={styles.emptyText}>No Class Yet</Text>
          <Text style={styles.emptySubtext}>
            Create a class with up to 13 members
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateModal(true)}
          >
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.createButtonText}>Create Class</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.classContainer}>
          <View style={styles.classHeader}>
            <Text style={styles.className}>{myClass.name}</Text>
            <Text style={styles.memberCount}>
              {myClass.members.length} / 13 members
            </Text>
          </View>

          <FlatList
            data={myClass.members}
            renderItem={renderMember}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.membersList}
            numColumns={2}
          />

          {myClass.members.length < 13 && (
            <TouchableOpacity style={styles.inviteButton}>
              <Ionicons name="person-add-outline" size={20} color="#6366f1" />
              <Text style={styles.inviteButtonText}>Invite Members</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Class</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Class Name"
              placeholderTextColor="#666"
              value={className}
              onChangeText={setClassName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowCreateModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCreate]}
                onPress={handleCreateClass}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
  emptyContainer: {
    flex: 1,
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 32,
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  classContainer: {
    flex: 1,
    padding: 24,
  },
  classHeader: {
    marginBottom: 24,
  },
  className: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  memberCount: {
    fontSize: 14,
    color: '#888',
  },
  membersList: {
    paddingBottom: 24,
  },
  memberCard: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#6366f1',
    borderStyle: 'dashed',
  },
  inviteButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  modalInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#2a2a2a',
  },
  modalButtonCreate: {
    backgroundColor: '#6366f1',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
