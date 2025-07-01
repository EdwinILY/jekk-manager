import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { supabase } from '../../supabase';

export default function ResetPasswordScreen() {
    const [loading, setLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>('');
    const router = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        const handleUrl = (url: string) => {
            console.log('Reset password received URL:', url);
            //setDebugInfo(`URL recibida: ${url}`);
            setDebugInfo(`Ingrese la nueva contraseña`);
            if (!url) {
                setError('Enlace inválido');
                setLoading(false);
                return;
            }
            
            // Parse URL for tokens - they can come as query parameters or fragments
            let urlParams: Record<string, string> = {};
            
            try {
                // First try to get from query parameters
                const urlObj = new URL(url);
                urlObj.searchParams.forEach((value, key) => {
                    urlParams[key] = value;
                });
                
                // If no tokens found in query params, try fragment
                if (!urlParams['access_token'] && url.includes('#')) {
                    const [, fragment] = url.split('#');
                    if (fragment) {
                        fragment.split('&').forEach(pair => {
                            const [key, value] = pair.split('=');
                            if (key && value) urlParams[key] = decodeURIComponent(value);
                        });
                    }
                }
                
                // Also check route params
                const access_token = urlParams['access_token'] || params.access_token as string;
                const refresh_token = urlParams['refresh_token'] || params.refresh_token as string;
                
                console.log('Parsed params:', { access_token: access_token ? 'found' : 'not found', refresh_token: refresh_token ? 'found' : 'not found' });
                
                if (access_token && refresh_token) {
                    supabase.auth.setSession({ access_token, refresh_token }).then(({ error: sessionError }) => {
                        if (sessionError) {
                            setError(sessionError.message);
                        }
                        setLoading(false);
                    });
                } else {
                    // If no tokens in URL, check if we already have a session (user might have clicked link while logged in)
                    supabase.auth.getSession().then(({ data: { session } }) => {
                        if (session) {
                            setLoading(false);
                        } else {
                            setError('Tokens inválidos en la URL');
                            setLoading(false);
                        }
                    });
                }
            } catch (err) {
                console.error('Error parsing URL:', err);
                setError('Error al procesar la URL');
                setLoading(false);
            }
        };

        // Handle initial URL when app is opened from link
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleUrl(url);
            } else if (params.access_token && params.refresh_token) {
                // Handle case where tokens come directly from route params
                console.log('Using route params for tokens');
                setDebugInfo('Usando parámetros de ruta');
                supabase.auth.setSession({ 
                    access_token: params.access_token as string, 
                    refresh_token: params.refresh_token as string 
                }).then(({ error: sessionError }) => {
                    if (sessionError) {
                        setError(sessionError.message);
                    }
                    setLoading(false);
                });
            } else {
                // Check if we already have a session
                supabase.auth.getSession().then(({ data: { session } }) => {
                    if (session) {
                        setLoading(false);
                    } else {
                        setError('No se encontró enlace de recuperación');
                        setLoading(false);
                    }
                });
            }
        });

        // Handle URL when app is already open
        const subscription = Linking.addEventListener('url', ({ url }) => {
            handleUrl(url);
        });

        return () => subscription?.remove();
    }, [params.access_token, params.refresh_token]);

    const handleSubmit = async () => {
        setError(null);
        setInfo(null);
        if (newPassword.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }
        setLoading(true);
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        setLoading(false);

        if (updateError) {
            setError(updateError.message);
        } else {
            setInfo('Contraseña restablecida correctamente. Redirigiendo...');
            setTimeout(() => router.replace('/login'), 2000);
        }
    };

    if (loading) return <ThemedView style={styles.container}><ActivityIndicator size="large" /></ThemedView>;

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>Restablecer contraseña</ThemedText>
            <View style={styles.form}>
                <TextInput
                    placeholder="Nueva contraseña"
                    placeholderTextColor="#888"
                    secureTextEntry
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                />
                <TextInput
                    placeholder="Confirmar contraseña"
                    placeholderTextColor="#888"
                    secureTextEntry
                    style={[styles.input, { marginTop: 10 }]}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                />
                {error && <ThemedText style={styles.error}>{error}</ThemedText>}
                {info && <ThemedText style={styles.info}>{info}</ThemedText>}
                {debugInfo && <ThemedText style={styles.debug}>{debugInfo}</ThemedText>}
                <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.buttonText}>Enviar</ThemedText>
                    )}
                </TouchableOpacity>
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
        fontSize: 24,
        marginBottom: 20,
    },
    form: {
        width: '100%',
    },
    input: {
        width: '100%',
        height: 45,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 10,
        color: '#363636',
    },
    button: {
        marginTop: 20,
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    error: {
        color: 'red',
        marginTop: 10,
    },
    info: {
        color: 'green',
        marginTop: 10,
    },
    debug: {
        color: '#666',
        fontSize: 12,
        marginTop: 10,
    },
});
