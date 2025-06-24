import { Budget } from '@/app/models/budget.interface';
import { getBudgetsForGroup, getUserVote, isUserAdmin, updateBudgetStatus, voteOnBudget } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface BudgetWithUserVote extends Budget {
  userVote?: 'approve' | 'reject' | null;
  isAdmin?: boolean;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [budgets, setBudgets] = useState<BudgetWithUserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // TODO: Reemplazar con el ID del usuario autenticado
  const currentUserId = 1;

  // Colores del tema
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#ffffff', dark: '#1c1c1e' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#38383a' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666', dark: '#8e8e93' }, 'text');

  const fetchBudgets = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const groupId = parseInt(id, 10);
      const data = await getBudgetsForGroup(groupId);
      
      // Enriquecer los datos con el voto del usuario y rol de admin
      const enrichedData = await Promise.all(
        data.map(async (budget) => {
          const [userVote, isAdmin] = await Promise.all([
            getUserVote(budget.id, currentUserId),
            isUserAdmin(groupId, currentUserId)
          ]);
          
          return {
            ...budget,
            userVote,
            isAdmin
          };
        })
      );
      
      setBudgets(enrichedData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();
  }, [id]);

  const handleVote = async (budgetId: number, vote: 'approve' | 'reject') => {
    try {
      await voteOnBudget(budgetId, currentUserId, vote);
      Alert.alert('Voto registrado', 'Tu voto ha sido registrado con éxito.');
      fetchBudgets(); // Recargar presupuestos para mostrar el nuevo conteo
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo registrar tu voto: ' + error.message);
    }
  };

  const handleStatusChange = async (budgetId: number, newStatus: string) => {
    try {
      await updateBudgetStatus(budgetId, newStatus, currentUserId);
      Alert.alert('Estado actualizado', 'El estado del presupuesto ha sido actualizado.');
      fetchBudgets(); // Recargar presupuestos
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado: ' + error.message);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
        case 'approved': return { color: 'green' };
        case 'rejected': return { color: 'red' };
        case 'pending': return { color: 'orange' };
        case 'executing': return { color: 'blue' };
        case 'completed': return { color: 'purple' };
        default: return {};
    }
  };

  const getVoteButtonStyle = (budget: BudgetWithUserVote, voteType: 'approve' | 'reject') => {
    const isSelected = budget.userVote === voteType;
    return {
      padding: 8,
      backgroundColor: isSelected ? Colors.light.tint : 'transparent',
      borderRadius: 20,
    };
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
        case 'approved': return { backgroundColor: 'green' };
        case 'rejected': return { backgroundColor: 'red' };
        case 'pending': return { backgroundColor: 'orange' };
        case 'executing': return { backgroundColor: 'blue' };
        case 'completed': return { backgroundColor: 'purple' };
        default: return {};
    }
  };

  const renderBudgetItem = ({ item }: { item: BudgetWithUserVote }) => (
    <ThemedView style={[styles.budgetItem, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.budgetHeader}>
            <View style={styles.titleContainer}>
                <ThemedText type="subtitle" style={[styles.budgetTitle, { color: textColor }]}>{item.title}</ThemedText>
            </View>
            <ThemedText style={[styles.amount, { color: Colors.light.tint }]}>${item.amount.toFixed(2)}</ThemedText>
        </View>
        
        <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                <ThemedText style={styles.statusBadgeText}>
                  {item.status === 'draft' && 'Borrador'}
                  {item.status === 'pending' && 'En Votación'}
                  {item.status === 'approved' && 'Aprobado'}
                  {item.status === 'rejected' && 'Rechazado'}
                  {item.status === 'executing' && 'En Ejecución'}
                  {item.status === 'completed' && 'Completado'}
                </ThemedText>
            </View>
        </View>
        
        <ThemedText style={[styles.objective, { color: secondaryTextColor }]}>{item.objective}</ThemedText>
        
        <View style={styles.votingSection}>
            <View style={styles.votingHeader}>
                <ThemedText style={[styles.votingTitle, { color: textColor }]}>Votación</ThemedText>
                <Link href={`/group/${id}/vote-stats?budgetId=${item.id}&budgetTitle=${encodeURIComponent(item.title)}`} asChild>
                  <Pressable style={[styles.statsButton, { backgroundColor: cardBackground, borderColor }]}>
                    <Text style={styles.statsIcon}>📊</Text>
                  </Pressable>
                </Link>
            </View>
            <View style={styles.votesContainer}>
                <Pressable 
                  style={[styles.voteButton, getVoteButtonStyle(item, 'approve'), { borderColor }]} 
                  onPress={() => handleVote(item.id, 'approve')}
                  disabled={item.status !== 'pending'}
                >
                    <Text style={[styles.voteEmoji, { color: item.userVote === 'approve' ? 'white' : '#4CAF50' }]}>👍</Text>
                    <ThemedText style={[styles.voteCount, { color: item.userVote === 'approve' ? 'white' : '#4CAF50' }]}>
                      {item.approve_votes}
                    </ThemedText>
                </Pressable>
                
                <Pressable 
                  style={[styles.voteButton, getVoteButtonStyle(item, 'reject'), { borderColor }]} 
                  onPress={() => handleVote(item.id, 'reject')}
                  disabled={item.status !== 'pending'}
                >
                    <Text style={[styles.voteEmoji, { color: item.userVote === 'reject' ? 'white' : '#F44336' }]}>👎</Text>
                    <ThemedText style={[styles.voteCount, { color: item.userVote === 'reject' ? 'white' : '#F44336' }]}>
                      {item.reject_votes}
                    </ThemedText>
                </Pressable>
            </View>
        </View>
        
        {item.isAdmin && (
          <View style={styles.adminActions}>
              {item.status === 'draft' && (
                  <Pressable style={styles.adminButton} onPress={() => handleStatusChange(item.id, 'pending')}>
                      <ThemedText style={styles.adminButtonText}>📤 Enviar a Votación</ThemedText>
                  </Pressable>
              )}
              {item.status === 'pending' && item.approve_votes > item.reject_votes && (
                  <Pressable style={styles.adminButton} onPress={() => handleStatusChange(item.id, 'approved')}>
                      <ThemedText style={styles.adminButtonText}>✅ Aprobar</ThemedText>
                  </Pressable>
              )}
              {item.status === 'approved' && (
                  <Pressable style={styles.adminButton} onPress={() => handleStatusChange(item.id, 'executing')}>
                      <ThemedText style={styles.adminButtonText}>🚀 Iniciar Ejecución</ThemedText>
                  </Pressable>
              )}
              {item.status === 'executing' && (
                  <Pressable style={styles.adminButton} onPress={() => handleStatusChange(item.id, 'completed')}>
                      <ThemedText style={styles.adminButtonText}>🏁 Marcar Completado</ThemedText>
                  </Pressable>
              )}
          </View>
        )}
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: loading ? 'Cargando...' : 'Detalles del Grupo',
          headerRight: () => (
            <Link href={`/group/${id}/invite`} asChild>
              <Pressable>
                <ThemedText style={{ color: Colors.light.tint, fontSize: 16 }}>Invitar</ThemedText>
              </Pressable>
            </Link>
          ),
        }} 
      />
      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <Text style={{color: 'red'}}>{error}</Text>
      ) : (
        <FlatList
          data={budgets}
          renderItem={renderBudgetItem}
          keyExtractor={(item) => item.id.toString()}
          ListHeaderComponent={() => (
            <View style={styles.headerContainer}>
              <ThemedText type="title">Presupuestos</ThemedText>
              <Link href={`/group/${id}/create-budget`} asChild>
                <Pressable style={styles.createButton}>
                  <ThemedText style={styles.createButtonText}>+ Crear</ThemedText>
                </Pressable>
              </Link>
            </View>
          )}
          ListEmptyComponent={() => (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>Este grupo aún no tiene presupuestos.</ThemedText>
              <Link href={`/group/${id}/create-budget`} asChild>
                  <Pressable style={styles.createButton}>
                    <ThemedText style={styles.createButtonText}>Crear el primero</ThemedText>
                  </Pressable>
              </Link>
            </ThemedView>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  budgetItem: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    flex: 1,
  },
  statusContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.tint,
    textAlign: 'right',
  },
  objective: {
    fontStyle: 'italic',
    marginBottom: 16,
    color: '#666',
    lineHeight: 20,
    fontSize: 14,
  },
  votingSection: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  votingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  votingTitle: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
  },
  statsButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  statsIcon: {
    fontSize: 16,
  },
  votesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  voteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'white',
    minWidth: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  voteEmoji: {
    fontSize: 20,
    marginRight: 6,
  },
  voteCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 24,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
  adminActions: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  adminButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  adminButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
}); 