import { addBudgetAttachment, createBudget, uploadAttachment } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, Image, Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';

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
      const budgetData = {
        group_id: parseInt(groupId, 10),
        title,
        description,
        objective,
        amount: parseFloat(amount),
        created_by: 1, // TODO: Reemplazar con el ID del usuario autenticado
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
      <ScrollView>
        <ThemedText type="title">Nueva Propuesta</ThemedText>
        
        <ThemedText style={styles.label}>Título</ThemedText>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Ej: Compra de insumos para evento" />

        <ThemedText style={styles.label}>Objetivo del Gasto</ThemedText>
        <TextInput style={styles.input} value={objective} onChangeText={setObjective} placeholder="Ej: Reponer el stock de materiales" />

        <ThemedText style={styles.label}>Monto Total (USD)</ThemedText>
        <TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="150.00" keyboardType="numeric" />

        <ThemedText style={styles.label}>Descripción (Opcional)</ThemedText>
        <TextInput style={styles.input} value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholder="Detalles adicionales, cotizaciones, etc." />

        <ThemedText style={styles.label}>Adjuntos</ThemedText>
        <Pressable style={styles.imagePicker} onPress={pickImage}>
            <Text style={styles.imagePickerText}>Seleccionar Imágenes</Text>
        </Pressable>

        <ScrollView horizontal style={styles.imagePreviewContainer}>
            {images.map((uri, index) => (
                <Image key={index} source={{ uri }} style={styles.previewImage} />
            ))}
        </ScrollView>

        <Button title={loading ? 'Creando...' : 'Crear Propuesta'} onPress={handleCreateBudget} disabled={loading} color={Colors.light.tint} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
    container: { 
      flex: 1, 
      padding: 20, 
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
        flexDirection: 'row',
        marginBottom: 20,
    },
    previewImage: {
        width: 100,
        height: 100,
        borderRadius: 8,
        marginRight: 10,
    }
}); 