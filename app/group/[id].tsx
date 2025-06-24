import { Budget } from '@/app/models/budget.interface';
import { getBudgetsForGroup, getUserVote, isUserAdmin, updateBudgetStatus, voteOnBudget, voteOnBudgetWithComment } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface BudgetWithUserVote extends Budget {
  userVote?: 'approve' | 'reject' | null;
  isAdmin?: boolean;
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [budgets, setBudgets] = useState<BudgetWithUserVote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voteModalVisible, setVoteModalVisible] = useState(false);
  const [selectedBudgetForVote, setSelectedBudgetForVote] = useState<BudgetWithUserVote | null>(null);
  const [voteType, setVoteType] = useState<'approve' | 'reject' | null>(null);
  const [voteComment, setVoteComment] = useState('');
  const [activeSection, setActiveSection] = useState<'pending' | 'completed' | 'archived'>('pending');
  const router = useRouter();

  // TODO: Reemplazar con el ID del usuario autenticado
  const currentUserId = 1;

  // Filtrar presupuestos por sección
  const pendingBudgets = budgets.filter(budget => 
    ['draft', 'pending'].includes(budget.status)
  );
  
  const completedBudgets = budgets.filter(budget => 
    ['approved', 'rejected', 'executing', 'completed', 'cancelled'].includes(budget.status)
  );

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

  const openVoteModal = (budget: BudgetWithUserVote, vote: 'approve' | 'reject') => {
    setSelectedBudgetForVote(budget);
    setVoteType(vote);
    setVoteComment('');
    setVoteModalVisible(true);
  };

  const submitVoteWithComment = async () => {
    if (!selectedBudgetForVote || !voteType) return;
    
    try {
      await voteOnBudgetWithComment(selectedBudgetForVote.id, currentUserId, voteType, voteComment.trim() || undefined);
      
      Alert.alert('Voto registrado', 'Tu voto y comentario han sido registrados con éxito.');
      setVoteModalVisible(false);
      setVoteComment('');
      fetchBudgets(); // Recargar presupuestos
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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'draft':
        return { text: '📝 Borrador', color: '#666' };
      case 'pending':
        return { text: '⏳ En Votación', color: '#f39c12' };
      case 'approved':
        return { text: '✅ Aprobado', color: '#27ae60' };
      case 'rejected':
        return { text: '❌ Rechazado', color: '#e74c3c' };
      case 'executing':
        return { text: '🚀 En Ejecución', color: '#3498db' };
      case 'completed':
        return { text: '🎉 Completado', color: '#27ae60' };
      case 'cancelled':
        return { text: '🚫 Cancelado', color: '#95a5a6' };
      default:
        return { text: status, color: '#666' };
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
                <ThemedText type="title" style={[styles.budgetTitle, { color: textColor }]}>
                    {item.title}
                </ThemedText>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusDisplay(item.status).color + '20' }]}>
                <ThemedText style={[styles.statusText, { color: getStatusDisplay(item.status).color }]}>
                    {getStatusDisplay(item.status).text}
                </ThemedText>
            </View>
        </View>
        
        <ThemedText style={[styles.amount, { color: Colors.light.tint }]}>${item.amount.toFixed(2)}</ThemedText>
        
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
                  onPress={() => openVoteModal(item, 'approve')}
                  disabled={item.status !== 'pending'}
                >
                    <Text style={[styles.voteEmoji, { color: item.userVote === 'approve' ? 'white' : '#4CAF50' }]}>👍</Text>
                    <ThemedText style={[styles.voteCount, { color: item.userVote === 'approve' ? 'white' : '#4CAF50' }]}>
                      {item.approve_votes}
                    </ThemedText>
                </Pressable>
                
                <Pressable 
                  style={[styles.voteButton, getVoteButtonStyle(item, 'reject'), { borderColor }]} 
                  onPress={() => openVoteModal(item, 'reject')}
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
      <ThemedText type="title" style={[styles.title, { color: textColor }]}>
        Presupuestos del Grupo
      </ThemedText>
      
      {/* Botón de crear presupuesto - arriba de las secciones */}
      <View style={styles.createButtonContainer}>
        <Pressable 
          style={[styles.createButton, { backgroundColor: Colors.light.tint }]}
          onPress={() => router.push(`/group/${id}/create-budget`)}
        >
          <ThemedText style={styles.createButtonText}>➕ Crear Presupuesto</ThemedText>
        </Pressable>
      </View>
      
      {/* Pestañas de secciones */}
      <View style={[styles.tabContainer, { borderColor }]}>
        <Pressable 
          style={[
            styles.tab, 
            activeSection === 'pending' && styles.activeTab,
            { borderColor }
          ]}
          onPress={() => setActiveSection('pending')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeSection === 'pending' && styles.activeTabText,
            { color: activeSection === 'pending' ? 'white' : '#555' }
          ]}>
            📋 En Votación ({pendingBudgets.length})
          </ThemedText>
        </Pressable>
        
        <Pressable 
          style={[
            styles.tab, 
            activeSection === 'completed' && styles.activeTab,
            { borderColor }
          ]}
          onPress={() => setActiveSection('completed')}
        >
          <ThemedText style={[
            styles.tabText, 
            activeSection === 'completed' && styles.activeTabText,
            { color: activeSection === 'completed' ? 'white' : '#555' }
          ]}>
            ✅ Completados ({completedBudgets.length})
          </ThemedText>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator size="large" />
      ) : error ? (
        <ThemedText style={[styles.errorText, { color: 'red' }]}>{error}</ThemedText>
      ) : (
        <FlatList
          data={activeSection === 'pending' ? pendingBudgets : completedBudgets}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderBudgetItem}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
                {activeSection === 'pending' 
                  ? '📋 No hay presupuestos en votación' 
                  : '✅ No hay presupuestos completados'
                }
              </ThemedText>
              {activeSection === 'pending' && (
                <ThemedText style={[styles.emptySubtext, { color: secondaryTextColor }]}>
                  Crea un nuevo presupuesto para comenzar
                </ThemedText>
              )}
            </View>
          )}
        />
      )}

      {/* Modal para votación con comentarios */}
      <Modal
        visible={voteModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVoteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>
                {voteType === 'approve' ? '👍 Aprobar' : '👎 Rechazar'} Presupuesto
              </ThemedText>
              <Pressable onPress={() => setVoteModalVisible(false)}>
                <Text style={[styles.closeButton, { color: secondaryTextColor }]}>✕</Text>
              </Pressable>
            </View>
            
            {selectedBudgetForVote && (
              <ThemedText style={[styles.modalSubtitle, { color: Colors.light.tint }]}>
                {selectedBudgetForVote.title}
              </ThemedText>
            )}
            
            <View style={styles.commentSection}>
              <ThemedText style={[styles.commentLabel, { color: textColor }]}>
                Comentario (Opcional)
              </ThemedText>
              <TextInput
                style={[styles.commentInput, { 
                  backgroundColor: backgroundColor, 
                  borderColor, 
                  color: textColor 
                }]}
                value={voteComment}
                onChangeText={setVoteComment}
                placeholder="Explica tu razón para votar..."
                placeholderTextColor={secondaryTextColor}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            
            <View style={styles.modalActions}>
              <Pressable 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setVoteModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={submitVoteWithComment}
              >
                <ThemedText style={styles.submitButtonText}>
                  {voteType === 'approve' ? '👍 Aprobar' : '👎 Rechazar'}
                </ThemedText>
              </Pressable>
            </View>
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
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  statusContainer: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  objective: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
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
  createButtonContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  createButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    fontSize: 14,
    color: '#999',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  commentInput: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    fontSize: 16,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: Colors.light.tint,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
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
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
  },
}); 