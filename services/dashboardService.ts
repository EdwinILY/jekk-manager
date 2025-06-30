// services/dashboardService.ts
import { supabase } from '../supabase';

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

// Helper function to get user ID from UID
const getUserIdFromUID = async (uid: string): Promise<number | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('uid', uid)
      .single();
    
    if (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
    
    return data?.id || null;
  } catch (error) {
    console.error('Error in getUserIdFromUID:', error);
    return null;
  }
};

// Helper function to format date periods
const getPeriodFilter = (period: string) => {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3;
      startDate = new Date(now.getFullYear(), quarterStart, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  
  return startDate.toISOString();
};

// Predefined colors for categories
const categoryColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', 
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43'
];
export const loadUserGroups = async (uid: string): Promise<UserGroup[]> => {
  try {
    const userId = await getUserIdFromUID(uid);
    if (!userId) return [{ id: 'all', name: 'Todos los grupos' }];

    const { data, error } = await supabase
      .from('group_members')
      .select(`
        groups (
          id,
          name
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading user groups:', error);
      return [{ id: 'all', name: 'Todos los grupos' }];
    }

    const groups: UserGroup[] = [{ id: 'all', name: 'Todos los grupos' }];
    
    if (data) {
      data.forEach((member: any) => {
        if (member.groups) {
          groups.push({
            id: member.groups.id.toString(),
            name: member.groups.name
          });
        }
      });
    }

    return groups;
  } catch (error) {
    console.error('Error in loadUserGroups:', error);
    return [{ id: 'all', name: 'Todos los grupos' }];
  }
};

export const loadExpensesByCategory = async (
  uid: string, 
  groupId: string, 
  period: string
): Promise<ExpenseCategory[]> => {
  try {
    const userId = await getUserIdFromUID(uid);
    if (!userId) return [];

    const startDate = getPeriodFilter(period);
    
    let query = supabase
      .from('expenses')
      .select('category, amount')
      .gte('date', startDate);

    // Filter by group if not "all"
    if (groupId !== 'all') {
      query = query.eq('group_id', parseInt(groupId));
    } else {
      // Get all groups for the user
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.group_id);
        query = query.in('group_id', groupIds);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading expenses by category:', error);
      return [];
    }

    // Group expenses by category
    const categoryTotals: { [key: string]: number } = {};
    
    if (data) {
      data.forEach(expense => {
        const category = expense.category || 'Sin categoría';
        categoryTotals[category] = (categoryTotals[category] || 0) + parseFloat(expense.amount);
      });
    }

    // Convert to ExpenseCategory array
    const categories: ExpenseCategory[] = Object.entries(categoryTotals).map(([name, amount], index) => ({
      name,
      amount,
      color: categoryColors[index % categoryColors.length],
      legendFontColor: '#7F7F7F',
      legendFontSize: 15,
    }));

    return categories;
  } catch (error) {
    console.error('Error in loadExpensesByCategory:', error);
    return [];
  }
};

export const loadMonthlyTrend = async (
  uid: string, 
  groupId: string
): Promise<MonthlyData> => {
  try {
    const userId = await getUserIdFromUID(uid);
    if (!userId) return { labels: [], datasets: [{ data: [] }] };

    // Get last 6 months
    const months = [];
    const labels = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date);
      labels.push(date.toLocaleDateString('es-ES', { month: 'short' }));
    }

    const monthlyData = [];

    for (const month of months) {
      const startDate = new Date(month.getFullYear(), month.getMonth(), 1);
      const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      let query = supabase
        .from('expenses')
        .select('amount')
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      // Filter by group if not "all"
      if (groupId !== 'all') {
        query = query.eq('group_id', parseInt(groupId));
      } else {
        // Get all groups for the user
        const { data: userGroups } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', userId);
        
        if (userGroups && userGroups.length > 0) {
          const groupIds = userGroups.map(g => g.group_id);
          query = query.in('group_id', groupIds);
        }
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error loading monthly trend:', error);
        monthlyData.push(0);
      } else {
        const total = data?.reduce((sum, expense) => sum + parseFloat(expense.amount), 0) || 0;
        monthlyData.push(total);
      }
    }

    return {
      labels,
      datasets: [
        {
          data: monthlyData,
          color: (opacity = 1) => `rgba(81, 150, 244, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };
  } catch (error) {
    console.error('Error in loadMonthlyTrend:', error);
    return { labels: [], datasets: [{ data: [] }] };
  }
};

export const loadBudgetComparison = async (
  uid: string, 
  groupId: string, 
  period: string
): Promise<BudgetComparison> => {
  try {
    const userId = await getUserIdFromUID(uid);
    if (!userId) return { labels: [], datasets: [{ data: [] }], data: [] };

    const startDate = getPeriodFilter(period);

    // Get budgets data
    let budgetQuery = supabase
      .from('budgets')
      .select('title, amount')
      .gte('created_at', startDate)
      .in('status', ['approved', 'executing', 'completed']);

    // Get expenses data  
    let expenseQuery = supabase
      .from('expenses')
      .select('budget_id, amount, budgets!inner(title)')
      .gte('date', startDate);

    // Filter by group if not "all"
    if (groupId !== 'all') {
      budgetQuery = budgetQuery.eq('group_id', parseInt(groupId));
      expenseQuery = expenseQuery.eq('group_id', parseInt(groupId));
    } else {
      // Get all groups for the user
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.group_id);
        budgetQuery = budgetQuery.in('group_id', groupIds);
        expenseQuery = expenseQuery.in('group_id', groupIds);
      }
    }

    const [budgetResult, expenseResult] = await Promise.all([
      budgetQuery,
      expenseQuery
    ]);

    if (budgetResult.error || expenseResult.error) {
      console.error('Error loading budget comparison:', budgetResult.error || expenseResult.error);
      return { labels: [], datasets: [{ data: [] }], data: [] };
    }

    // Process budget data
    const budgetTotals: { [key: string]: number } = {};
    const expenseTotals: { [key: string]: number } = {};

    budgetResult.data?.forEach(budget => {
      budgetTotals[budget.title] = parseFloat(budget.amount);
    });

    expenseResult.data?.forEach((expense: any) => {
      const budgetTitle = expense.budgets?.title || 'Sin presupuesto';
      expenseTotals[budgetTitle] = (expenseTotals[budgetTitle] || 0) + parseFloat(expense.amount);
    });

    // Combine data
    const labels = Object.keys(budgetTotals);
    const budgetData = labels.map(label => budgetTotals[label] || 0);
    const actualData = labels.map(label => expenseTotals[label] || 0);

    return {
      labels,
      datasets: [{ data: budgetData }],
      data: actualData,
    };
  } catch (error) {
    console.error('Error in loadBudgetComparison:', error);
    return { labels: [], datasets: [{ data: [] }], data: [] };
  }
};

