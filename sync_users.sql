-- Script para sincronizar usuarios existentes de auth.users con tu tabla users
-- Ejecutar este script una vez para sincronizar usuarios existentes

-- Función para actualizar usuario existente
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users 
  SET 
    email = NEW.email,
    display_name = NEW.raw_user_meta_data->>'display_name',
    photo_url = NEW.raw_user_meta_data->>'avatar_url',
    last_login = NEW.updated_at
  WHERE uid = NEW.id;
  
  -- Si no existe, crear el usuario
  IF NOT FOUND THEN
    INSERT INTO public.users (uid, email, display_name, photo_url, last_login)
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'display_name',
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.updated_at
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para actualizaciones de usuario
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Sincronizar usuarios existentes (ejecutar solo una vez)
INSERT INTO public.users (uid, email, display_name, photo_url, created_at, last_login)
SELECT 
  id,
  email,
  raw_user_meta_data->>'display_name',
  raw_user_meta_data->>'avatar_url',
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT uid FROM public.users WHERE uid IS NOT NULL)
ON CONFLICT (uid) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  photo_url = EXCLUDED.photo_url,
  last_login = EXCLUDED.last_login;

-- Habilitar RLS en la tabla users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Política para que los usuarios solo puedan ver su propio perfil
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = uid);

-- Política para que los usuarios puedan actualizar su propio perfil
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = uid);
