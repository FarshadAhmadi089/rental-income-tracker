import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Tenant, Payment } from '../models';
import { getTenantBalance, formatCurrency, formatDate } from './calculationService';

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
    const saldoText = balance.saldo > 0 ? 'Rückstand' : balance.saldo < 0 ? 'Guthaben' : 'Ausgeglichen';

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
          </style>
        </head>
        <body>
          <h1>Mietbericht: ${tenant.name}</h1>
          <div class="subtitle">
            Erstellt am ${formatDate(new Date().toISOString().split('T')[0])} |
            Mietbeginn: ${formatDate(tenant.mietanfang_datum)}
          </div>

          <div class="summary-box">
            <div class="summary-row">
              <span class="summary-label">Monatliche Rate:</span>
              <span class="summary-value">${formatCurrency(balance.monatlicheRate)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Jahresmiete:</span>
              <span class="summary-value">${formatCurrency(tenant.jahresmiete)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Soll (gesamt fällig):</span>
              <span class="summary-value">${formatCurrency(balance.soll)}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">Ist (bezahlt):</span>
              <span class="summary-value">${formatCurrency(balance.ist)}</span>
            </div>
            <div class="summary-row saldo-row">
              <span class="saldo-label">Saldo:</span>
              <span class="saldo-value">
                ${formatCurrency(Math.abs(balance.saldo))}
                <span class="badge">${saldoText}</span>
              </span>
            </div>
          </div>

          ${tenant.anmerkungen ? `
            <h2>Anmerkungen</h2>
            <p style="color: #6B7280; margin-top: 8px;">${tenant.anmerkungen}</p>
          ` : ''}

          <h2>Zahlungshistorie</h2>

          ${payments.length > 0 ? `
            <table>
              <thead>
                <tr>
                  <th>Nr.</th>
                  <th>Datum</th>
                  <th class="amount">Betrag</th>
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
              <strong>Gesamt bezahlt: ${formatCurrency(balance.ist)}</strong>
            </div>
          ` : `
            <div class="empty-state">
              Keine Zahlungen vorhanden
            </div>
          `}

          <div class="footer">
            Mieteinnahmen-Tracker | Erstellt mit Expo & React Native
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
        dialogTitle: `Mietbericht - ${tenant.name}`,
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
