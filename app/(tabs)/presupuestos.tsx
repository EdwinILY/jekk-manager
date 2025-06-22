  import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function PresupuestosScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Presupuestos</ThemedText>
      <ThemedText style={styles.description}>
        Esta es la página de presupuestos donde podrás gestionar tus finanzas.
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  description: {
    marginTop: 20,
    textAlign: 'center',
  },
});
