import { getBudgetAttachments, getBudgetsForGroup } from '@/app/services/groups.service';
import { ObtenerIdAuthSupabase } from "@/app/services/supa.service";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';
import { supabase } from '@/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

export default function BudgetDetailScreen() {
  const { id: groupId, budgetId } = useLocalSearchParams<{ id: string; budgetId: string }>();
  const router = useRouter();
  const [budget, setBudget] = useState<any>(null);
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState({ title: '', objective: '', amount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [editImages, setEditImages] = useState<{ url: string, toDelete?: boolean }[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Simulación: el usuario actual es admin o creador si su id es 1
  const isAdminOrCreator = budget && currentUserId && (budget.created_by === currentUserId);

  // Colores adaptativos
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#18181b' }, 'background');
  const borderColor = useThemeColor({ light: '#e0e0e0', dark: '#333' }, 'background');
  const textColor = useThemeColor({}, 'text');
  const secondaryTextColor = useThemeColor({ light: '#666', dark: '#aaa' }, 'text');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const groupBudgets = await getBudgetsForGroup(Number(groupId));
        const found = groupBudgets.find((b: any) => b.id === Number(budgetId));
        setBudget(found);
        setEditData({
          title: found?.title || '',
          objective: found?.objective || '',
          amount: found?.amount?.toString() || '',
          description: found?.description || '',
        });
        const attachments = await getBudgetAttachments(Number(budgetId));
        setImages(attachments.map(a => a.url));
        setEditImages(attachments.map(a => ({ url: a.url })));
        setNewImages([]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId, budgetId]);

  useEffect(() => {
    const fetchUserId = async () => {
      const uid = await ObtenerIdAuthSupabase();
      if (!uid) return;
      // Buscar el usuario por UID en la tabla users
      const { data, error } = await supabase.from('users').select('id').eq('uid', uid).single();
      if (!error && data) setCurrentUserId(data.id);
    };
    fetchUserId();
  }, []);

  const handlePickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled) {
      setNewImages([...newImages, ...result.assets.map(asset => asset.uri)]);
    }
  };

  const handleRemoveEditImage = (url: string) => {
    setEditImages(editImages.map(img => img.url === url ? { ...img, toDelete: !img.toDelete } : img));
  };

  const handleRemoveNewImage = (uri: string) => {
    setNewImages(newImages.filter(img => img !== uri));
  };

  const removeImageFromStorage = async (publicUrl: string) => {
    // Extraer la ruta relativa después de /attachments/
    const match = publicUrl.match(/attachments\/(.+)$/);
    if (!match) return;
    const path = match[1];
    await supabase.storage.from('attachments').remove([path]);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      // 1. Eliminar imágenes marcadas
      for (const img of editImages) {
        if (img.toDelete) {
          // Eliminar de la base de datos
          await supabase.from('budget_attachments').delete().eq('url', img.url);
          // Eliminar del storage (extraer ruta después de 'attachments/')
          const match = img.url.match(/attachments\/(.+)$/);
          if (match && match[1]) {
            await supabase.storage.from('attachments').remove([match[1]]);
          }
        }
      }
      // 2. Subir nuevas imágenes
      for (const uri of newImages) {
        // Subir a storage
        const fileBase64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        const filePath = `${Date.now()}_${Math.floor(Math.random()*10000)}.jpg`;
        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, decode(fileBase64), { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(filePath);
        // Registrar en la base de datos
        await supabase.from('budget_attachments').insert({ budget_id: budgetId, type: 'image', url: publicUrl });
      }
      // 3. Actualizar presupuesto
      const { error } = await supabase
        .from('budgets')
        .update({
          title: editData.title,
          objective: editData.objective,
          amount: parseFloat(editData.amount),
          description: editData.description,
        })
        .eq('id', budgetId);
      if (error) throw error;
      setEditModal(false);
      Alert.alert('Presupuesto actualizado');
      // Refrescar datos
      const groupBudgets = await getBudgetsForGroup(Number(groupId));
      const found = groupBudgets.find((b: any) => b.id === Number(budgetId));
      setBudget(found);
      const attachments = await getBudgetAttachments(Number(budgetId));
      setImages(attachments.map(a => a.url));
      setEditImages(attachments.map(a => ({ url: a.url })));
      setNewImages([]);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </ThemedView>
    );
  }

  if (error || !budget) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={{ color: 'red' }}>No se pudo cargar el presupuesto.</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}> 
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.headerRow, { marginTop: 20 }]}>
          <Pressable onPress={() => router.back()} style={[styles.backButton, { paddingHorizontal: 6, paddingVertical: 4 }]}>
            <IconSymbol name="chevron.right" size={28} color={Colors.light.tint} style={{ transform: [{ rotate: '180deg' }] }} />
            <ThemedText style={[styles.backText, { fontSize: 18, marginLeft: 4 }]}>Volver</ThemedText>
          </Pressable>
          {isAdminOrCreator && (
            <Pressable onPress={() => setEditModal(true)} style={styles.editButton}>
              <IconSymbol name="edit" size={22} color={Colors.light.tint} />
              <ThemedText style={styles.editText}>Editar</ThemedText>
            </Pressable>
          )}
        </View>

        <ThemedText type="title" style={[styles.title, { color: textColor }]}>{budget.title}</ThemedText>
        <View style={styles.statusRow}>
          <IconSymbol name="clipboard.fill" size={18} color={Colors.light.tint} style={{ marginRight: 6 }} />
          <ThemedText style={[styles.status, { color: Colors.light.tint }]}>{budget.status.toUpperCase()}</ThemedText>
        </View>
        <ThemedText style={[styles.amount, { color: Colors.light.tint }]}>${budget.amount.toFixed(2)}</ThemedText>
        <ThemedText style={[styles.objective, { color: secondaryTextColor }]}>{budget.objective}</ThemedText>
        <ThemedText style={[styles.description, { color: secondaryTextColor }]}> 
          {budget.description ? budget.description : 'Sin descripción'}
        </ThemedText>
        <View style={styles.datesRow}>
          {budget.created_at && (
            <ThemedText style={styles.dateText}>Creado: {new Date(budget.created_at).toLocaleDateString()}</ThemedText>
          )}
          {budget.target_date && (
            <ThemedText style={styles.dateText}>Objetivo: {new Date(budget.target_date).toLocaleDateString()}</ThemedText>
          )}
        </View>

        {/* Galería de imágenes en el detalle */}
        {images.length > 0 && (
          <View style={styles.gallerySection}>
            <ThemedText style={[styles.galleryTitle, { color: textColor }]}>Imágenes adjuntas</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {images.map((url, idx) => (
                <Pressable key={idx} onPress={() => setPreviewImage(url)}>
                  <Image source={{ uri: url }} style={styles.galleryImage} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Modal de edición */}
      <Modal
        visible={editModal}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground, borderColor }]}> 
            <ThemedText type="title" style={[styles.modalTitle, { color: textColor }]}>Editar Presupuesto</ThemedText>
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={editData.title}
              onChangeText={t => setEditData({ ...editData, title: t })}
              placeholder="Título"
              placeholderTextColor={secondaryTextColor}
            />
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={editData.objective}
              onChangeText={t => setEditData({ ...editData, objective: t })}
              placeholder="Objetivo"
              placeholderTextColor={secondaryTextColor}
            />
            <TextInput
              style={[styles.input, { color: textColor, borderColor }]}
              value={editData.amount}
              onChangeText={t => setEditData({ ...editData, amount: t.replace(/[^0-9.]/g, '') })}
              placeholder="Monto"
              keyboardType="numeric"
              placeholderTextColor={secondaryTextColor}
            />
            <TextInput
              style={[styles.input, styles.textArea, { color: textColor, borderColor }]}
              value={editData.description}
              onChangeText={t => setEditData({ ...editData, description: t })}
              placeholder="Descripción"
              placeholderTextColor={secondaryTextColor}
              multiline
              numberOfLines={4}
            />
            {/* Galería de imágenes actuales */}
            <ThemedText style={[styles.galleryTitle, { color: textColor, marginTop: 8 }]}>Imágenes actuales</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
              {editImages.map((img, idx) => (
                <View key={idx} style={{ position: 'relative', marginRight: 12 }}>
                  <Pressable onPress={() => setPreviewImage(img.url)}>
                    <Image source={{ uri: img.url }} style={styles.galleryImage} />
                    {img.toDelete && (
                      <View style={styles.deleteOverlay}>
                        <IconSymbol name="delete" size={48} color="#e74c3c" />
                      </View>
                    )}
                  </Pressable>
                  <Pressable
                    style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#fff8', borderRadius: 12, padding: 2 }}
                    onPress={() => handleRemoveEditImage(img.url)}
                  >
                    <IconSymbol name={img.toDelete ? "restore" : "delete"} size={18} color={img.toDelete ? '#27ae60' : '#e74c3c'} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
            {/* Galería de nuevas imágenes */}
            {newImages.length > 0 && (
              <>
                <ThemedText style={[styles.galleryTitle, { color: textColor, marginTop: 8 }]}>Nuevas imágenes</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                  {newImages.map((uri, idx) => (
                    <View key={idx} style={{ position: 'relative', marginRight: 12 }}>
                      <Pressable onPress={() => setPreviewImage(uri)}>
                        <Image source={{ uri }} style={styles.galleryImage} />
                      </Pressable>
                      <Pressable
                        style={{ position: 'absolute', top: 6, right: 6, backgroundColor: '#fff8', borderRadius: 12, padding: 2 }}
                        onPress={() => handleRemoveNewImage(uri)}
                      >
                        <IconSymbol name="delete" size={18} color="#e74c3c" />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
            <Pressable style={[styles.imagePickerButton, { borderColor }]} onPress={handlePickImages}>
              <IconSymbol name="image" size={18} color={Colors.light.tint} />
              <ThemedText style={{ color: Colors.light.tint, marginLeft: 6 }}>Agregar Imágenes</ThemedText>
            </Pressable>
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setEditModal(false)}>
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.saveButton]} onPress={handleSaveEdit} disabled={saving}>
                <ThemedText style={styles.saveButtonText}>{saving ? 'Guardando...' : 'Guardar'}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de vista previa de imagen */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          {previewImage && (
            <Pressable style={styles.previewCloseArea} onPress={() => setPreviewImage(null)}>
              <Image source={{ uri: previewImage }} style={styles.previewImage} resizeMode="contain" />
            </Pressable>
          )}
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  backText: {
    color: Colors.light.tint,
    fontSize: 16,
    marginLeft: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 6,
  },
  editText: {
    color: Colors.light.tint,
    fontSize: 15,
    marginLeft: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  status: {
    fontWeight: 'bold',
    fontSize: 14,
    letterSpacing: 1,
  },
  amount: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  objective: {
    fontSize: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    marginBottom: 12,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 13,
    color: '#888',
  },
  gallerySection: {
    marginTop: 20,
  },
  galleryTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 8,
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryImage: {
    width: 160,
    height: 120,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#222',
    borderWidth: 1.5,
    borderColor: '#444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    fontSize: 15,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
  },
  cancelButton: {
    backgroundColor: '#eee',
  },
  saveButton: {
    backgroundColor: Colors.light.tint,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'transparent',
  },
  deleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 2,
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '90%',
    height: '80%',
    borderRadius: 16,
    backgroundColor: '#222',
  },
}); 