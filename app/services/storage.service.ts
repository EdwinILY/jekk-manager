import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase';
import { IconItem } from '../Interfaces/IconItem.interface';


type PickedImage = ImagePicker.ImagePickerAsset | null;


/**
 * Abre la galería y retorna la imagen seleccionada.
 */
export const pickImage = async (): Promise<PickedImage> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });

  if (!result.canceled) {
    const file = result.assets[0];
    return file;
  }
  return null;
};

/**
 * Abre la cámara y retorna la imagen capturada.
 */
export const takePhoto = async (): Promise<PickedImage> => {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 0.8,
  });

  if (!result.canceled) {
    return result.assets[0];
  }
  return null;
};


export const updateProfileWithDefaultIcon = async (
  userId: number, 
  defaultIconPath: string
): Promise<boolean> => {
  try {
    
    // 3. Actualizar en la base de datos usando tu función PostgreSQL
    const { error } = await supabase.rpc('update_user_photo_url', {
      user_id: userId,
      new_photo_url: defaultIconPath
    });

    if (error) {
      console.error('Error al actualizar ícono predeterminado:', error.message);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Excepción al actualizar ícono:', err);
    return false;
  }
};

/**
 * Sube una imagen al bucket de Supabase y retorna la URL pública.
 */
export const uploadImageToSupabase = async (uri: string, userId: number): Promise<string | null> => {
  try {
    // 1. Leer el archivo como base64
    const fileContent = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Definir la ruta en la carpeta User_Icon_CUSTOM
    const fileName = `User_Icon_CUSTOM/user_${userId}_${Date.now()}.jpg`;
    
    // 3. Subir la imagen a Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('usericon')
      .upload(fileName, decode(fileContent), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Error al subir imagen:', uploadError.message);
      throw new Error('No se pudo subir la imagen');
    }

    // 4. Obtener la URL pública
    const { data: urlData } = supabase.storage
      .from('usericon')
      .getPublicUrl(fileName);

    const publicUrl = urlData.publicUrl;

    // 5. Llamar a la función PostgreSQL para actualizar la URL
    const { error: rpcError } = await supabase.rpc('update_user_photo_url', {
      user_id: userId,
      new_photo_url: publicUrl
    });

    if (rpcError) {
      console.error('Error al actualizar URL:', rpcError.message);
      // Revertir: eliminar la imagen subida
      await supabase.storage
        .from('usericon')
        .remove([fileName]);
      throw new Error('No se pudo actualizar la foto de perfil');
    }

    return publicUrl;
  } catch (err) {
    console.error('Error completo:', err);
    return null;
  }
};

/**
 * Retorna la URL pública de una imagen en Supabase Storage.
 */
export const getPublicUrl = (path: string): string => {
  const { data } = supabase.storage.from('usericon').getPublicUrl(path);
  return data.publicUrl;
};

/**
 * Lista todos los íconos disponibles en el bucket.
 */
export const listIcons = async (): Promise<IconItem[]> => {
  const { data, error } = await supabase.storage.from('usericon').list('User_Icon_DEFAULT', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    console.error('Error al listar íconos:', error.message);
    return [];
  }

  return data
    .filter((item) => item.name.match(/\.(png|jpg|jpeg|webp)$/))
    .map((item) => {
      const fullPath = `User_Icon_DEFAULT/${item.name}`;
      return {
        name: item.name,
        url: getPublicUrl(fullPath),
      };
    });
};

/**
 * Verifica y solicita permisos para la cámara o galería.
 */
export const requestMediaPermissions = async (fromCamera: boolean): Promise<boolean> => {
  const permission = fromCamera
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  return permission.granted;
};

export default {};