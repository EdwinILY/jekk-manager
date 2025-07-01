import { UserContribution } from "../../models/budget.interface";
import { getUserPendingContributions } from "./groups.service";

export interface DashboardContribution extends UserContribution {
  daysRemaining?: number;
  priority: "high" | "medium" | "low";
}

export const getDashboardContributions = async (userId: number): Promise<DashboardContribution[]> => {
  try {
    const contributions = await getUserPendingContributions(userId);

    // Filtrar solo contribuciones para presupuestos pendientes o aprobados
    const activeContributions = contributions.filter((contribution) => contribution.budget_status === "pending" || contribution.budget_status === "approved");

    // Enriquecer datos con información adicional
    const enrichedContributions: DashboardContribution[] = activeContributions.map((contribution) => {
      // Calcular prioridad basada en el estado del presupuesto
      let priority: "high" | "medium" | "low" = "medium";

      if (contribution.budget_status === "approved") {
        priority = "high"; // Alta prioridad para presupuestos aprobados
      } else if (contribution.budget_status === "pending") {
        priority = "medium"; // Media prioridad para presupuestos en votación
      }

      return {
        ...contribution,
        priority,
      };
    });

    // Ordenar por prioridad y fecha
    return enrichedContributions.sort((a, b) => {
      // Primero por prioridad
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }

      // Luego por fecha de votación (más reciente primero)
      return new Date(b.voted_at).getTime() - new Date(a.voted_at).getTime();
    });
  } catch (error) {
    console.error("Error getting dashboard contributions:", error);
    throw error;
  }
};

export const getTotalPendingContribution = async (userId: number): Promise<number> => {
  try {
    const contributions = await getDashboardContributions(userId);
    return contributions.reduce((total, contribution) => total + contribution.contribution_amount, 0);
  } catch (error) {
    console.error("Error calculating total pending contribution:", error);
    return 0;
  }
};

export const getContributionsByGroup = async (userId: number): Promise<Map<string, DashboardContribution[]>> => {
  try {
    const contributions = await getDashboardContributions(userId);
    const groupedContributions = new Map<string, DashboardContribution[]>();

    contributions.forEach((contribution) => {
      const groupName = contribution.group_name;
      if (!groupedContributions.has(groupName)) {
        groupedContributions.set(groupName, []);
      }
      groupedContributions.get(groupName)!.push(contribution);
    });

    return groupedContributions;
  } catch (error) {
    console.error("Error grouping contributions by group:", error);
    return new Map();
  }
};
