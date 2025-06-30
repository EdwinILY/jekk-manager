import { supabase } from "../../supabase";

export const ObtenerIdAuthSupabase = async (): Promise<string | null> => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      if (session != null) {
        const { user } = session;
        const idAuthSupabase = user.id;
        return idAuthSupabase;
      }
      
      return null;
    } catch (error) {
      console.error('Error getting Supabase auth ID:', error);
      return null;
    }
  }

export default {};
