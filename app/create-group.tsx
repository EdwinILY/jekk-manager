import { createGroup } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

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
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>👥 Nuevo Grupo</ThemedText>
          <ThemedText style={styles.subtitle}>Crea un nuevo grupo para gestionar presupuestos colaborativos</ThemedText>
        </View>
        
        <View style={styles.formSection}>
          <ThemedText style={styles.label}>📝 Nombre del Grupo *</ThemedText>
          <TextInput 
            style={styles.input} 
            value={name} 
            onChangeText={setName} 
            placeholder="Ej: Viaje a la playa" 
            placeholderTextColor="#999"
          />

          <ThemedText style={styles.label}>📄 Descripción (Opcional)</ThemedText>
          <TextInput 
            style={[styles.input, styles.textArea]} 
            value={description} 
            onChangeText={setDescription} 
            multiline 
            numberOfLines={4} 
            placeholder="Describe el propósito del grupo..." 
            placeholderTextColor="#999"
          />
        </View>
        
        <Pressable 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleCreateGroup} 
          disabled={loading}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="white" size="small" />
              <ThemedText style={styles.submitButtonText}>Creando...</ThemedText>
            </View>
          ) : (
            <ThemedText style={styles.submitButtonText}>🚀 Crear Grupo</ThemedText>
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
    scrollView: {
      padding: 20,
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
    textArea: {
      height: 100,
    },
}); 