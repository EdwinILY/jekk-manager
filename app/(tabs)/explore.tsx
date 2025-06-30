import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

import { Collapsible } from '../../components/Collapsible';
import ParallaxScrollView from '../../components/ParallaxScrollView';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { IconSymbol } from '../../components/ui/IconSymbol';
import { Colors } from '../../constants/Colors';
import { useColorScheme } from '../../hooks/useColorScheme';
import { supabase } from '../../supabase';

export default function TabTwoScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <Image
          source={require('../../assets/images/banner.png')}
          style={styles.headerImage}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Configuraciones</ThemedText>
      </ThemedView>

      <ThemedText style={styles.subtitle}>
        Aquí puedes configurar las opciones de la aplicación.
      </ThemedText>

      <Collapsible title="Preferencias Generales">
        <ThemedText>Contenido de preferencias.</ThemedText>
      </Collapsible>

      <Collapsible title="Notificaciones">
        <ThemedText>Contenido de notificaciones.</ThemedText>
      </Collapsible>

      {/* Botón de cerrar sesión al final */}
      <TouchableOpacity
        onPress={handleLogout}
        style={styles.logoutButton}
      >
        <IconSymbol name="power" size={24} color="#fff" />
        <ThemedText style={styles.logoutText}>Cerrar sesión</ThemedText>
      </TouchableOpacity>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    flex: 1,
    width: '100%',
    height: 200,
    resizeMode: 'cover',
    alignSelf: 'stretch',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
});
