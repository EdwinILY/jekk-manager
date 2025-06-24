import { joinGroupWithCode } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Button, StyleSheet, TextInput } from 'react-native';

export default function JoinGroupScreen() {
  const [inviteCode, setInviteCode] = useState('');
  const router = useRouter();

  const handleJoin = async (code: string) => {
    if (!code) {
        Alert.alert('Error', 'Por favor, introduce un código de invitación.');
        return;
    }
    try {
        // TODO: Replace with actual logged-in user ID
        const groupId = await joinGroupWithCode(1, code);
        Alert.alert('Éxito', 'Te has unido al grupo.', [
            { text: 'OK', onPress: () => router.replace(`/group/${groupId}`) }
        ]);
    } catch (error: any) {
        Alert.alert('Error al unirse', error.message);
    }
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Unirse a un Grupo' }} />
      <ThemedText type='title'>Introduce el código</ThemedText>
      <TextInput 
        style={styles.input} 
        placeholder="ABCDEF"
        value={inviteCode}
        onChangeText={setInviteCode}
        autoCapitalize="characters"
      />
      <Button title="Unirse con Código" onPress={() => handleJoin(inviteCode)} color={Colors.light.tint} />
      <ThemedText style={styles.orText}>Escaneo de QR temporalmente deshabilitado</ThemedText>
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
  }
}); 