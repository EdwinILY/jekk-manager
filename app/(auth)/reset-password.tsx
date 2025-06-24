import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
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
    const router = useRouter();

    useEffect(() => {
        // Exchange the deep link URL for a session
        (async () => {
            const url = await Linking.getInitialURL();
            if (!url) {
                setError('Enlace inválido');
                setLoading(false);
                return;
            }
            const { error: sessionError } = await supabase.auth.exchangeCodeForSession(url);
            if (sessionError) {
                setError(sessionError.message);
            }
            setLoading(false);
        })();
    }, []);

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
});
