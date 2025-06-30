import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width: screenWidth } = Dimensions.get('window');

const Dashboard = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Datos simulados - En producción vendrían de Supabase
  const mockData = {
    userGroups: [
      { id: 'all', name: 'Todos los grupos' },
      { id: 1, name: 'Familia', total_funds: 15000 },
      { id: 2, name: 'Trabajo', total_funds: 8500 },
      { id: 3, name: 'Amigos', total_funds: 3200 }
    ],
    expensesByCategory: [
      { name: 'Alimentación', amount: 4500, color: '#FF6B6B', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Transporte', amount: 2100, color: '#4ECDC4', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Entretenimiento', amount: 1800, color: '#45B7D1', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Servicios', amount: 3200, color: '#96CEB4', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Compras', amount: 2400, color: '#FFEAA7', legendFontColor: '#333', legendFontSize: 12 },
      { name: 'Salud', amount: 1200, color: '#DDA0DD', legendFontColor: '#333', legendFontSize: 12 }
    ],
    monthlyData: {
      labels: ['Ene', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          data: [7200, 8100, 8800, 7900, 9200, 8600],
          color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
          strokeWidth: 2
        }
      ]
    },
    budgetComparison: {
      labels: ['Presupuestado', 'Real', 'Aprobado'],
      data: [45000, 42500, 40800]
    },
    recentActivity: [
      { id: 1, type: 'expense', description: 'Compra supermercado', amount: 450, date: '29/06', group: 'Familia', icon: 'remove-circle' },
      { id: 2, type: 'contribution', description: 'Aporte mensual', amount: 2000, date: '28/06', group: 'Trabajo', icon: 'add-circle' },
      { id: 3, type: 'budget', description: 'Presupuesto: Vacaciones', amount: 5000, date: '27/06', group: 'Familia', icon: 'account-balance-wallet' },
      { id: 4, type: 'expense', description: 'Gasolina', amount: 120, date: '26/06', group: 'Personal', icon: 'remove-circle' }
    ]
  };

  const [dashboardData, setDashboardData] = useState(mockData);

  const loadDashboardData = async () => {
    setLoading(true);
    // Aquí irían las consultas a Supabase
    /*
    import { supabase } from '../lib/supabase';
    
    const { data: expenses } = await supabase
      .from('expenses')
      .select(`
        *,
        budgets!inner(group_id, title, amount),
        groups!inner(name)
      `)
      .eq('paid_by', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    */
    
    setTimeout(() => {
      setLoading(false);
      setRefreshing(false);
    }, 1000);
  };

  useEffect(() => {
    loadDashboardData();
  }, [selectedPeriod, selectedGroup]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const totalExpenses = dashboardData.expensesByCategory.reduce((sum, item) => sum + item.amount, 0);
  const budgetedAmount = dashboardData.budgetComparison.data[0];
  const actualAmount = dashboardData.budgetComparison.data[1];
  const difference = budgetedAmount - actualAmount;
  // Prepare BarChart data with datasets format to avoid undefined data error
  const budgetChartData = {
    labels: dashboardData.budgetComparison?.labels || [],
    datasets: [{ data: dashboardData.budgetComparison?.data || [] }]
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

  // Props for StatCard component
  interface StatCardProps {
    title: string;
    value: number;
    icon: string;
    color?: string;
    subtitle?: string;
  }

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = '#5196f4', subtitle }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <Icon name={icon} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={styles.statValue}>${value.toLocaleString()}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>Resumen de presupuestos</Text>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Grupo:</Text>
          <Picker
            selectedValue={selectedGroup}
            onValueChange={setSelectedGroup}
            style={styles.picker}
          >
            {dashboardData.userGroups.map(group => (
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
          value={totalExpenses}
          icon="account-balance-wallet"
          color="#FF6B6B"
        />
        <StatCard
          title="Presupuestado"
          value={budgetedAmount}
          icon="trending-up"
          color="#4ECDC4"
        />
        <StatCard
          title="Diferencia"
          value={Math.abs(difference)}
          icon={difference >= 0 ? "trending-up" : "trending-down"}
          color={difference >= 0 ? "#96CEB4" : "#FF6B6B"}
          subtitle={difference >= 0 ? "Bajo presupuesto" : "Sobre presupuesto"}
        />
        <StatCard
          title="Grupos"
          value={dashboardData.userGroups.length - 1}
          icon="group"
          color="#45B7D1"
        />
      </View>

      {/* Gráfico de Gastos por Categoría */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Gastos por Categoría</Text>
        <PieChart
          data={dashboardData.expensesByCategory}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          accessor="amount"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </View>

      {/* Gráfico de Tendencia Mensual */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Tendencia Mensual</Text>
        <LineChart
          data={dashboardData.monthlyData}
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
      </View>

      {/* Comparación de Presupuestos */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Comparación Presupuestaria</Text>
        <BarChart
          data={budgetChartData}
          yAxisLabel=""
          yAxisSuffix=""
          width={screenWidth - 40}
          height={220}
          chartConfig={chartConfig}
          style={styles.chart}
          showValuesOnTopOfBars
        />
      </View>

      {/* Actividad Reciente */}
      <View style={styles.activityContainer}>
        <Text style={styles.chartTitle}>Actividad Reciente</Text>
        {dashboardData.recentActivity.map(activity => (
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
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    fontWeight: '500',
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
});

export default Dashboard;