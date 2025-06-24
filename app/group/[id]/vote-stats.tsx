import { getBudgetVotes } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

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
        <Text style={styles.voteEmoji}>
          {item.vote === 'approve' ? '👍' : '👎'}
        </Text>
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
          <ThemedText style={styles.statNumber}>{stats.totalVotes}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Votos</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: 'green' }]}>
            {stats.approveVotes}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Aprobados</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={[styles.statNumber, { color: 'red' }]}>
            {stats.rejectVotes}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Rechazados</ThemedText>
        </View>
        
        <View style={styles.statItem}>
          <ThemedText style={styles.statNumber}>
            {stats.participationRate.toFixed(1)}%
          </ThemedText>
          <ThemedText style={styles.statLabel}>Participación</ThemedText>
        </View>
      </View>
      
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${stats.totalVotes > 0 ? (stats.approveVotes / stats.totalVotes) * 100 : 0}%`,
              backgroundColor: 'green'
            }
          ]} 
        />
        <View 
          style={[
            styles.progressFill, 
            { 
              width: `${stats.totalVotes > 0 ? (stats.rejectVotes / stats.totalVotes) * 100 : 0}%`,
              backgroundColor: 'red'
            }
          ]} 
        />
      </View>
      
      <View style={styles.progressLabels}>
        <ThemedText style={styles.progressLabel}>Aprobados</ThemedText>
        <ThemedText style={styles.progressLabel}>Rechazados</ThemedText>
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
  },
  budgetTitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  statsCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsTitle: {
    textAlign: 'center',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    flexDirection: 'row',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionTitle: {
    marginBottom: 15,
  },
  list: {
    flex: 1,
  },
  voteItem: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  voteUserInfo: {
    marginBottom: 8,
  },
  voteUserName: {
    fontWeight: 'bold',
    fontSize: 16,
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
  voteType: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  commentContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  commentLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
}); 