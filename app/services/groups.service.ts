import { supabase } from '@/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { Budget, NewBudget } from '../models/budget.interface';
import { GroupSummary, NewGroup } from '../models/group.interface';


export const getGroupsSummary = async (userId: number): Promise<GroupSummary[]> => {
  const { data, error } = await supabase.rpc('get_groups_summary', { p_user_id: userId });

  if (error) {
    console.error('Error fetching groups summary:', error);
    throw new Error(error.message);
  }

  return data as GroupSummary[];
};

export const getGroupsByStatus = async (userId: number, status: 'active' | 'archived'): Promise<GroupSummary[]> => {
  const { data, error } = await supabase.rpc('get_groups_by_user_status', { 
    p_user_id: userId, 
    p_status: status 
  });

  if (error) {
    console.error('Error fetching groups by status:', error);
    throw new Error(error.message);
  }

  return data as GroupSummary[];
};

export const getBudgetsForGroup = async (groupId: number): Promise<Budget[]> => {
  const { data, error } = await supabase.rpc('get_budgets_for_group', { p_group_id: groupId });

  if (error) {
    console.error('Error fetching budgets for group:', error);
    throw new Error(error.message);
  }

  return data as Budget[];
}

export const createBudget = async (budgetData: NewBudget): Promise<number> => {
  const { data, error } = await supabase.rpc('create_budget', {
      p_group_id: budgetData.group_id,
      p_title: budgetData.title,
      p_description: budgetData.description,
      p_objective: budgetData.objective,
      p_amount: budgetData.amount,
      p_created_by: budgetData.created_by
  });

  if (error) {
      console.error('Error creating budget:', error);
      throw new Error('No se pudo crear el presupuesto: ' + error.message);
  }
  return data;
};

export const uploadAttachment = async (fileUri: string): Promise<string> => {
    const fileBase64 = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.Base64,
    });

    const filePath = `${new Date().getTime()}.jpeg`;
    const contentType = 'image/jpeg';

    const { data, error } = await supabase.storage
        .from('attachments')
        .upload(filePath, decode(fileBase64), { contentType });

    if (error) {
        console.error('Error uploading attachment:', error);
        throw new Error('No se pudo subir el archivo adjunto.');
    }

    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(data.path);
    return publicUrl;
};

export const addBudgetAttachment = async (budgetId: number, url: string): Promise<void> => {
    const { error } = await supabase.rpc('add_budget_attachment', {
        p_budget_id: budgetId,
        p_type: 'image',
        p_url: url
    });

    if (error) {
        console.error('Error adding budget attachment:', error);
        throw new Error('No se pudo adjuntar el archivo al presupuesto.');
    }
}

export const voteOnBudget = async (budgetId: number, userId: number, vote: 'approve' | 'reject'): Promise<void> => {
  const { error } = await supabase.rpc('vote_on_budget', {
      p_budget_id: budgetId,
      p_user_id: userId,
      p_vote: vote
  });

  if (error) {
      console.error('Error voting on budget:', error);
      throw new Error('No se pudo registrar el voto: ' + error.message);
  }
}

export const voteOnBudgetWithComment = async (budgetId: number, userId: number, vote: 'approve' | 'reject', comment?: string): Promise<void> => {
  const { error } = await supabase.rpc('vote_on_budget_with_comment', {
      p_budget_id: budgetId,
      p_user_id: userId,
      p_vote: vote,
      p_comment: comment || null
  });

  if (error) {
      console.error('Error voting on budget with comment:', error);
      throw new Error('No se pudo registrar el voto: ' + error.message);
  }
}

export const updateBudgetStatus = async (budgetId: number, newStatus: string, userId: number): Promise<void> => {
  const { error } = await supabase.rpc('update_budget_status', {
      p_budget_id: budgetId,
      p_new_status: newStatus,
      p_user_id: userId
  });

  if (error) {
      console.error('Error updating budget status:', error);
      throw new Error('No se pudo actualizar el estado del presupuesto: ' + error.message);
  }
};

export const getUserVote = async (budgetId: number, userId: number): Promise<'approve' | 'reject' | null> => {
  const { data, error } = await supabase
    .from('budget_votes')
    .select('vote')
    .eq('budget_id', budgetId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error getting user vote:', error);
    throw new Error('No se pudo obtener el voto del usuario: ' + error.message);
  }

  return data?.vote || null;
};

export const isUserAdmin = async (groupId: number, userId: number): Promise<boolean> => {
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error checking user role:', error);
    return false;
  }

  return data?.role === 'admin';
};

export const getBudgetVotes = async (budgetId: number): Promise<any[]> => {
  const { data, error } = await supabase
    .from('budget_votes')
    .select(`
      vote,
      comment,
      voted_at,
      users:user_id (
        id,
        display_name,
        photo_url
      )
    `)
    .eq('budget_id', budgetId)
    .order('voted_at', { ascending: false });

  if (error) {
    console.error('Error getting budget votes:', error);
    throw new Error('No se pudo obtener el historial de votos: ' + error.message);
  }

  return data || [];
};

export const generateInviteCode = async (groupId: number): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_invite_code', { p_group_id: groupId });
    if (error) {
        console.error('Error generating invite code:', error);
        throw new Error('No se pudo generar el código de invitación.');
    }
    return data;
};

export const joinGroupWithCode = async (userId: number, inviteCode: string): Promise<number> => {
    const { data, error } = await supabase.rpc('join_group_with_code', { p_user_id: userId, p_invite_code: inviteCode });
    if (error) {
        console.error('Error joining group:', error);
        throw new Error(error.message || 'No se pudo unir al grupo.');
    }
    return data;
};

export const createGroup = async (groupData: NewGroup): Promise<number> => {
  const { data, error } = await supabase.rpc('create_group', {
      p_name: groupData.name,
      p_description: groupData.description,
      p_created_by: groupData.created_by
  });

  if (error) {
      console.error('Error creating group:', error);
      throw new Error('No se pudo crear el grupo: ' + error.message);
  }
  return data;
};

export const updateGroupStatus = async (groupId: number, newStatus: string, userId: number): Promise<void> => {
  const { error } = await supabase.rpc('update_group_status', {
      p_group_id: groupId,
      p_new_status: newStatus,
      p_user_id: userId
  });

  if (error) {
      console.error('Error updating group status:', error);
      throw new Error('No se pudo actualizar el estado del grupo: ' + error.message);
  }
};

export const updateUserGroupStatus = async (groupId: number, userId: number, newStatus: string): Promise<void> => {
  const { error } = await supabase.rpc('update_user_group_status', {
      p_group_id: groupId,
      p_user_id: userId,
      p_new_status: newStatus
  });

  if (error) {
      console.error('Error updating user group status:', error);
      throw new Error('No se pudo actualizar el estado del grupo: ' + error.message);
  }
}; 