export interface GroupSummary {
    id: number;
    name: string;
    description: string;
    total_funds: number;
    member_count: number;
    active_budgets: number;
    created_by_name: string;
    user_status?: string; // 'active', 'archived', 'left' - estado del usuario en el grupo
  }

export interface NewGroup {
    name: string;
    description: string;
    created_by: number;
} 