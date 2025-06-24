import { Budget } from '@/app/models/budget.interface';
import { getBudgetsForGroup, getBudgetVotes, getUserVote, isUserAdmin, updateBudgetStatus, voteOnBudget } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

interface BudgetWithUserVote extends Budget {
  userVote?: 'approve' | 'reject' | null;
  isAdmin?: boolean;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [budgets, setBudgets] = useState<BudgetWithUserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetWithUserVote | null>(null);
  const [votesModalVisible, setVotesModalVisible] = useState(false);
  const [votesHistory, setVotesHistory] = useState<any[]>([]);
  const router = useRouter();

  // TODO: Reemplazar con el ID del usuario autenticado
  const currentUserId = 1;

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

  const showVotesHistory = async (budget: BudgetWithUserVote) => {
    try {
      const votes = await getBudgetVotes(budget.id);
      setVotesHistory(votes);
      setSelectedBudget(budget);
      setVotesModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar el historial de votos: ' + error.message);
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

  const renderBudgetItem = ({ item }: { item: BudgetWithUserVote }) => (
    <ThemedView style={styles.budgetItem}>
        <View>
            <ThemedText type="subtitle">{item.title}</ThemedText>
            <ThemedText style={styles.objective}>{item.objective}</ThemedText>
            <ThemedText style={styles.amount}>${item.amount.toFixed(2)}</ThemedText>
        </View>
        
        <View style={styles.footer}>
            <ThemedText style={[styles.status, getStatusStyle(item.status)]}>
              {item.status === 'draft' && 'Borrador'}
              {item.status === 'pending' && 'En Votación'}
              {item.status === 'approved' && 'Aprobado'}
              {item.status === 'rejected' && 'Rechazado'}
              {item.status === 'executing' && 'En Ejecución'}
              {item.status === 'completed' && 'Completado'}
            </ThemedText>
            
            <View style={styles.votesContainer}>
                <Pressable 
                  style={getVoteButtonStyle(item, 'approve')} 
                  onPress={() => handleVote(item.id, 'approve')}
                  disabled={item.status !== 'pending'}
                >
                    <Text style={{ color: item.userVote === 'approve' ? 'white' : 'black' }}>👍</Text>
                </Pressable>
                <ThemedText style={styles.votes}>{item.approve_votes}</ThemedText>
                
                <Pressable 
                  style={getVoteButtonStyle(item, 'reject')} 
                  onPress={() => handleVote(item.id, 'reject')}
                  disabled={item.status !== 'pending'}
                >
                    <Text style={{ color: item.userVote === 'reject' ? 'white' : 'black' }}>👎</Text>
                </Pressable>
                <ThemedText style={styles.votes}>{item.reject_votes}</ThemedText>
                
                <Pressable onPress={() => showVotesHistory(item)} style={styles.historyButton}>
                    <Text>📊</Text>
                </Pressable>
                <Link href={`/group/${id}/vote-stats?budgetId=${item.id}&budgetTitle=${encodeURIComponent(item.title)}`} asChild>
                  <Pressable style={styles.statsButton}>
                    <Text>📈</Text>
                  </Pressable>
                </Link>
            </View>
        </View>
        
        {item.isAdmin && (
          <View style={styles.adminActions}>
              {item.status === 'draft' && (
                  <Pressable style={styles.actionButton} onPress={() => handleStatusChange(item.id, 'pending')}>
                      <ThemedText style={styles.actionButtonText}>Enviar a Votación</ThemedText>
                  </Pressable>
              )}
              {item.status === 'pending' && item.approve_votes > item.reject_votes && (
                  <Pressable style={styles.actionButton} onPress={() => handleStatusChange(item.id, 'approved')}>
                      <ThemedText style={styles.actionButtonText}>Aprobar</ThemedText>
                  </Pressable>
              )}
              {item.status === 'approved' && (
                  <Pressable style={styles.actionButton} onPress={() => handleStatusChange(item.id, 'executing')}>
                      <ThemedText style={styles.actionButtonText}>Iniciar Ejecución</ThemedText>
                  </Pressable>
              )}
              {item.status === 'executing' && (
                  <Pressable style={styles.actionButton} onPress={() => handleStatusChange(item.id, 'completed')}>
                      <ThemedText style={styles.actionButtonText}>Marcar Completado</ThemedText>
                  </Pressable>
              )}
          </View>
        )}
    </ThemedView>
  );

  const renderVoteItem = ({ item }: { item: any }) => (
    <View style={styles.voteItem}>
      <View style={styles.voteUserInfo}>
        <ThemedText style={styles.voteUserName}>{item.users?.display_name || 'Usuario'}</ThemedText>
        <ThemedText style={styles.voteDate}>
          {new Date(item.voted_at).toLocaleDateString()}
        </ThemedText>
      </View>
      <View style={styles.voteInfo}>
        <Text style={styles.voteEmoji}>
          {item.vote === 'approve' ? '👍' : '👎'}
        </Text>
        {item.comment && (
          <ThemedText style={styles.voteComment}>{item.comment}</ThemedText>
        )}
      </View>
    </View>
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

      {/* Modal para mostrar historial de votos */}
      <Modal
        visible={votesModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVotesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="title">Historial de Votos</ThemedText>
              <Pressable onPress={() => setVotesModalVisible(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </Pressable>
            </View>
            
            {selectedBudget && (
              <ThemedText style={styles.modalSubtitle}>
                {selectedBudget.title}
              </ThemedText>
            )}
            
            <FlatList
              data={votesHistory}
              renderItem={renderVoteItem}
              keyExtractor={(item, index) => index.toString()}
              style={styles.votesList}
              ListEmptyComponent={() => (
                <ThemedText style={styles.emptyVotesText}>
                  Aún no hay votos registrados.
                </ThemedText>
              )}
            />
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  budgetItem: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.light.icon,
  },
  objective: {
    fontStyle: 'italic',
    marginBottom: 10,
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  status: {
    textTransform: 'capitalize',
    fontWeight: 'bold',
  },
  votesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  voteButton: {
    padding: 8,
  },
  votes: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
    gap: 20,
  },
  emptyText: {
    textAlign: 'center',
  },
  adminActions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyButton: {
    padding: 8,
  },
  voteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  voteUserInfo: {
    flex: 1,
  },
  voteUserName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  voteDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  voteEmoji: {
    fontSize: 20,
  },
  voteComment: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#666',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.light.tint,
  },
  votesList: {
    flex: 1,
  },
  emptyVotesText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#666',
  },
  statsButton: {
    padding: 8,
  },
}); 