import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from './calculationService';
import type { GlobalQuarterlyReport } from '../utils/rentCalculations';

/**
 * Generate global quarterly report PDF
 */
export const generateGlobalQuarterlyPDF = async (
  report: GlobalQuarterlyReport
): Promise<void> => {
  try {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quarterly Report - ${report.leaseYear} ${report.quarterLabel}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              padding: 40px;
              color: #111827;
              line-height: 1.6;
            }

            h1 {
              font-size: 28px;
              margin-bottom: 8px;
              color: #2563EB;
            }

            .subtitle {
              color: #6B7280;
              font-size: 14px;
              margin-bottom: 30px;
            }

            .summary-box {
              background: #EFF6FF;
              border: 2px solid #2563EB;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
            }

            .summary-label {
              font-weight: 600;
              color: #1E40AF;
              font-size: 16px;
            }

            .summary-value {
              font-weight: 700;
              color: #1E40AF;
              font-size: 16px;
            }

            h2 {
              font-size: 20px;
              margin: 30px 0 16px 0;
              color: #111827;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }

            thead {
              background: #F3F4F6;
            }

            th {
              text-align: left;
              padding: 12px;
              font-weight: 600;
              color: #374151;
              border-bottom: 2px solid #E5E7EB;
            }

            th.amount {
              text-align: right;
            }

            td {
              padding: 12px;
              border-bottom: 1px solid #E5E7EB;
            }

            tr:last-child td {
              border-bottom: none;
            }

            .amount {
              text-align: right;
              font-weight: 500;
            }

            .total-row {
              background: #F9FAFB;
              font-weight: 700;
            }

            .total-row td {
              border-top: 2px solid #E5E7EB;
              padding-top: 16px;
              padding-bottom: 16px;
            }

            .balance-positive {
              color: #10B981;
            }

            .balance-negative {
              color: #EF4444;
            }

            .status-badge {
              display: inline-block;
              padding: 2px 8px;
              border-radius: 4px;
              font-size: 10px;
              font-weight: 600;
              margin-left: 8px;
            }

            .status-active {
              background: #D1FAE5;
              color: #059669;
            }

            .status-terminated {
              background: #FEE2E2;
              color: #DC2626;
            }

            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
              color: #6B7280;
              font-size: 12px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <h1>Quarterly Report: ${report.leaseYear} ${report.quarterLabel}</h1>
          <div class="subtitle">
            Period: ${report.dateRange}
          </div>

          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Total Expected Rent:</span>
              <span class="summary-value">${formatCurrency(report.totalExpected)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Paid:</span>
              <span class="summary-value">${formatCurrency(report.totalPaid)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Overall Balance:</span>
              <span class="summary-value ${report.totalBalance < 0 ? 'balance-positive' : report.totalBalance > 0 ? 'balance-negative' : ''}">
                ${formatCurrency(report.totalBalance)}
              </span>
            </div>
          </div>

          <h2>Tenant Details</h2>

          <table>
            <thead>
              <tr>
                <th>Tenant Name</th>
                <th class="amount">Expected Rent</th>
                <th class="amount">Actual Paid</th>
                <th class="amount">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${report.tenants.map(tenantData => `
                <tr>
                  <td>
                    ${tenantData.tenant.name}
                    <span class="status-badge ${tenantData.tenant.termination_date ? 'status-terminated' : 'status-active'}">
                      ${tenantData.tenant.termination_date ? 'Former' : 'Active'}
                    </span>
                  </td>
                  <td class="amount">${formatCurrency(tenantData.expected)}</td>
                  <td class="amount">${formatCurrency(tenantData.paid)}</td>
                  <td class="amount ${tenantData.balance < 0 ? 'balance-positive' : tenantData.balance > 0 ? 'balance-negative' : ''}">
                    ${formatCurrency(tenantData.balance)}
                  </td>
                </tr>
              `).join('')}
              <tr class="total-row">
                <td><strong>Total</strong></td>
                <td class="amount"><strong>${formatCurrency(report.totalExpected)}</strong></td>
                <td class="amount"><strong>${formatCurrency(report.totalPaid)}</strong></td>
                <td class="amount ${report.totalBalance < 0 ? 'balance-positive' : report.totalBalance > 0 ? 'balance-negative' : ''}">
                  <strong>${formatCurrency(report.totalBalance)}</strong>
                </td>
              </tr>
            </tbody>
          </table>

          <div class="footer">
            Rental Income Tracker | Generated with Expo & React Native
          </div>
        </body>
      </html>
    `;

    // Generate PDF
    const { uri } = await Print.printToFileAsync({ html });

    // Share PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Quarterly Report - ${report.leaseYear} ${report.quarterLabel}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error generating global quarterly PDF:', error);
    throw error;
  }
};
