import { IconItem } from '@/app/Interfaces/IconItem.interface';
import {
  listIcons,
  pickImage,
  requestMediaPermissions,
  takePhoto,
  uploadImageToSupabase,
} from '@/app/services/storage.service';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

interface IconPickerModalProps {
  visible: boolean;
  userID : number;
  onClose: () => void;
  onSelect: (url: string) => void;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  visible,
  userID,
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
    const icons = await listIcons();
    setIcons(icons);
    setLoading(false);
  };

  const handlePickImage = async (fromCamera: boolean) => {
    const hasPermission = await requestMediaPermissions(fromCamera);
    if (!hasPermission) {
      Alert.alert('Permiso denegado', 'No se puede acceder a la cámara o galería');
      return;
    }

    const result = fromCamera ? await takePhoto() : await pickImage();
    if (!result) return;

    const publicUrl = await uploadImageToSupabase(result.uri,userID);
    if (publicUrl) {
      onSelect(publicUrl);
      onClose();
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