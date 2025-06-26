import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  useEffect(() => {
    // Al iniciar la app, intenta restaurar la sesión desde AsyncStorage
    (async () => {
      const saved = await AsyncStorage.getItem('supabase.session');
      if (saved) {
        const parsed = JSON.parse(saved);
        setSession(parsed);
        // Restaura la sesión en Supabase
        await supabase.auth.setSession(parsed);
      } else {
        // Si no hay sesión guardada, consulta Supabase por si acaso
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      }
      setSessionLoaded(true);
    })();
    // Suscribirse a cambios de sesión y guardar/limpiar en AsyncStorage
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await AsyncStorage.setItem('supabase.session', JSON.stringify(session));
      } else {
        await AsyncStorage.removeItem('supabase.session');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  if (!loaded || session === undefined || !sessionLoaded) {
    // Esperar a que carguen las fuentes y la sesión
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
