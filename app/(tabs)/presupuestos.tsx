import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupSummary } from '@/app/models/group.interface';
import { getGroupsSummary, updateUserGroupStatus } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function PresupuestosScreen() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'active' | 'archived'>('active');

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        // TODO: Replace with actual logged-in user ID
        const data = await getGroupsSummary(1);
        setGroups(data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Filtrar grupos por sección
  const activeGroups = groups.filter(group => 
    !group.user_status || group.user_status === 'active'
  );
  
  const archivedGroups = groups.filter(group => 
    group.user_status === 'archived'
  );

  const handleArchiveGroup = async (groupId: number) => {
    try {
      await updateUserGroupStatus(groupId, 1, 'archived'); // TODO: usar ID real del usuario
      // Recargar grupos después de archivar
      const data = await getGroupsSummary(1);
      setGroups(data);
    } catch (error: any) {
      console.error('Error archiving group:', error);
      // Por ahora solo simulamos el cambio en caso de error
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, user_status: 'archived' }
            : group
        )
      );
    }
  };

  const handleRestoreGroup = async (groupId: number) => {
    try {
      await updateUserGroupStatus(groupId, 1, 'active'); // TODO: usar ID real del usuario
      // Recargar grupos después de restaurar
      const data = await getGroupsSummary(1);
      setGroups(data);
    } catch (error: any) {
      console.error('Error restoring group:', error);
      // Por ahora solo simulamos el cambio en caso de error
      setGroups(prevGroups => 
        prevGroups.map(group => 
          group.id === groupId 
            ? { ...group, user_status: 'active' }
            : group
        )
      );
    }
  };

  const renderGroupItem = ({ item }: { item: GroupSummary }) => (
    <ThemedView style={styles.groupItem}>
      <Link href={`/group/${item.id}`} asChild>
        <Pressable style={styles.groupContent}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <ThemedText>Creado por: {item.created_by_name}</ThemedText>
          <ThemedText style={styles.groupDetails}>
            {item.member_count} miembro(s) • {item.active_budgets} presupuesto(s) activo(s)
          </ThemedText>
        </Pressable>
      </Link>
      
      {/* Botones de acción */}
      <View style={styles.groupActions}>
        {activeSection === 'active' && (
          <Pressable 
            style={[styles.actionButton, styles.archiveButton]}
            onPress={() => handleArchiveGroup(item.id)}
          >
            <ThemedText style={styles.actionButtonText}>📁 Archivar</ThemedText>
          </Pressable>
        )}
        
        {activeSection === 'archived' && (
          <Pressable 
            style={[styles.actionButton, styles.restoreButton]}
            onPress={() => handleRestoreGroup(item.id)}
          >
            <ThemedText style={styles.actionButtonText}>🔄 Restaurar</ThemedText>
          </Pressable>
        )}
      </View>
    </ThemedView>
  );

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
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Link href="/create-group" asChild>
                <Pressable>
                  <ThemedText style={{ color: Colors.light.tint, fontSize: 16 }}>Crear</ThemedText>
                </Pressable>
              </Link>
              <Link href="/join-group" asChild>
                <Pressable>
                  <ThemedText style={{ color: Colors.light.tint, fontSize: 16 }}>Unirse</ThemedText>
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
            🏠 Activos ({activeGroups.length})
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
            📁 Archivados ({archivedGroups.length})
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
  groupItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.icon,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupContent: {
    flex: 1,
  },
  groupDetails: {
    marginTop: 5,
    fontSize: 12,
    color: Colors.light.tint,
  },
  groupActions: {
    marginLeft: 10,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  archiveButton: {
    backgroundColor: '#95a5a6',
  },
  restoreButton: {
    backgroundColor: '#27ae60',
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
});
