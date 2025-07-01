export interface Budget {
  id: number;
  title: string;
  objective: string;
  amount: number;
  group_id: number;
  created_by: number;
  created_at: string;
  approve_votes: number;
  reject_votes: number;
  status: "draft" | "pending" | "approved" | "rejected" | "executing" | "completed";
  description?: string;
  contributed_amount?: number;
  remaining_amount?: number;
  contributor_count?: number;
}

export interface UserContribution {
  budget_id: number;
  budget_title: string;
  group_id: number;
  group_name: string;
  contribution_amount: number;
  budget_status: string;
  voted_at: string;
}

export interface BudgetContribution {
  user_id: number;
  user_name: string;
  contribution_amount: number;
  voted_at: string;
  comment?: string;
}

export interface NewBudget {
  title: string;
  description?: string;
  objective: string;
  amount: number;
  group_id: number;
  created_by: number;
}
