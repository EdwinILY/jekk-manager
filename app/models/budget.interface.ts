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
    status: 'draft' | 'pending' | 'approved' | 'rejected' | 'executing' | 'completed';
}

export interface NewBudget {
    title: string;
    description?: string;
    objective: string;
    amount: number;
    group_id: number;
    created_by: number;
} 