import { createGroup } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, TextInput } from 'react-native';

export default function CreateGroupScreen() {
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = async () => {
    if (!name.trim()) {
      Alert.alert('Campo requerido', 'Por favor, ingresa un nombre para el grupo.');
      return;
    }

    setLoading(true);
    try {
      const groupData = {
        name: name.trim(),
        description: description.trim(),
        created_by: 1, // TODO: Reemplazar con el ID del usuario autenticado
      };
      const newGroupId = await createGroup(groupData);
      Alert.alert('Éxito', 'El grupo ha sido creado correctamente.', [
        { text: 'OK', onPress: () => router.replace(`/group/${newGroupId}`) }
      ]);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo crear el grupo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Crear Grupo' }} />
      <ScrollView>
        <ThemedText type="title">Nuevo Grupo</ThemedText>
        
        <ThemedText style={styles.label}>Nombre del Grupo *</ThemedText>
        <TextInput 
          style={styles.input} 
          value={name} 
          onChangeText={setName} 
          placeholder="Ej: Viaje a la playa" 
        />

        <ThemedText style={styles.label}>Descripción (Opcional)</ThemedText>
        <TextInput 
          style={styles.input} 
          value={description} 
          onChangeText={setDescription} 
          multiline 
          numberOfLines={4} 
          placeholder="Describe el propósito del grupo..." 
        />
        
        <Button 
          title={loading ? 'Creando...' : 'Crear Grupo'} 
          onPress={handleCreateGroup} 
          disabled={loading} 
          color={Colors.light.tint} 
        />
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
}); 