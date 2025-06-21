import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/supabase';

const { width } = Dimensions.get('window');

interface IconPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
}

interface IconItem {
  name: string;
  url: string;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [icons, setIcons] = useState<IconItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (visible) fetchIcons();
  }, [visible]);

  const fetchIcons = async () => {
    setLoading(true);
    const { data, error } = await supabase.storage.from('usericon').list('User_Icon_DEFAULT', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' },
    });

    if (error) {
      console.error('Error al listar íconos:', error.message);
      setLoading(false);
      return;
    }

    const iconsWithUrls: IconItem[] = data
      .filter((item) => item.name.match(/\.(png|jpg|jpeg|webp)$/))
      .map((item) => {
        const fullPath = `User_Icon_DEFAULT/${item.name}`;
        const { data: urlData } = supabase.storage.from('usericon').getPublicUrl(fullPath);
        return {
          name: item.name,
          url: urlData.publicUrl,
        };
      });

    setIcons(iconsWithUrls);
    setLoading(false);
  };

  const uploadImageToSupabase = async (uri: string): Promise<string | null> => {
    try {
      const fileContent = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileName = `uploads/${Date.now()}.jpg`;
      const { error } = await supabase.storage
        .from('usericon')
        .upload(fileName, Buffer.from(fileContent, 'base64'), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        Alert.alert('Error', 'No se pudo subir la imagen');
        return null;
      }

      const { data } = supabase.storage.from('usericon').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handlePickImage = async (fromCamera: boolean) => {
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso denegado', 'No se puede acceder a la cámara o galería');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, allowsEditing: true });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      const publicUrl = await uploadImageToSupabase(uri);
      if (publicUrl) {
        onSelect(publicUrl);
        onClose();
      }
    }
  };

  const handleSelect = (url: string) => {
    onSelect(url);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Selecciona una imagen</Text>

          <View style={styles.actions}>
            <Pressable onPress={() => handlePickImage(false)} style={styles.actionButton}>
              <Text style={styles.actionText}>Desde galería</Text>
            </Pressable>
            <Pressable onPress={() => handlePickImage(true)} style={styles.actionButton}>
              <Text style={styles.actionText}>Tomar foto</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#000" />
          ) : (
            <FlatList
              data={icons}
              numColumns={3}
              keyExtractor={(item) => item.name}
              contentContainerStyle={styles.list}
              renderItem={({ item }) => (
                <Pressable onPress={() => handleSelect(item.url)} style={styles.item}>
                  <Image source={{ uri: item.url }} style={styles.image} />
                </Pressable>
              )}
            />
          )}

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#0008',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxHeight: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#ddd',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    color: '#333',
    fontWeight: '500',
  },
  list: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  item: {
    margin: 8,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  closeButton: {
    marginTop: 12,
    backgroundColor: '#eee',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'center',
  },
  closeText: {
    color: '#333',
    fontWeight: '500',
  },
});
