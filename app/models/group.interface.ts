export interface GroupSummary {
    id: number;
    name: string;
    description: string;
    total_funds: number;
    member_count: number;
    active_budgets: number;
    created_by_name: string;
  }

export interface NewGroup {
    name: string;
    description: string;
    created_by: number;
} 