import { Link, Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { GroupSummary } from '@/app/models/group.interface';
import { getGroupsSummary } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';

export default function PresupuestosScreen() {
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const renderGroupItem = ({ item }: { item: GroupSummary }) => (
    <Link href={`/group/${item.id}`} asChild>
      <Pressable>
        <ThemedView style={styles.groupItem}>
          <ThemedText type="subtitle">{item.name}</ThemedText>
          <ThemedText>Creado por: {item.created_by_name}</ThemedText>
          <ThemedText style={styles.groupDetails}>
            {item.member_count} miembro(s) • {item.active_budgets} presupuesto(s) activo(s)
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
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
      <FlatList
        data={groups}
        renderItem={renderGroupItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        ListEmptyComponent={() => (
            <ThemedText style={styles.emptyText}>No perteneces a ningún grupo.</ThemedText>
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
  },
  groupDetails: {
    marginTop: 5,
    fontSize: 12,
    color: Colors.light.tint,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
  }
});
