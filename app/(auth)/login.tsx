import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { supabase } from '../../supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tintColor = useThemeColor({}, 'tint');
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
    } else {
      // Redirect to main tabs
      router.replace('/');
    }
    setLoading(false);
  };

  return (
    <ThemedView style={styles.container}>
      {/* TODO: icon principal */}
      <ThemedText type="title" style={styles.title}>Ingresar</ThemedText>
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          {/* TODO: icon correo */}
          <TextInput
            placeholder="Correo"
            placeholderTextColor={useThemeColor({}, 'text')}
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={styles.inputContainer}>
          {/* TODO: icon contraseña */}
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={useThemeColor({}, 'text')}
            style={styles.input}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        {error && <ThemedText style={styles.error}>{error}</ThemedText>}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={styles.buttonText}>Ingresar →</ThemedText>
          )}
        </TouchableOpacity>
        <View style={styles.authLinks}>
          <TouchableOpacity onPress={() => {/* TODO: forgot password */}}>
            <ThemedText style={[styles.link, { color: tintColor }]}>¿Olvidaste tu contraseña?</ThemedText>
          </TouchableOpacity>
          <Link href="/register" asChild>
            <TouchableOpacity>
              <ThemedText style={[styles.link]}>¿No tienes cuenta? <ThemedText style={[styles.link, { color: tintColor }]}>Registrarse</ThemedText></ThemedText>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 20,

  },
  form: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    padding: 10,
  },
  input: {
    flex: 1,
    height: 40,
    color: '#363636',
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  link: {
    textAlign: 'center',
    marginBottom: 10,
  },
  error: {
    color: 'red',
    marginBottom: 10,
  },
  authLinks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
