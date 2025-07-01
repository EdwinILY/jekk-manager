import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useThemeColor } from "@/hooks/useThemeColor";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, View } from "react-native";
import { supabase } from "../supabase";
import { getDashboardContributions, getTotalPendingContribution, type DashboardContribution } from "./services/dashboard.service";
import { ObtenerIdAuthSupabase } from "./services/supa.service";

export default function ContributionsScreen() {
  const [contributions, setContributions] = useState<DashboardContribution[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  // Colores del tema
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({ light: "#ffffff", dark: "#1c1c1e" }, "background");
  const borderColor = useThemeColor({ light: "#e0e0e0", dark: "#38383a" }, "background");
  const textColor = useThemeColor({}, "text");
  const secondaryTextColor = useThemeColor({ light: "#666", dark: "#8e8e93" }, "text");

  // Obtener el ID del usuario de la base de datos
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userUID = await ObtenerIdAuthSupabase();
        if (!userUID) return;

        const { data, error } = await supabase.from("users").select("id").eq("uid", userUID).single();

        if (!error && data) {
          setCurrentUserId(data.id);
        }
      } catch (error) {
        console.error("Error fetching user ID:", error);
      }
    };

    fetchUserId();
  }, []);

  const loadContributions = useCallback(async () => {
    if (!currentUserId) return;

    try {
      setLoading(true);
      const [contributionsData, totalData] = await Promise.all([getDashboardContributions(currentUserId), getTotalPendingContribution(currentUserId)]);

      setContributions(contributionsData);
      setTotalAmount(totalData);
    } catch (error) {
      console.error("Error loading contributions:", error);
      Alert.alert("Error", "No se pudieron cargar las contribuciones");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId) {
      loadContributions();
    }
  }, [currentUserId, loadContributions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContributions();
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "#FF6B6B";
      case "medium":
        return "#4ECDC4";
      case "low":
        return "#95a5a6";
      default:
        return "#95a5a6";
    }
  };

  const getPriorityText = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "Alta";
      case "medium":
        return "Media";
      case "low":
        return "Baja";
      default:
        return "Media";
    }
  };

  const renderContributionItem = ({ item }: { item: DashboardContribution }) => (
    <ThemedView style={[styles.contributionCard, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <ThemedText style={[styles.budgetTitle, { color: textColor }]} numberOfLines={2}>
            {item.budget_title}
          </ThemedText>
          <ThemedText style={[styles.groupName, { color: secondaryTextColor }]}>{item.group_name}</ThemedText>
        </View>
        <View style={styles.amountContainer}>
          <ThemedText style={[styles.amount, { color: Colors.light.tint }]}>${item.contribution_amount.toFixed(2)}</ThemedText>
        </View>
      </View>

      <View style={styles.cardMeta}>
        <View style={[styles.statusBadge, { backgroundColor: getPriorityColor(item.priority) + "20" }]}>
          <ThemedText style={[styles.statusText, { color: getPriorityColor(item.priority) }]}>{item.budget_status === "approved" ? "✅ Aprobado" : "⏳ En Votación"}</ThemedText>
        </View>

        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
          <ThemedText style={styles.priorityText}>{getPriorityText(item.priority)} Prioridad</ThemedText>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <ThemedText style={[styles.voteDate, { color: secondaryTextColor }]}>Votado el: {new Date(item.voted_at).toLocaleDateString()}</ThemedText>
      </View>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerLeft} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={Colors.light.tint} />
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>
            Mis Contribuciones
          </ThemedText>
        </Pressable>
      </View>

      {/* Total summary */}
      <View style={[styles.summaryCard, { backgroundColor: cardBackground, borderColor }]}>
        <View style={styles.summaryContent}>
          <View style={styles.totalContainer}>
            <IconSymbol name="dollarsign.circle.fill" size={32} color={Colors.light.tint} />
            <View style={styles.totalInfo}>
              <ThemedText style={[styles.totalLabel, { color: secondaryTextColor }]}>Total Pendiente</ThemedText>
              <ThemedText style={[styles.totalAmount, { color: Colors.light.tint }]}>${totalAmount.toFixed(2)}</ThemedText>
            </View>
          </View>
          <View style={styles.countContainer}>
            <ThemedText style={[styles.countText, { color: textColor }]}>
              {contributions.length} {contributions.length === 1 ? "Contribución" : "Contribuciones"}
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Lista de contribuciones */}
      {contributions.length > 0 ? (
        <FlatList
          data={contributions}
          keyExtractor={(item) => `${item.budget_id}-${item.group_id}`}
          renderItem={renderContributionItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <IconSymbol name="banknote" size={64} color={secondaryTextColor} />
          <ThemedText style={[styles.emptyTitle, { color: textColor }]}>No hay contribuciones pendientes</ThemedText>
          <ThemedText style={[styles.emptySubtitle, { color: secondaryTextColor }]}>Cuando votes positivamente en presupuestos con contribución, aparecerán aquí</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 50,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  summaryCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  totalInfo: {
    flex: 1,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: "bold",
  },
  countContainer: {
    alignItems: "flex-end",
  },
  countText: {
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contributionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 14,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  amount: {
    fontSize: 20,
    fontWeight: "bold",
  },
  cardMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  voteDate: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});
