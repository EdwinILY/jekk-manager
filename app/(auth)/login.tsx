import * as Linking from 'expo-linking';
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
  const [info, setInfo] = useState<string | null>(null);
  const tintColor = useThemeColor({}, 'tint');
  const router = useRouter();
  const bg = useThemeColor({}, 'background');
  const inputBg = useThemeColor({}, 'card');
  const inputBorder = useThemeColor({}, 'icon');
  const textColor = useThemeColor({}, 'text');

  const handleLogin = async () => {
    setInfo(null);
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

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError('Por favor ingresa tu correo');
      return;
    }
    setLoading(true);
    // Generate deep link to the reset-password route (group folders are omitted)
    // Use non-leading slash for correct deep link without hash
    const redirectUrl = Linking.createURL('reset-password');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl });
    if (resetError) {
      setError(resetError.message);
    } else {
      setInfo('Revisa tu correo para restablecer tu contraseña');
    }
    setLoading(false);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: bg }]}>
      {/* TODO: icon principal */}
      <ThemedText type="title" style={styles.title}>Ingresar</ThemedText>
      <View style={styles.form}>
        <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          {/* TODO: icon correo */}
          <TextInput
            placeholder="Correo"
            placeholderTextColor={textColor + '99'}
            style={[styles.input, { color: textColor }]}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>
        <View style={[styles.inputContainer, { backgroundColor: inputBg, borderColor: inputBorder }]}>
          {/* TODO: icon contraseña */}
          <TextInput
            placeholder="Contraseña"
            placeholderTextColor={textColor + '99'}
            style={[styles.input, { color: textColor }]}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>
        {error && <ThemedText style={[styles.error, { color: '#e74c3c', fontWeight: 'bold' }]}>{error}</ThemedText>}
        {info && <ThemedText style={[styles.info, { color: '#27ae60', fontWeight: 'bold' }]}>{info}</ThemedText>}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: tintColor }]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText style={{ color: '#000', fontWeight: 'bold', fontSize: 16 }}>Ingresar →</ThemedText>
          )}
        </TouchableOpacity>
        <View style={styles.authLinks}>
          <TouchableOpacity style={styles.forgotPassword} onPress={handleForgotPassword}>
            <ThemedText style={[styles.link, { color: tintColor }]}>¿Olvidaste tu contraseña?</ThemedText>
          </TouchableOpacity>
          <Link href="/register" asChild>
            <TouchableOpacity style={styles.registerContainer}>
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
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    padding: 12,
  },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    paddingHorizontal: 8,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
    marginTop: 8,
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
  info: {
    color: 'green',
    marginBottom: 10,
  },
  authLinks: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: 10,
  },
  forgotPassword: {
    marginBottom: 2,
  },
  registerContainer: {
    marginTop: 2,
  },
});
