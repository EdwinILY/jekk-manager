import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { MaterialIcons } from '@expo/vector-icons'; // Importa el icono
import { useState } from 'react';
import { Image, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function PerfilScreen() {
  // Datos estáticos simulando un usuario autenticado
  const [user, setUser] = useState({
    display_name: 'Juan Pérez',
    email: 'juan.perez@email.com',
    photo_url: 'https://randomuser.me/api/portraits/men/1.jpg',
  });

  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState(user.display_name);

  // Color dinámico para el fondo del infoBox
  const infoBoxBg = useThemeColor(
    { light: '#f2f2f2', dark: '#232323' },
    'background'
  );

  const handleSave = () => {
    setUser({ ...user, display_name: newName });
    setEditing(false);
  };

  return (
    <ThemedView style={styles.container}>
      <Image source={{ uri: user.photo_url }} style={styles.avatar} />
      {editing ? (
        <View style={styles.editRow}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            autoFocus
          />
          <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
            <ThemedText style={styles.saveBtnText}>Guardar</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.editRow}>
          <ThemedText type="title" style={styles.name}>{user.display_name}</ThemedText>
          <TouchableOpacity onPress={() => setEditing(true)}>
            <MaterialIcons name="edit" size={22} style={styles.editIcon} />
          </TouchableOpacity>
        </View>
      )}
      <ThemedText type="default" style={styles.email}>{user.email}</ThemedText>
      <View style={[styles.infoBox, { backgroundColor: infoBoxBg }]}>
        <ThemedText>
          ¡Bienvenido a tu perfil! Aquí podrás ver y editar tu información personal.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  name: {
    marginRight: 8,
  },
  email: {
    marginBottom: 18,
    color: '#888',
  },
  infoBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    // backgroundColor se asigna dinámicamente
  },
  input: {
    borderWidth: 1,
    borderColor: '#aaa',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 120,
    backgroundColor: '#fff',
    color: '#222',
  },
  saveBtn: {
    marginLeft: 8,
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  editIcon: {
    color: '#007bff',
    marginLeft: 8,
  },
});