export const loadRecentActivity = async (
  uid: string, 
  groupId: string
): Promise<ActivityItem[]> => {
  try {
    const userId = await getUserIdFromUID(uid);
    if (!userId) return [];

    const activities: ActivityItem[] = [];

    // Get recent expenses
    let expenseQuery = supabase
      .from('expenses')
      .select(`
        id,
        description,
        amount,
        date,
        groups (name)
      `)
      .order('date', { ascending: false })
      .limit(10);

    // Get recent budgets
    let budgetQuery = supabase
      .from('budgets')
      .select(`
        id,
        title,
        amount,
        created_at,
        groups (name)
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    // Filter by group if not "all"
    if (groupId !== 'all') {
      expenseQuery = expenseQuery.eq('group_id', parseInt(groupId));
      budgetQuery = budgetQuery.eq('group_id', parseInt(groupId));
    } else {
      // Get all groups for the user
      const { data: userGroups } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', userId);
      
      if (userGroups && userGroups.length > 0) {
        const groupIds = userGroups.map(g => g.group_id);
        expenseQuery = expenseQuery.in('group_id', groupIds);
        budgetQuery = budgetQuery.in('group_id', groupIds);
      }
    }

    const [expenseResult, budgetResult] = await Promise.all([
      expenseQuery,
      budgetQuery
    ]);

    // Process expenses
    if (expenseResult.data) {
      expenseResult.data.forEach((expense: any) => {
        activities.push({
          id: `expense-${expense.id}`,
          description: expense.description,
          type: 'expense',
          amount: parseFloat(expense.amount),
          icon: 'shopping-cart',
          group: expense.groups?.name || 'Sin grupo',
          date: getRelativeTime(expense.date),
        });
      });
    }

    // Process budgets
    if (budgetResult.data) {
      budgetResult.data.forEach((budget: any) => {
        activities.push({
          id: `budget-${budget.id}`,
          description: budget.title,
          type: 'budget',
          amount: parseFloat(budget.amount),
          icon: 'account-balance-wallet',
          group: budget.groups?.name || 'Sin grupo',
          date: getRelativeTime(budget.created_at),
        });
      });
    }

    // Sort by date and limit to 15 items
    activities.sort((a, b) => {
      const aTime = getTimeFromRelative(a.date);
      const bTime = getTimeFromRelative(b.date);
      return aTime - bTime;
    });

    return activities.slice(0, 15);
  } catch (error) {
    console.error('Error in loadRecentActivity:', error);
    return [];
  }
};

// Helper function to get relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInHours < 1) {
    return 'Hace menos de 1 hora';
  } else if (diffInHours < 24) {
    return `${diffInHours} hora${diffInHours > 1 ? 's' : ''}`;
  } else if (diffInDays < 7) {
    return `${diffInDays} día${diffInDays > 1 ? 's' : ''}`;
  } else {
    return date.toLocaleDateString('es-ES');
  }
};

// Helper function to convert relative time back to number for sorting
const getTimeFromRelative = (relativeTime: string): number => {
  if (relativeTime.includes('hora')) {
    const hours = parseInt(relativeTime.match(/\d+/)?.[0] || '0');
    return hours;
  } else if (relativeTime.includes('día')) {
    const days = parseInt(relativeTime.match(/\d+/)?.[0] || '0');
    return days * 24;
  } else {
    return 999999; // Old dates
  }
};

export const loadDashboardStats = async (
  uid: string, 
  groupId: string, 
  period: string
): Promise<DashboardStats> => {
  try {
    const userId = await getUserIdFromUID(uid);
    if (!userId) return {
      totalExpenses: 0,
      totalBudgeted: 0,
      totalActual: 0,
      difference: 0,
      groupCount: 0,
    };

    const startDate = getPeriodFilter(period);

    // Get user's groups count
    const { data: userGroups } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId);

    const groupIds = userGroups?.map(g => g.group_id) || [];
    const groupCount = groupIds.length;

    // Build queries based on group filter
    let expenseQuery = supabase
      .from('expenses')
      .select('amount')
      .gte('date', startDate);

    let budgetQuery = supabase
      .from('budgets')
      .select('amount, actual_spent')
      .gte('created_at', startDate)
      .in('status', ['approved', 'executing', 'completed']);

    // Filter by group if not "all"
    if (groupId !== 'all') {
      expenseQuery = expenseQuery.eq('group_id', parseInt(groupId));
      budgetQuery = budgetQuery.eq('group_id', parseInt(groupId));
    } else if (groupIds.length > 0) {
      expenseQuery = expenseQuery.in('group_id', groupIds);
      budgetQuery = budgetQuery.in('group_id', groupIds);
    }

    const [expenseResult, budgetResult] = await Promise.all([
      expenseQuery,
      budgetQuery
    ]);

    // Calculate totals
    const totalExpenses = expenseResult.data?.reduce(
      (sum, expense) => sum + parseFloat(expense.amount), 0
    ) || 0;

    const totalBudgeted = budgetResult.data?.reduce(
      (sum, budget) => sum + parseFloat(budget.amount), 0
    ) || 0;

    const totalActual = budgetResult.data?.reduce(
      (sum, budget) => sum + parseFloat(budget.actual_spent || '0'), 0
    ) || 0;

    const difference = totalBudgeted - totalExpenses;

    return {
      totalExpenses,
      totalBudgeted,
      totalActual,
      difference,
      groupCount,
    };
  } catch (error) {
    console.error('Error in loadDashboardStats:', error);
    return {
      totalExpenses: 0,
      totalBudgeted: 0,
      totalActual: 0,
      difference: 0,
      groupCount: 0,
    };
  }
};
