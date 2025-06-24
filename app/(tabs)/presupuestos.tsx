import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

import { GroupSummary } from '@/app/models/group.interface';
import { getGroupsByStatus, updateUserGroupStatus } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '../../components/ui/IconSymbol';

export default function PresupuestosScreen() {
  const [activeGroups, setActiveGroups] = useState<GroupSummary[]>([]);
  const [archivedGroups, setArchivedGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'active' | 'archived'>('active');

  const fetchGroups = async () => {
    try {
      // Cargar grupos activos y archivados por separado
      const [activeData, archivedData] = await Promise.all([
        getGroupsByStatus(1, 'active'), // TODO: usar ID real del usuario
        getGroupsByStatus(1, 'archived') // TODO: usar ID real del usuario
      ]);
      
      setActiveGroups(activeData);
      setArchivedGroups(archivedData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleArchiveGroup = async (groupId: number) => {
    try {
      console.log('Archivando grupo:', groupId);
      // Usar la función del servicio para archivar el grupo
      await updateUserGroupStatus(groupId, 1, 'archived'); // TODO: usar ID real del usuario
      console.log('Grupo archivado exitosamente');

      // Recargar grupos después de archivar
      await fetchGroups();
    } catch (error: any) {
      console.error('Error archiving group:', error);
    }
  };

  const handleRestoreGroup = async (groupId: number) => {
    try {
      console.log('Restaurando grupo:', groupId);
      // Usar la función del servicio para restaurar el grupo
      await updateUserGroupStatus(groupId, 1, 'active'); // TODO: usar ID real del usuario
      console.log('Grupo restaurado exitosamente');

      // Recargar grupos después de restaurar
      await fetchGroups();
    } catch (error: any) {
      console.error('Error restoring group:', error);
    }
  };

  const renderGroupItem = ({ item }: { item: GroupSummary }) => {
    const renderRightActions = (progress: any, dragX: any) => {
      return (
        <View style={styles.swipeActions}>
          {activeSection === 'active' ? (
            <Pressable 
              style={[styles.swipeButton]}
              onPress={() => handleArchiveGroup(item.id)}
            >
              <IconSymbol name="folder.fill" size={20} color="white" style={styles.swipeButtonText} />
              <ThemedText style={styles.swipeButtonLabel}>Archivar</ThemedText>
            </Pressable>
          ) : (
            <Pressable 
              style={[styles.swipeButton]}
              onPress={() => handleRestoreGroup(item.id)}
            >
              <IconSymbol name="arrow.clockwise" size={20} color="white" style={styles.swipeButtonText} />
              <ThemedText style={styles.swipeButtonLabel}>Restaurar</ThemedText>
            </Pressable>
          )}
        </View>
      );
    };

    return (
      <Swipeable
        renderRightActions={renderRightActions}
        rightThreshold={40}
      >
        <Link href={`/group/${item.id}`} asChild>
          <Pressable style={styles.groupCard}>
            <View style={styles.cardContent}>
              <View style={styles.groupInfo}>
                <View style={styles.groupHeader}>
                  <ThemedText style={styles.groupStat}><IconSymbol name="person.2.fill" size={13} color={Colors.light.tint} /> {item.member_count} </ThemedText>
                  <ThemedText style={styles.groupName}> {item.name}</ThemedText>
                </View>
                <ThemedText style={styles.groupCreator}>Creado por: {item.created_by_name}</ThemedText>
              </View>
              <View style={styles.cardActions}>
                <Link href={`/group/${item.id}/invite`} asChild>
                  <Pressable style={styles.actionButton}>
                    <IconSymbol name="envelope.fill" size={16} color="white" style={styles.actionButtonText} />
                  </Pressable>
                </Link>
              </View>
            </View>
          </Pressable>
        </Link>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText type="defaultSemiBold">Error:</ThemedText>
        <Text style={{color: 'red'}}>{error}</Text>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Mis Grupos',
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Link href="/create-group" asChild>
                <Pressable style={styles.headerButton}>
                  <ThemedText style={styles.headerButtonText}>Crear</ThemedText>
                </Pressable>
              </Link>
              <Link href="/join-group" asChild>
                <Pressable style={styles.headerButton}>
                  <ThemedText style={styles.headerButtonText}>Unirse</ThemedText>
                </Pressable>
              </Link>
            </View>
          ),
        }} 
      />
      <ThemedText type="title">Mis Grupos</ThemedText>
      
      {/* Pestañas de secciones */}
      <View style={styles.tabContainer}>
        <Pressable 
          style={[
            styles.tab, 
            activeSection === 'active' && styles.activeTab
          ]}
          onPress={() => setActiveSection('active')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeSection === 'active' && styles.activeTabText
          ]}>
            Activos ({activeGroups.length})
          </ThemedText>
        </Pressable>
        
        <Pressable 
          style={[
            styles.tab, 
            activeSection === 'archived' && styles.activeTab
          ]}
          onPress={() => setActiveSection('archived')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeSection === 'archived' && styles.activeTabText
          ]}>
            Archivados ({archivedGroups.length})
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={activeSection === 'active' ? activeGroups : archivedGroups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        ListEmptyComponent={() => (
          <ThemedText style={styles.emptyText}>
            {activeSection === 'active' 
              ? 'No tienes grupos activos.' 
              : 'No tienes grupos archivados.'
            }
          </ThemedText>
        )}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  list: {
    width: '100%',
    marginTop: 20,
  },
  groupCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    flex: 1,
  },
  groupStat: {
    fontSize: 14,
    color: Colors.light.tint,
    fontWeight: '600',
  },
  groupCreator: {
    fontSize: 13,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  cardActions: {
    marginLeft: 12,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.tint,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    marginTop: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  activeTab: {
    backgroundColor: Colors.light.tint,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    color: '#555',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  headerButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.light.tint,
  },
  headerButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  swipeButton: {
    width: 80,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  swipeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  swipeButtonLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'white',
  },
});
