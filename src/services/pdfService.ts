import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { Tenant, Payment } from '../models';
import { getTenantBalance, formatCurrency, formatDate } from './calculationService';
import { calculateFiscalYearData } from '../utils/rentCalculations';

/**
 * Generate PDF report for a tenant
 */
export const generateTenantPDF = async (
  tenant: Tenant,
  payments: Payment[]
): Promise<void> => {
  try {
    const balance = getTenantBalance(tenant);
    const saldoColor = balance.saldo > 0 ? '#EF4444' : balance.saldo < 0 ? '#10B981' : '#6B7280';
    const saldoText = balance.saldo > 0 ? 'Outstanding' : balance.saldo < 0 ? 'Overpaid' : 'Settled';

    // Calculate fiscal years data using the same function as the screen
    const fiscalYearsData = calculateFiscalYearData(tenant, payments);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Mietbericht - ${tenant.name}</title>
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
              background: #F9FAFB;
              border: 2px solid #E5E7EB;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 30px;
            }

            .summary-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #E5E7EB;
            }

            .summary-row:last-child {
              border-bottom: none;
            }

            .summary-label {
              font-weight: 500;
              color: #6B7280;
            }

            .summary-value {
              font-weight: 600;
              color: #111827;
            }

            .saldo-row {
              margin-top: 12px;
              padding-top: 12px;
              border-top: 2px solid #E5E7EB;
            }

            .saldo-label {
              font-weight: 700;
              font-size: 18px;
            }

            .saldo-value {
              font-weight: 700;
              font-size: 20px;
              color: ${saldoColor};
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

            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #E5E7EB;
              color: #6B7280;
              font-size: 12px;
              text-align: center;
            }

            .badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 600;
              background: ${saldoColor}20;
              color: ${saldoColor};
            }

            .empty-state {
              text-align: center;
              padding: 40px;
              color: #9CA3AF;
            }

            /* Fiscal Year Styles */
            .fiscal-year-section {
              margin-top: 30px;
              page-break-inside: avoid;
            }

            .fiscal-year-block {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }

            .fiscal-year-header {
              background: #EFF6FF;
              border: 2px solid #2563EB;
              border-radius: 8px;
              padding: 12px 16px;
              margin-bottom: 12px;
              display: flex;
              justify-content: space-between;
            }

            .fiscal-year-title {
              font-size: 16px;
              font-weight: 700;
              color: #1E40AF;
              flex: 2;
            }

            .fiscal-year-amount {
              flex: 1;
              text-align: right;
              font-size: 14px;
              font-weight: 700;
              color: #1E40AF;
            }

            .fiscal-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
            }

            .fiscal-table thead {
              background: #F3F4F6;
            }

            .fiscal-table th {
              text-align: left;
              padding: 8px 12px;
              font-size: 12px;
              font-weight: 600;
              color: #6B7280;
              border-bottom: 1px solid #E5E7EB;
            }

            .fiscal-table th.right {
              text-align: right;
            }

            .fiscal-quarter-row {
              background: #F9FAFB;
              font-weight: 600;
              color: #374151;
            }

            .fiscal-quarter-row td {
              padding: 10px 12px;
              font-size: 13px;
              border-bottom: 1px solid #E5E7EB;
            }

            .fiscal-month-row td {
              padding: 8px 12px;
              padding-left: 32px;
              font-size: 12px;
              color: #6B7280;
              border-bottom: 1px solid #F3F4F6;
              border-left: 2px solid #E5E7EB;
            }

            .fiscal-month-row td:first-child {
              border-left: 2px solid #E5E7EB;
            }

            .amount-positive {
              color: #10B981;
              font-weight: 600;
            }

            .amount-negative {
              color: #EF4444;
              font-weight: 600;
            }

            .amount {
              text-align: right;
            }
          </style>
        </head>
        <body>
          <h1>Tenant Report: ${tenant.name}</h1>
          <div class="subtitle">
            Generated: ${formatDate(new Date().toISOString().split('T')[0])} |
            Lease Start: ${formatDate(tenant.mietanfang_datum)}
            ${tenant.termination_date ? ` | <strong style="color: #EF4444;">Lease End: ${formatDate(tenant.termination_date)}</strong>` : ' | <strong style="color: #10B981;">Active Lease</strong>'}
          </div>

          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Monthly Rate:</span>
              <span class="summary-value">${formatCurrency(balance.monatlicheRate)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Annual Rent:</span>
              <span class="summary-value">${formatCurrency(tenant.jahresmiete)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Due:</span>
              <span class="summary-value">${formatCurrency(balance.soll)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Total Paid:</span>
              <span class="summary-value">${formatCurrency(balance.ist)}</span>
            </div>
            <div class="summary-row saldo-row">
              <span class="saldo-label">Current Balance:</span>
              <span class="saldo-value">
                ${formatCurrency(Math.abs(balance.saldo))}
                <span class="badge">${saldoText}</span>
              </span>
            </div>
          </div>

          ${tenant.anmerkungen ? `
            <h2>Notes</h2>
            <p style="color: #6B7280; margin-top: 8px;">${tenant.anmerkungen}</p>
          ` : ''}

          <!-- Fiscal Years Section -->
          ${fiscalYearsData.length > 0 ? `
            <div class="fiscal-year-section">
              <h2>Lease Years (Dec-Nov)</h2>

              ${fiscalYearsData.map(fiscalYear => `
                <div class="fiscal-year-block">
                  <!-- Year Total Header -->
                  <div class="fiscal-year-header">
                    <span class="fiscal-year-title">Lease Year ${fiscalYear.fiscalYear}</span>
                    <span class="fiscal-year-amount">${formatCurrency(fiscalYear.soll)}</span>
                    <span class="fiscal-year-amount">${formatCurrency(fiscalYear.ist)}</span>
                    <span class="fiscal-year-amount ${fiscalYear.differenz < 0 ? 'amount-positive' : 'amount-negative'}">
                      ${formatCurrency(fiscalYear.differenz)}
                    </span>
                  </div>

                  <!-- Quarters and Months Table -->
                  <table class="fiscal-table">
                    <thead>
                      <tr>
                        <th>Period</th>
                        <th class="right">Expected</th>
                        <th class="right">Paid</th>
                        <th class="right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${fiscalYear.quarters.map(quarter => `
                        <!-- Quarter Row -->
                        <tr class="fiscal-quarter-row">
                          <td>${quarter.label}</td>
                          <td class="amount">${formatCurrency(quarter.soll)}</td>
                          <td class="amount">${formatCurrency(quarter.ist)}</td>
                          <td class="amount ${quarter.differenz < 0 ? 'amount-positive' : 'amount-negative'}">
                            ${formatCurrency(quarter.differenz)}
                          </td>
                        </tr>

                        <!-- Month Rows -->
                        ${quarter.months.map(month => `
                          <tr class="fiscal-month-row">
                            <td>${month.label}</td>
                            <td class="amount">${formatCurrency(month.soll)}</td>
                            <td class="amount">${formatCurrency(month.ist)}</td>
                            <td class="amount ${month.differenz < 0 ? 'amount-positive' : 'amount-negative'}">
                              ${formatCurrency(month.differenz)}
                            </td>
                          </tr>
                        `).join('')}
                      `).join('')}
                    </tbody>
                  </table>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <h2>Payment History</h2>

          ${payments.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Date</th>
                  <th class="amount">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${payments.map((payment, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${formatDate(payment.datum)}</td>
                    <td class="amount">${formatCurrency(payment.betrag)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="text-align: right; margin-top: 16px; padding: 12px; background: #F9FAFB; border-radius: 8px;">
              <strong>Total Paid: ${formatCurrency(balance.ist)}</strong>
            </div>
          ` : `
            <div class="empty-state">
              No payments recorded
            </div>
          `}

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
        dialogTitle: `Tenant Report - ${tenant.name}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Sharing is not available on this device');
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
};
