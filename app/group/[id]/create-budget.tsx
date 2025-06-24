import { addBudgetAttachment, createBudget, uploadAttachment } from '@/app/services/groups.service';
import { ObtenerIdAuthSupabase } from "@/app/services/supa.service";
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { supabase } from "@/supabase";
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function CreateBudgetScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [objective, setObjective] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImages(result.assets.map(asset => asset.uri));
    }
  };

  const handleCreateBudget = async () => {
    if (!title || !objective || !amount) {
      Alert.alert('Campos incompletos', 'Por favor, completa el título, objetivo y monto.');
      return;
    }

    setLoading(true);
    try {
      // Obtener el UID del usuario autenticado
      const uid = await ObtenerIdAuthSupabase();
      if (!uid) throw new Error('No se pudo obtener el usuario autenticado.');
      // Buscar el usuario por UID en la tabla users
      const { data, error } = await supabase.from('users').select('id').eq('uid', uid).single();
      if (error || !data) throw new Error('No se encontró el usuario en la base de datos.');
      // Usar el id real en created_by
      const budgetData = {
        group_id: parseInt(groupId, 10),
        title,
        description,
        objective,
        amount: parseFloat(amount),
        created_by: data.id,
      };
      const newBudgetId = await createBudget(budgetData);

      // Upload attachments if any
      if (images.length > 0) {
        for (const imageUri of images) {
          const publicUrl = await uploadAttachment(imageUri);
          await addBudgetAttachment(newBudgetId, publicUrl);
        }
      }

      Alert.alert('Éxito', 'La propuesta de presupuesto ha sido creada.');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo crear el presupuesto: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Crear Presupuesto' }} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>Nueva Propuesta</ThemedText>
        </View>
        
        <View style={styles.formSection}>
          <ThemedText style={styles.label}>Título *</ThemedText>
          <TextInput 
            style={styles.input} 
            value={title} 
            onChangeText={setTitle} 
            placeholder="Ej: Compra de insumos para evento" 
            placeholderTextColor="#999"
          />

          <ThemedText style={styles.label}>Objetivo del Gasto *</ThemedText>
          <TextInput 
            style={styles.input} 
            value={objective} 
            onChangeText={setObjective} 
            placeholder="Ej: Reponer el stock de materiales" 
            placeholderTextColor="#999"
          />

          <ThemedText style={styles.label}>Monto Total (USD) *</ThemedText>
          <TextInput 
            style={styles.input} 
            value={amount} 
            onChangeText={setAmount} 
            placeholder="150.00" 
            keyboardType="numeric" 
            placeholderTextColor="#999"
          />

          <ThemedText style={styles.label}>Descripción (Opcional)</ThemedText>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={description} 
            onChangeText={setDescription} 
            multiline 
            numberOfLines={4} 
            placeholder="Detalles adicionales, cotizaciones, etc." 
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.attachmentsSection}>
          <ThemedText style={styles.label}>Adjuntos</ThemedText>
          <Pressable style={styles.imagePicker} onPress={pickImage}>
            <Text style={styles.imagePickerText}>Seleccionar Imágenes</Text>
          </Pressable>

          {images.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              <ThemedText style={styles.previewTitle}>Vista previa ({images.length} imagen{images.length > 1 ? 'es' : ''})</ThemedText>
              <ScrollView horizontal style={styles.imageScroll} showsHorizontalScrollIndicator={false}>
                {images.map((uri, index) => (
                  <View key={index} style={styles.imageWrapper}>
                    <Image source={{ uri }} style={styles.previewImage} />
                    <Pressable 
                      style={styles.removeImageButton}
                      onPress={() => setImages(images.filter((_, i) => i !== index))}
                    >
                      <Text style={styles.removeImageText}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        <Pressable 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleCreateBudget} 
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <ThemedText style={styles.submitButtonText}>Creando...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.submitButtonText}>Crear Propuesta</ThemedText>
          )}
        </Pressable>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 20, 
    },
    scrollView: {
      flex: 1,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
    },
    formSection: {
      marginBottom: 20,
    },
    label: { 
      marginTop: 15, 
      marginBottom: 5,
      fontSize: 16,
      fontWeight: '500',
    },
    input: {
      backgroundColor: '#fff',
      borderWidth: 1,
      borderColor: Colors.light.icon,
      borderRadius: 8,
      padding: 15,
      fontSize: 16,
      marginBottom: 10,
    },
    textArea: {
      height: 100,
    },
    attachmentsSection: {
      marginBottom: 20,
    },
    imagePicker: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 10,
    },
    imagePickerText: {
        fontSize: 16,
    },
    imagePreviewContainer: {
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    imageScroll: {
        flexDirection: 'row',
    },
    imageWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
    },
    removeImageButton: {
        padding: 5,
        borderRadius: 15,
        backgroundColor: '#ff3b30',
        marginLeft: 5,
    },
    removeImageText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
    },
    submitButton: {
        backgroundColor: Colors.light.tint,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginLeft: 10,
    },
}); 