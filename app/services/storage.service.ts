import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/supabase';

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
 * Sube una imagen al bucket de Supabase y retorna el path si tiene éxito.
 */
export const uploadImageToSupabase = async (
  file: ImagePicker.ImagePickerAsset
): Promise<string | null> => {
  const filePath: string = file.uri;
  const fileName: string = `fotos/${Date.now()}_${file.fileName || 'image.jpg'}`;

  try {
    const fileContent = await FileSystem.readAsStringAsync(filePath, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const { error } = await supabase.storage
      .from('usericon') // Reemplaza con tu bucket real
      .upload(fileName, Buffer.from(fileContent, 'base64'), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error al subir imagen:', error.message);
      return null;
    }

    return fileName;
  } catch (err) {
    console.error('Excepción al subir imagen:', (err as Error).message);
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
