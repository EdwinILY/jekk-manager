// services/pdfService.ts
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Alert } from "react-native";
import type { ActivityItem, DashboardStats, ExpenseCategory } from "./dashboardService";

interface ContributionData {
  budget_id: number;
  budget_title: string;
  group_id: number;
  group_name: string;
  contribution_amount: number;
  budget_status: string;
  voted_at: string;
  priority: "high" | "medium" | "low";
}

interface ContributionsSummary {
  high: number;
  medium: number;
  low: number;
  totalAmount: number;
}

interface PDFData {
  dashboardStats: DashboardStats;
  expensesByCategory: ExpenseCategory[];
  recentActivity: ActivityItem[];
  selectedGroup: string;
  selectedPeriod: string;
  groupName: string;
  // Nuevos campos
  pendingContributions?: ContributionData[];
  totalPendingAmount?: number;
  generatedBy?: string;
  generatedAt?: string;
  contributionsSummary?: ContributionsSummary;
  totalGroups?: number;
  userGroups?: number;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString()}`;
};

const formatPeriod = (period: string): string => {
  const periods: { [key: string]: string } = {
    week: "Esta semana",
    month: "Este mes",
    quarter: "Trimestre",
    year: "Este año",
  };
  return periods[period] || period;
};

const generateHTMLContent = (data: PDFData): string => {
  const { dashboardStats, expensesByCategory, recentActivity, selectedPeriod, groupName, pendingContributions = [], totalPendingAmount = 0, generatedAt, contributionsSummary } = data;

  const currentDate =
    generatedAt ||
    new Date().toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const expensesCategoriesHTML = expensesByCategory
    .map(
      (category) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(category.amount)}</td>
    </tr>
  `
    )
    .join("");

  const recentActivityHTML = recentActivity
    .slice(0, 10)
    .map(
      (activity) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${activity.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${activity.group}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${activity.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: ${activity.type === "expense" ? "#FF6B6B" : "#4ECDC4"};">
        ${activity.type === "expense" ? "-" : "+"}${formatCurrency(activity.amount)}
      </td>
    </tr>
  `
    )
    .join("");

  // Generar HTML para contribuciones pendientes
  const contributionsHTML = pendingContributions
    .map(
      (contribution) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contribution.budget_title}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${contribution.group_name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        <span style="background: ${contribution.priority === "high" ? "#FF6B6B" : contribution.priority === "medium" ? "#4ECDC4" : "#95a5a6"}; 
                     color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
          ${contribution.priority === "high" ? "Alta" : contribution.priority === "medium" ? "Media" : "Baja"}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">
        <span style="background: ${contribution.budget_status === "approved" ? "#27ae60" : "#f39c12"}; 
                     color: white; padding: 2px 8px; border-radius: 4px; font-size: 12px;">
          ${contribution.budget_status === "approved" ? "Aprobado" : "En Votación"}
        </span>
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; font-weight: bold;">
        ${formatCurrency(contribution.contribution_amount)}
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Reporte de Presupuestos</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #343a40;
                line-height: 1.6;
            }
            .header {
                text-align: center;
                margin-bottom: 30px;
                border-bottom: 2px solid #5196f4;
                padding-bottom: 20px;
            }
            .header h1 {
                color: #5196f4;
                margin: 0;
            }
            .header p {
                color: #6c757d;
                margin: 5px 0;
            }
            .section {
                margin-bottom: 30px;
            }
            .section h2 {
                color: #343a40;
                border-bottom: 1px solid #e9ecef;
                padding-bottom: 10px;
            }
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #5196f4;
            }
            .stat-card.expense {
                border-left-color: #FF6B6B;
            }
            .stat-card.budget {
                border-left-color: #4ECDC4;
            }
            .stat-card.difference {
                border-left-color: #96CEB4;
            }
            .stat-card.groups {
                border-left-color: #45B7D1;
            }
            .stat-card.contributions {
                border-left-color: #9b59b6;
            }
            .stat-title {
                font-size: 14px;
                color: #6c757d;
                margin-bottom: 8px;
            }
            .stat-value {
                font-size: 24px;
                font-weight: bold;
                color: #343a40;
            }
            .stat-subtitle {
                font-size: 12px;
                color: #6c757d;
                margin-top: 4px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
                background: white;
            }
            th {
                background-color: #f8f9fa;
                padding: 12px 8px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
                font-weight: 600;
            }
            td {
                padding: 8px;
                border-bottom: 1px solid #ddd;
            }
            .footer {
                margin-top: 40px;
                text-align: center;
                font-size: 12px;
                color: #6c757d;
                border-top: 1px solid #e9ecef;
                padding-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>Reporte de Presupuestos</h1>
            <p><strong>Grupo:</strong> ${groupName}</p>
            <p><strong>Período:</strong> ${formatPeriod(selectedPeriod)}</p>
            <p><strong>Fecha de generación:</strong> ${currentDate}</p>
        </div>

        <div class="section">
            <h2>Resumen Ejecutivo</h2>
            <div class="stats-grid">
                <div class="stat-card groups">
                    <div class="stat-title">Grupos Activos</div>
                    <div class="stat-value">${dashboardStats.groupCount}</div>
                </div>
                ${
                  totalPendingAmount > 0
                    ? `
                <div class="stat-card contributions">
                    <div class="stat-title">Contribuciones Pendientes</div>
                    <div class="stat-value">${formatCurrency(totalPendingAmount)}</div>
                    <div class="stat-subtitle">${pendingContributions.length} contribución${pendingContributions.length !== 1 ? "es" : ""}</div>
                </div>
                `
                    : ""
                }
            </div>
        </div>

        ${
          pendingContributions.length > 0
            ? `
        <div class="section">
            <h2>Contribuciones Pendientes</h2>
            <table>
                <thead>
                    <tr>
                        <th>Presupuesto</th>
                        <th>Grupo</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th style="text-align: right;">Monto a Contribuir</th>
                    </tr>
                </thead>
                <tbody>
                    ${contributionsHTML}
                </tbody>
            </table>
            
            ${
              contributionsSummary
                ? `
            <div style="margin-top: 20px;">
                <h3 style="color: #343a40; margin-bottom: 15px;">Resumen por Prioridad</h3>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                    <div style="background: #ffebee; padding: 15px; border-radius: 8px; border-left: 4px solid #FF6B6B;">
                        <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Alta Prioridad</div>
                        <div style="font-size: 20px; font-weight: bold; color: #FF6B6B;">${formatCurrency(contributionsSummary.high)}</div>
                    </div>
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; border-left: 4px solid #4ECDC4;">
                        <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Media Prioridad</div>
                        <div style="font-size: 20px; font-weight: bold; color: #4ECDC4;">${formatCurrency(contributionsSummary.medium)}</div>
                    </div>
                    <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; border-left: 4px solid #95a5a6;">
                        <div style="font-size: 14px; color: #6c757d; margin-bottom: 5px;">Baja Prioridad</div>
                        <div style="font-size: 20px; font-weight: bold; color: #95a5a6;">${formatCurrency(contributionsSummary.low)}</div>
                    </div>
                </div>
            </div>
            `
                : ""
            }
        </div>
        `
            : ""
        }

        ${
          expensesByCategory.length > 0
            ? `
        <div class="section">
            <h2>Gastos por Categoría</h2>
            <table>
                <thead>
                    <tr>
                        <th>Categoría</th>
                        <th style="text-align: right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${expensesCategoriesHTML}
                </tbody>
            </table>
        </div>
        `
            : ""
        }

        ${
          recentActivity.length > 0
            ? `
        <div class="section">
            <h2>Actividad Reciente</h2>
            <table>
                <thead>
                    <tr>
                        <th>Descripción</th>
                        <th>Grupo</th>
                        <th>Fecha</th>
                        <th style="text-align: right;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentActivityHTML}
                </tbody>
            </table>
        </div>
        `
            : ""
        }

        <div class="footer">
            <p>Reporte generado automáticamente por JEKK Manager</p>
            <p>Este documento contiene información confidencial sobre el estado de sus presupuestos</p>
        </div>
    </body>
    </html>
  `;
};

export const generatePDF = async (data: PDFData): Promise<void> => {
  try {
    const htmlContent = generateHTMLContent(data);

    // Generar PDF usando expo-print
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });

    // Verificar si el dispositivo puede compartir archivos
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      // Compartir el PDF
      await Sharing.shareAsync(uri, {
        UTI: "com.adobe.pdf",
        mimeType: "application/pdf",
        dialogTitle: `Reporte de Presupuestos - ${data.groupName}`,
      });

      Alert.alert("PDF Generado", `El reporte se ha generado exitosamente para ${data.groupName} - ${formatPeriod(data.selectedPeriod)}`, [{ text: "OK" }]);
    } else {
      Alert.alert("PDF Generado", "El PDF se ha generado pero no se puede compartir en este dispositivo.", [{ text: "OK" }]);
    }
  } catch (error) {
    console.error("Error generando PDF:", error);
    Alert.alert("Error", "No se pudo generar el PDF. Intenta de nuevo.", [{ text: "OK" }]);
  }
};

export default {
  generatePDF,
};
