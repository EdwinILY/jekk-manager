import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { useColorScheme } from '../../hooks/useColorScheme';
import { supabase } from '../../supabase';

export default function AuthLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const router = useRouter();
  const colorScheme = useColorScheme();
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        router.replace('/');
      }
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        router.replace('/');
      }
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  if (session === undefined) return null;
  if (session) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {/* All auth screens use AuthLayout */}
      <Slot />
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
