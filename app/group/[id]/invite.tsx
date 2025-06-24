import { generateInviteCode } from '@/app/services/groups.service';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <ThemedText style={styles.loadingText}>Generando código...</ThemedText>
        </View>
      ) : inviteCode ? (
        <>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Invitar Miembros</ThemedText>
            <ThemedText style={styles.subtitle}>Comparte este código para invitar a nuevos miembros a tu grupo</ThemedText>
          </View>
          
          <View style={styles.qrSection}>
            <ThemedText style={styles.sectionTitle}>Código QR</ThemedText>
            <View style={styles.qrContainer}>
              <QRCode value={inviteCode} size={250} />
            </View>
          </View>
          
          <View style={styles.codeSection}>
            <ThemedText style={styles.sectionTitle}>Código de Texto</ThemedText>
            <View style={styles.codeContainer}>
              <ThemedText style={styles.inviteCode}>{inviteCode}</ThemedText>
            </View>
          </View>
          
          <Pressable style={styles.shareButton} onPress={onShare}>
            <ThemedText style={styles.shareButtonText}>Compartir Código</ThemedText>
          </Pressable>
          
          <View style={styles.infoSection}>
            <ThemedText style={styles.infoText}>Cómo usar:</ThemedText>
            <ThemedText style={styles.infoItem}>• Muestra el QR para que lo escaneen</ThemedText>
            <ThemedText style={styles.infoItem}>• O comparte el código de texto</ThemedText>
            <ThemedText style={styles.infoItem}>• Los nuevos miembros se unirán automáticamente</ThemedText>
          </View>
        </>
      ) : (
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorText}>No se pudo generar un código de invitación.</ThemedText>
        </View>
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
    color: 'black',
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  qrSection: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  codeSection: {
    alignItems: 'center',
  },
  codeContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  infoSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  infoText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  infoItem: {
    fontSize: 16,
    marginBottom: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
  },
}); 