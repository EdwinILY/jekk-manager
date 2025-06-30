// services/pdfService.ts
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import type { ActivityItem, DashboardStats, ExpenseCategory } from './dashboardService';

interface PDFData {
  dashboardStats: DashboardStats;
  expensesByCategory: ExpenseCategory[];
  recentActivity: ActivityItem[];
  selectedGroup: string;
  selectedPeriod: string;
  groupName: string;
}

const formatCurrency = (amount: number): string => {
  return `$${amount.toLocaleString()}`;
};

const formatPeriod = (period: string): string => {
  const periods: { [key: string]: string } = {
    week: 'Esta semana',
    month: 'Este mes',
    quarter: 'Trimestre',
    year: 'Este año'
  };
  return periods[period] || period;
};

const generateHTMLContent = (data: PDFData): string => {
  const { dashboardStats, expensesByCategory, recentActivity, selectedPeriod, groupName } = data;
  
  const currentDate = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const expensesCategoriesHTML = expensesByCategory.map(category => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${category.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">${formatCurrency(category.amount)}</td>
    </tr>
  `).join('');

  const recentActivityHTML = recentActivity.slice(0, 10).map(activity => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${activity.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${activity.group}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd;">${activity.date}</td>
      <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right; color: ${activity.type === 'expense' ? '#FF6B6B' : '#4ECDC4'};">
        ${activity.type === 'expense' ? '-' : '+'}${formatCurrency(activity.amount)}
      </td>
    </tr>
  `).join('');

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
                <div class="stat-card expense">
                    <div class="stat-title">Total Gastado</div>
                    <div class="stat-value">${formatCurrency(dashboardStats.totalExpenses)}</div>
                </div>
                <div class="stat-card budget">
                    <div class="stat-title">Presupuestado</div>
                    <div class="stat-value">${formatCurrency(dashboardStats.totalBudgeted)}</div>
                </div>
                <div class="stat-card difference">
                    <div class="stat-title">Diferencia</div>
                    <div class="stat-value">${formatCurrency(Math.abs(dashboardStats.difference))}</div>
                    <div class="stat-subtitle">${dashboardStats.difference >= 0 ? "Bajo presupuesto" : "Sobre presupuesto"}</div>
                </div>
                <div class="stat-card groups">
                    <div class="stat-title">Grupos Activos</div>
                    <div class="stat-value">${dashboardStats.groupCount}</div>
                </div>
            </div>
        </div>

        ${expensesByCategory.length > 0 ? `
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
        ` : ''}

        ${recentActivity.length > 0 ? `
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
        ` : ''}

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
        UTI: 'com.adobe.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Reporte de Presupuestos - ${data.groupName}`
      });
      
      Alert.alert(
        'PDF Generado',
        `El reporte se ha generado exitosamente para ${data.groupName} - ${formatPeriod(data.selectedPeriod)}`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'PDF Generado',
        'El PDF se ha generado pero no se puede compartir en este dispositivo.',
        [{ text: 'OK' }]
      );
    }
  } catch (error) {
    console.error('Error generando PDF:', error);
    Alert.alert(
      'Error',
      'No se pudo generar el PDF. Intenta de nuevo.',
      [{ text: 'OK' }]
    );
  }
};

export default {
  generatePDF,
};
