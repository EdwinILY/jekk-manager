import { supabase } from '../../supabase';

export const updateUserDisplayName = async (
  userId: number,
  newDisplayName: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validación básica
    if (!newDisplayName || newDisplayName.trim().length === 0) {
      return { success: false, error: 'El nombre no puede estar vacío' };
    }

    if (newDisplayName.length > 50) {
      return { success: false, error: 'El nombre es demasiado largo' };
    }

    // Llamada a la función PostgreSQL
    const { error } = await supabase.rpc('update_user_display_name', {
      user_id: userId,
      new_display_name: newDisplayName.trim()
    });

    if (error) {
      console.error('Error updating display name:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Exception updating display name:', err);
    return { 
      success: false, 
      error: (err as Error).message || 'Error desconocido al actualizar el nombre'    };
  }
};

export default {};