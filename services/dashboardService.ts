// services/dashboardService.ts
export interface ActivityItem {
  id: string;
  description: string;
  type: 'expense' | 'budget';
  amount: number;
  icon: string;
  group: string;
  date: string;
}

export interface UserGroup {
  id: string;
  name: string;
}

export interface ExpenseCategory {
  name: string;
  amount: number;
  color: string;
  legendFontColor: string;
  legendFontSize: number;
}

export interface DashboardStats {
  totalExpenses: number;
  totalBudgeted: number;
  totalActual: number;
  difference: number;
  groupCount: number;
}

export interface MonthlyData {
  labels: string[];
  datasets: {
    data: number[];
    color?: (opacity: number) => string;
    strokeWidth?: number;
  }[];
}

export interface BudgetComparison {
  labels: string[];
  datasets: {
    data: number[];
  }[];
  data: number[];
}

// Mock data functions - replace with actual API calls
export const loadUserGroups = async (userId: string): Promise<UserGroup[]> => {
  // Mock data - replace with actual API call
  return [
    { id: 'all', name: 'Todos los grupos' },
    { id: '1', name: 'Familia' },
    { id: '2', name: 'Trabajo' },
    { id: '3', name: 'Amigos' }
  ];
};

export const loadExpensesByCategory = async (
  userId: string, 
  groupId: string, 
  period: string
): Promise<ExpenseCategory[]> => {
  // Mock data - replace with actual API call
  return [
    {
      name: 'Alimentación',
      amount: 1200,
      color: '#FF6B6B',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Transporte',
      amount: 800,
      color: '#4ECDC4',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Entretenimiento',
      amount: 600,
      color: '#45B7D1',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
    {
      name: 'Otros',
      amount: 400,
      color: '#96CEB4',
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    },
  ];
};

export const loadMonthlyTrend = async (
  userId: string, 
  groupId: string
): Promise<MonthlyData> => {
  // Mock data - replace with actual API call
  return {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        data: [2000, 2500, 2200, 2800, 2400, 3000],
        color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };
};

export const loadBudgetComparison = async (
  userId: string, 
  groupId: string, 
  period: string
): Promise<BudgetComparison> => {
  // Mock data - replace with actual API call
  return {
    labels: ['Alimentación', 'Transporte', 'Entretenimiento'],
    datasets: [
      {
        data: [1500, 1000, 800],
      },
    ],
    data: [1200, 800, 600], // Actual expenses
  };
};

export const loadRecentActivity = async (
  userId: string, 
  groupId: string
): Promise<ActivityItem[]> => {
  // Mock data - replace with actual API call
  return [
    {
      id: '1',
      description: 'Compra en supermercado',
      type: 'expense',
      amount: 150,
      icon: 'shopping-cart',
      group: 'Familia',
      date: '2 horas',
    },
    {
      id: '2',
      description: 'Gasolina',
      type: 'expense',
      amount: 80,
      icon: 'local-gas-station',
      group: 'Personal',
      date: '5 horas',
    },
    {
      id: '3',
      description: 'Nuevo presupuesto creado',
      type: 'budget',
      amount: 2000,
      icon: 'account-balance-wallet',
      group: 'Trabajo',
      date: '1 día',
    },
  ];
};

export const loadDashboardStats = async (
  userId: string, 
  groupId: string, 
  period: string
): Promise<DashboardStats> => {
  // Mock data - replace with actual API call
  return {
    totalExpenses: 3000,
    totalBudgeted: 3500,
    totalActual: 3000,
    difference: 500,
    groupCount: 3,
  };
};
