import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import { useThemeColor } from '../../hooks/useThemeColor';
import { supabase } from '../../supabase';

export default function RegisterScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const tintColor = useThemeColor({}, 'tint');
    const router = useRouter();

    const handleRegister = async () => {
        // Validate inputs
        if (!email || !password || !confirmPassword || !displayName) {
            setError('Por favor, completa todos los campos');
            return;
        }

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Register the user with Supabase Auth
            const { error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        display_name: displayName,
                    }
                }
            });

            if (signUpError) throw signUpError;

            // The trigger will automatically create a record in the users table
            // as defined in trigger.txt

            // Redirect to main screen or show confirmation message
            router.replace('/');
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error durante el registro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>Crear Cuenta</ThemedText>
            <View style={styles.form}>
                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Nombre"
                        placeholderTextColor={useThemeColor({}, 'text')}
                        style={styles.input}
                        value={displayName}
                        onChangeText={setDisplayName}
                    />
                </View>

                <View style={styles.inputContainer}>
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
                    <TextInput
                        placeholder="Contraseña"
                        placeholderTextColor={useThemeColor({}, 'text')}
                        style={styles.input}
                        secureTextEntry
                        value={password}
                        onChangeText={setPassword}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        placeholder="Confirmar Contraseña"
                        placeholderTextColor={useThemeColor({}, 'text')}
                        style={styles.input}
                        secureTextEntry
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                    />
                </View>

                {error && <ThemedText style={styles.error}>{error}</ThemedText>}

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: tintColor }]}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.buttonText}>Registrarse →</ThemedText>
                    )}
                </TouchableOpacity>
                <Link href="/login" asChild>
                    <TouchableOpacity>
                        <ThemedText style={[styles.link, { color: tintColor }]}>¿Ya tienes una cuenta? Iniciar sesión</ThemedText>
                    </TouchableOpacity>
                </Link>
            </View>
        </ThemedView >
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
});
