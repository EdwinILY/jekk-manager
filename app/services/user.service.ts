import { supabase } from "@/supabase"
import { UserInterface } from "../models/user.interfaz"

export async function getUserById(id: number): Promise<UserInterface | null> {
  const { data, error } = await supabase.rpc('get_user_by_id', { user_id: id })

  if (error) {
    console.error('Error al obtener usuario:', error)
    return null
  }

    return data as UserInterface;
}


