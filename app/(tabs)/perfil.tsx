import { getUserById } from "@/app/services/user.service";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { UserInterface } from "../models/user.interfaz";
import { IconPickerModal } from "@/components/IconPickerModal";
import { updateProfileWithDefaultIcon } from "../services/storage.service";
import { updateUserDisplayName } from "../Interfaces/user.interface";

export default function PerfilScreen() {
  const [user, setUser] = useState<UserInterface | null>(null);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const infoBoxBg = useThemeColor(
    { light: "#f2f2f2", dark: "#232323" },
    "background"
  );

  // Obtener el usuario con ID 1 al cargar el componente
  useEffect(() => {
    const fetchUser = async () => {
      const data = await getUserById(1); // ID fijo por ahora
      if (data) {
        setUser(data);
        setNewName(data.display_name);
      }
    };

    fetchUser();
  }, []);

  const handleSave = () => {
    if (user) {
      setUser({ ...user, display_name: newName });
      setEditing(false);
      handleUpdateDisplayName();
    }
  };

  const handleIconSelected = (url: string) => {
    if (user) {
      setUser({ ...user, photo_url: url });
      handleSelectDefaultIcon(url);
    }
  };

  const handleUpdateDisplayName = async () => {
    const { success, error } = await updateUserDisplayName(user!.id, newName);

    if (success) {
      Alert.alert("Éxito", "Nombre actualizado correctamente");
    } else {
      Alert.alert("Error", error || "No se pudo actualizar el nombre");
    }
  };

  const handleSelectDefaultIcon = async (iconName: string) => {
    const success = await updateProfileWithDefaultIcon(user!.id, iconName);
    if (success) {
      Alert.alert("Éxito", "Ícono actualizado correctamente");
    } else {
      Alert.alert("Error", "No se pudo actualizar el ícono");
    }
  };

  if (!user) return <ThemedText>Cargando usuario...</ThemedText>;

  return (
    <ThemedView style={styles.container}>
      <TouchableOpacity onPress={() => setModalVisible(true)}>
        <Image source={{ uri: user.photo_url }} style={styles.avatar} />
      </TouchableOpacity>

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
          <ThemedText type="title" style={styles.name}>
            {user.display_name}
          </ThemedText>
          <TouchableOpacity onPress={() => setEditing(true)}>
            <MaterialIcons name="edit" size={22} style={styles.editIcon} />
          </TouchableOpacity>
        </View>
      )}

      <ThemedText type="default" style={styles.email}>
        {user.email}
      </ThemedText>

      <View style={[styles.infoBox, { backgroundColor: infoBoxBg }]}>
        <ThemedText>
          ¡Bienvenido a tu perfil! Aquí podrás ver y editar tu información
          personal.
        </ThemedText>
      </View>

      <IconPickerModal
        visible={modalVisible}
        userID={user.id}
        onClose={() => setModalVisible(false)}
        onSelect={handleIconSelected}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "transparent",
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "#ccc",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  name: {
    marginRight: 8,
  },
  email: {
    marginBottom: 18,
    color: "#888",
  },
  infoBox: {
    marginTop: 16,
    padding: 16,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 120,
    backgroundColor: "#fff",
    color: "#222",
  },
  saveBtn: {
    marginLeft: 8,
    backgroundColor: "#4caf50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },
  editIcon: {
    color: "#007bff",
    marginLeft: 8,
  },
});
