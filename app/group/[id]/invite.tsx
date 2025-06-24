import { generateInviteCode } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export default function InviteScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCode = async () => {
      if (!groupId) return;
      try {
        const code = await generateInviteCode(parseInt(groupId, 10));
        setInviteCode(code);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      } finally {
        setLoading(false);
      }
    };
    getCode();
  }, [groupId]);

  const onShare = async () => {
    if (!inviteCode) return;
    try {
      await Share.share({
        message: `¡Únete a mi grupo en Jekk Manager! Usa este código: ${inviteCode}`,
      });
    } catch (error: any) {
      Alert.alert(error.message);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen options={{ title: 'Invitar a Miembros' }} />
      {loading ? (
        <ActivityIndicator size="large" />
      ) : inviteCode ? (
        <>
          <ThemedText type="subtitle">Comparte este código QR o el código de texto para invitar a nuevos miembros a tu grupo.</ThemedText>
          <View style={styles.qrContainer}>
            <QRCode value={inviteCode} size={250} />
          </View>
          <ThemedText style={styles.inviteCode}>{inviteCode}</ThemedText>
          <Pressable style={styles.shareButton} onPress={onShare}>
            <ThemedText style={styles.shareButtonText}>Compartir Código</ThemedText>
          </Pressable>
        </>
      ) : (
        <ThemedText>No se pudo generar un código de invitación.</ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 20,
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  inviteCode: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 4,
  },
  shareButton: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  }
}); 