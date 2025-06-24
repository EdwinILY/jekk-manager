import { getBudgetVotes } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { IconSymbol } from '../../../components/ui/IconSymbol';

interface VoteData {
  vote: 'approve' | 'reject';
  comment?: string;
  voted_at: string;
  users: {
    id: number;
    display_name: string;
    photo_url: string;
  };
}

export default function VoteStatsScreen() {
  const { budgetId, budgetTitle } = useLocalSearchParams<{ budgetId: string; budgetTitle: string }>();
  const [votes, setVotes] = useState<VoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalVotes: 0,
    approveVotes: 0,
    rejectVotes: 0,
    participationRate: 0,
  });

  useEffect(() => {
    const fetchVotes = async () => {
      if (!budgetId) return;
      
      try {
        const votesData = await getBudgetVotes(parseInt(budgetId, 10));
        setVotes(votesData);
        
        // Calcular estadísticas
        const approveCount = votesData.filter(v => v.vote === 'approve').length;
        const rejectCount = votesData.filter(v => v.vote === 'reject').length;
        const totalVotes = votesData.length;
        
        setStats({
          totalVotes,
          approveVotes: approveCount,
          rejectVotes: rejectCount,
          participationRate: totalVotes > 0 ? (totalVotes / 10) * 100 : 0, // Asumiendo 10 miembros por grupo
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchVotes();
  }, [budgetId]);

  const renderVoteItem = ({ item }: { item: VoteData }) => (
    <View style={styles.voteItem}>
      <View style={styles.voteUserInfo}>
        <ThemedText style={styles.voteUserName}>
          {item.users?.display_name || 'Usuario'}
        </ThemedText>
        <ThemedText style={styles.voteDate}>
          {new Date(item.voted_at).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </ThemedText>
      </View>
      
      <View style={styles.voteInfo}>
        <IconSymbol name={item.vote === 'approve' ? 'hand.thumbsup.fill' : 'hand.thumbsdown.fill'} size={24} color={item.vote === 'approve' ? '#4CAF50' : '#F44336'} style={styles.voteEmoji} />
        <ThemedText style={styles.voteType}>
          {item.vote === 'approve' ? 'Aprobado' : 'Rechazado'}
        </ThemedText>
      </View>
      
      {item.comment && (
        <View style={styles.commentContainer}>
          <ThemedText style={styles.commentLabel}>Comentario:</ThemedText>
          <ThemedText style={styles.commentText}>{item.comment}</ThemedText>
        </View>
      )}
    </View>
  );

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <ThemedText type="title" style={styles.statsTitle}>Estadísticas de Votación</ThemedText>
      
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#E3F2FD' }]}>
            <IconSymbol name="clipboard.fill" size={18} color="#333" style={styles.statIconText} />
          </View>
          <ThemedText style={styles.statNumber}>{stats.totalVotes}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Votos</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#E8F5E8' }]}>
            <IconSymbol name="checkmark" size={18} color="#4CAF50" style={styles.statIconText} />
          </View>
          <ThemedText style={[styles.statNumber, { color: '#4CAF50' }]}>
            {stats.approveVotes}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Aprobados</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#FFEBEE' }]}>
            <IconSymbol name="xmark.circle.fill" size={18} color="#F44336" style={styles.statIconText} />
          </View>
          <ThemedText style={[styles.statNumber, { color: '#F44336' }]}>
            {stats.rejectVotes}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Rechazados</ThemedText>
        </View>
      </View>
      
      <View style={styles.progressSection}>
        <ThemedText style={styles.progressTitle}>Distribución de Votos</ThemedText>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${stats.totalVotes > 0 ? (stats.approveVotes / stats.totalVotes) * 100 : 0}%`,
                backgroundColor: '#4CAF50'
              }
            ]} 
          />
          <View 
            style={[
              styles.progressFill, 
              { 
                width: `${stats.totalVotes > 0 ? (stats.rejectVotes / stats.totalVotes) * 100 : 0}%`,
                backgroundColor: '#F44336'
              }
            ]} 
          />
        </View>
        
        <View style={styles.progressLabels}>
          <View style={styles.progressLabelItem}>
            <View style={[styles.progressDot, { backgroundColor: '#4CAF50' }]} />
            <ThemedText style={styles.progressLabel}>Aprobados</ThemedText>
          </View>
          <View style={styles.progressLabelItem}>
            <View style={[styles.progressDot, { backgroundColor: '#F44336' }]} />
            <ThemedText style={styles.progressLabel}>Rechazados</ThemedText>
          </View>
        </View>
      </View>
    </View>
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
        <ThemedText style={styles.errorText}>Error: {error}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Estadísticas de Votación',
        }} 
      />
      
      <FlatList
        data={votes}
        renderItem={renderVoteItem}
        keyExtractor={(item, index) => index.toString()}
        ListHeaderComponent={() => (
          <View>
            <ThemedText type="title" style={styles.budgetTitle}>
              {budgetTitle || 'Presupuesto'}
            </ThemedText>
            {renderStatsCard()}
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Historial de Votos ({votes.length})
            </ThemedText>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              Aún no hay votos registrados para este presupuesto.
            </ThemedText>
          </View>
        )}
        style={styles.list}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  budgetTitle: {
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statsCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  statsTitle: {
    textAlign: 'center',
    marginBottom: 24,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 28,
    flexWrap: 'wrap',
    gap: 20,
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIconText: {
    fontSize: 20,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#333',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '500',
  },
  progressSection: {
    marginTop: 16,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  progressBar: {
    height: 16,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    flexDirection: 'row',
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  progressLabelItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 8,
  },
  progressLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  sectionTitle: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    flex: 1,
  },
  voteItem: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  voteUserInfo: {
    marginBottom: 12,
  },
  voteUserName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
  },
  voteDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  voteInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  voteEmoji: {
    fontSize: 24,
  },
  voteType: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#333',
  },
  commentContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  commentLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  commentText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#333',
    lineHeight: 22,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 18,
    lineHeight: 26,
  },
  errorText: {
    color: '#F44336',
    textAlign: 'center',
    fontSize: 16,
    marginTop: 20,
  },
}); 