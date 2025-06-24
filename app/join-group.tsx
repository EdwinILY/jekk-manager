import { joinGroupWithCode } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { IconSymbol } from '../components/ui/IconSymbol';

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async (code: string) => {
    if (!code) {
        Alert.alert('Error', 'Por favor, introduce un código de invitación.');
        return;
    }
    
    setLoading(true);
    try {
        // TODO: Replace with actual logged-in user ID
        const groupId = await joinGroupWithCode(1, code);
        Alert.alert('🎉 ¡Éxito!', 'Te has unido al grupo correctamente.', [
            { text: 'OK', onPress: () => router.replace(`/group/${groupId}`) }
        ]);
    } catch (error: any) {
        Alert.alert('Error al unirse', error.message);
    } finally {
        setLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Unirse a un Grupo' }} />
      
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>Unirse a un Grupo</ThemedText>
      </View>
      
      <View style={styles.formSection}>
        <ThemedText style={styles.label}>Código de Invitación</ThemedText>
        <TextInput 
          style={styles.input} 
          placeholder="Ej: ABC123"
          value={inviteCode}
          onChangeText={setInviteCode}
          autoCapitalize="characters"
          maxLength={6}
        />
        
        <Pressable 
          style={[styles.joinButton, loading && styles.joinButtonDisabled]} 
          onPress={() => handleJoin(inviteCode)}
          disabled={loading}
        >
          <ThemedText style={styles.joinButtonText}>
            {loading ? <><IconSymbol name="hourglass" size={18} color="white" style={{ marginRight: 6 }} />Uniéndose...</> : <>Unirse al Grupo</>}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 15 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.light.icon,
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    letterSpacing: 3
  },
  orText: {
    textAlign: 'center',
    marginVertical: 10,
    fontStyle: 'italic',
    color: Colors.light.icon,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.icon,
    textAlign: 'center'
  },
  formSection: {
    gap: 20
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  joinButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  joinButtonDisabled: {
    backgroundColor: '#ccc',
  },
  joinButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  infoSection: {
    marginTop: 20,
    gap: 10
  },
  infoText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  infoItem: {
    fontSize: 16,
    color: Colors.light.icon
  }
}); 