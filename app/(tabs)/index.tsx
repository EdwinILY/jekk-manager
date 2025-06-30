// components/Dashboard.js
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Importar nuestras funciones de servicio
import {
  loadBudgetComparison,
  loadDashboardStats,
  loadExpensesByCategory,
  loadMonthlyTrend,
  loadRecentActivity,
  loadUserGroups,
  type ActivityItem,
  type BudgetComparison,
  type DashboardStats,
  type ExpenseCategory,
  type MonthlyData,
  type UserGroup,
} from '../../services/dashboardService';
import { generatePDF } from '../../services/pdfService';

const { width: screenWidth } = Dimensions.get('window');

interface DashboardProps {
  userId?: string;
}

const Dashboard: React.FC<DashboardProps> = ({ userId }) => { // userId viene de tu sistema de autenticación
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Estados para los datos
  const [userGroups, setUserGroups] = useState<UserGroup[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategory[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData>({ labels: [], datasets: [{ data: [] }] });
  const [budgetComparison, setBudgetComparison] = useState<BudgetComparison>({ labels: [], datasets: [{ data: [] }], data: [] });
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalExpenses: 0,
    totalBudgeted: 0,
    totalActual: 0,
    difference: 0,
    groupCount: 0
  });

  // Función principal para cargar todos los datos
  const loadAllDashboardData = React.useCallback(async () => {
    if (!userId) return;
    
    try {
      setLoading(true);

      // Cargar datos en paralelo para mejor rendimiento
      const [
        groupsData,
        categoriesData,
        monthlyTrendData,
        budgetData,
        activityData,
        statsData
      ] = await Promise.all([
        loadUserGroups(userId),
        loadExpensesByCategory(userId, selectedGroup, selectedPeriod),
        loadMonthlyTrend(userId, selectedGroup),
        loadBudgetComparison(userId, selectedGroup, selectedPeriod),
        loadRecentActivity(userId, selectedGroup),
        loadDashboardStats(userId, selectedGroup, selectedPeriod)
      ]);

      // Actualizar estados
      setUserGroups(groupsData);
      setExpensesByCategory(categoriesData);
      setMonthlyData(monthlyTrendData);
      setBudgetComparison(budgetData);
      setRecentActivity(activityData);
      setDashboardStats(statsData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert(
        'Error',
        'No se pudieron cargar los datos del dashboard. Intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId, selectedGroup, selectedPeriod]);

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (userId) {
      loadAllDashboardData();
    }
  }, [userId, selectedPeriod, selectedGroup, loadAllDashboardData]);

  // Función para refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadAllDashboardData();
  };

  // Función para generar PDF
  const handleGeneratePDF = async () => {
    if (!userId) {
      Alert.alert('Error', 'No se puede generar el PDF sin usuario autenticado');
      return;
    }

    if (expensesByCategory.length === 0 && recentActivity.length === 0) {
      Alert.alert('Sin datos', 'No hay datos suficientes para generar el PDF');
      return;
    }

    setGeneratingPDF(true);
    
    const selectedGroupData = userGroups.find(group => group.id === selectedGroup);
    const groupName = selectedGroupData?.name || 'Todos los grupos';

    const pdfData = {
      dashboardStats,
      expensesByCategory,
      recentActivity,
      selectedGroup,
      selectedPeriod,
      groupName,
    };

    try {
      await generatePDF(pdfData);
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF. Verifica los permisos de almacenamiento.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#5196f4'
    }
  };

  interface StatCardProps {
    title: string;
    value: number;
    icon: string;
    color?: string;
    subtitle?: string;
    showCurrency?: boolean;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = '#5196f4', subtitle, showCurrency = true }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>
        {showCurrency ? '$' : ''}{typeof value === 'number' ? value.toLocaleString() : '0'}
      </Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Mostrar loading si no hay userId
  if (!userId) {
    return (
      <View style={styles.loadingContainer}>
        <Icon name="account-circle" size={64} color="#ccc" />
        <Text style={styles.loadingText}>Inicia sesión para ver tu dashboard</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.headerSubtitle}>Resumen de presupuestos</Text>
          </View>
          <TouchableOpacity 
            style={[styles.pdfButton, (loading || generatingPDF) && styles.pdfButtonDisabled]} 
            onPress={handleGeneratePDF}
            disabled={loading || generatingPDF}
          >
            <Icon 
              name={generatingPDF ? "hourglass-empty" : "picture-as-pdf"} 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.pdfButtonText}>
              {generatingPDF ? 'Generando...' : 'PDF'}
            </Text>
          </TouchableOpacity>
        </View>
        {loading && (
          <View style={styles.loadingIndicator}>
            <Icon name="sync" size={20} color="#666" />
            <Text style={styles.loadingIndicatorText}>Cargando...</Text>
          </View>
        )}
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Grupo:</Text>
          <Picker
            selectedValue={selectedGroup}
            onValueChange={setSelectedGroup}
            style={styles.picker}
            enabled={!loading}
          >
            {userGroups.map(group => (
              <Picker.Item key={group.id} label={group.name} value={group.id} />
            ))}
          </Picker>
        </View>
        
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Período:</Text>
          <Picker
            selectedValue={selectedPeriod}
            onValueChange={setSelectedPeriod}
            style={styles.picker}
            enabled={!loading}
          >
            <Picker.Item label="Esta semana" value="week" />
            <Picker.Item label="Este mes" value="month" />
            <Picker.Item label="Trimestre" value="quarter" />
            <Picker.Item label="Este año" value="year" />
          </Picker>
        </View>
      </View>

      {/* Tarjetas de Resumen */}
      <View style={styles.statsGrid}>
        <StatCard
          title="Total Gastado"
          value={dashboardStats.totalExpenses}
          icon="account-balance-wallet"
          color="#FF6B6B"
        />
        <StatCard
          title="Presupuestado"
          value={dashboardStats.totalBudgeted}
          icon="trending-up"
          color="#4ECDC4"
        />
        <StatCard
          title="Diferencia"
          value={Math.abs(dashboardStats.difference)}
          icon={dashboardStats.difference >= 0 ? "trending-up" : "trending-down"}
          color={dashboardStats.difference >= 0 ? "#96CEB4" : "#FF6B6B"}
          subtitle={dashboardStats.difference >= 0 ? "Bajo presupuesto" : "Sobre presupuesto"}
        />
        <StatCard
          title="Grupos"
          value={dashboardStats.groupCount}
          icon="group"
          color="#45B7D1"
          showCurrency={false}
        />
      </View>

      {/* Gráfico de Gastos por Categoría */}
      {expensesByCategory.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Gastos por Categoría</Text>
          <PieChart
            data={expensesByCategory}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>
      )}

      {/* Gráfico de Tendencia Mensual */}
      {monthlyData.labels.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Tendencia Mensual</Text>
          <LineChart
            data={monthlyData}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Comparación de Presupuestos */}
      {budgetComparison.data.length > 0 && (
        <View style={styles.chartContainer}>
          <Text style={styles.chartTitle}>Comparación Presupuestaria</Text>
          <BarChart
            data={budgetComparison}
            width={screenWidth - 40}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            showValuesOnTopOfBars
            yAxisLabel="$"
            yAxisSuffix=""
          />
        </View>
      )}

      {/* Actividad Reciente */}
      <View style={styles.activityContainer}>
        <Text style={styles.chartTitle}>Actividad Reciente</Text>
        {recentActivity.length > 0 ? (
          recentActivity.map(activity => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityLeft}>
                <Icon 
                  name={activity.icon} 
                  size={24} 
                  color={activity.type === 'expense' ? '#FF6B6B' : '#4ECDC4'} 
                />
                <View style={styles.activityInfo}>
                  <Text style={styles.activityDescription}>{activity.description}</Text>
                  <Text style={styles.activityMeta}>{activity.group} • {activity.date}</Text>
                </View>
              </View>
              <Text style={[
                styles.activityAmount,
                { color: activity.type === 'expense' ? '#FF6B6B' : '#4ECDC4' }
              ]}>
                {activity.type === 'expense' ? '-' : '+'}${activity.amount.toLocaleString()}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyStateText}>No hay actividad reciente</Text>
          </View>
        )}
      </View>

      {/* Mensaje si no hay datos */}
      {expensesByCategory.length === 0 && !loading && (
        <View style={styles.emptyDashboard}>
          <Icon name="bar-chart" size={64} color="#ccc" />
          <Text style={styles.emptyDashboardTitle}>No hay datos disponibles</Text>
          <Text style={styles.emptyDashboardText}>
            Comienza agregando gastos a tus presupuestos para ver las estadísticas
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#343a40',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 4,
  },
  pdfButton: {
    backgroundColor: '#5196f4',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  pdfButtonDisabled: {
    backgroundColor: '#9ca3af',
    elevation: 0,
    shadowOpacity: 0,
  },
  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  loadingIndicatorText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 10,
    marginHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  pickerContainer: {
    marginVertical: 5,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 5,
  },
  picker: {
    height: 50,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  statsGrid: {
    padding: 20,
    gap: 15,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 14,
    color: '#6c757d',
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginVertical: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343a40',
    marginBottom: 15,
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
  },
  activityContainer: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 10,
    marginBottom: 40,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  activityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityInfo: {
    marginLeft: 12,
    flex: 1,
  },
  activityDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343a40',
  },
  activityMeta: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  activityAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyDashboard: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyDashboardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#343a40',
    marginTop: 16,
    textAlign: 'center',
  },
  emptyDashboardText: {
    fontSize: 16,
    color: '#6c757d',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
});

// Wrapper component that provides userId - replace with your auth logic
const DashboardWrapper: React.FC = () => {
  // Replace this with your actual user authentication logic
  const userId = 'user-123'; // This should come from your auth context/state
  
  return <Dashboard userId={userId} />;
};

export default DashboardWrapper;