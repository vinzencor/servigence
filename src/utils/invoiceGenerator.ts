/**
 * Invoice Generation Utilities
 * Shared functions for generating invoice HTML templates
 */

/**
 * Convert number to words for invoice amount
 */
export const numberToWords = (num: number): string => {
  const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
  const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
  const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];

  if (num === 0) return 'ZERO';

  const convert = (n: number): string => {
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
    if (n < 1000) return ones[Math.floor(n / 100)] + ' HUNDRED' + (n % 100 !== 0 ? ' AND ' + convert(n % 100) : '');
    if (n < 1000000) return convert(Math.floor(n / 1000)) + ' THOUSAND' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    return convert(Math.floor(n / 1000000)) + ' MILLION' + (n % 1000000 !== 0 ? ' ' + convert(n % 1000000) : '');
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = convert(integerPart) + ' DHS';
  if (decimalPart > 0) {
    result += ' AND ' + convert(decimalPart) + ' FILS';
  }
  return result;
};

/**
 * Generate Invoice HTML - Template 1 (Default)
 * Professional invoice with detailed breakdown
 */
export const generateInvoiceHTML = (billing: any, createdBy: string = 'Admin'): string => {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const formattedTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const serviceDate = billing.service_date ? new Date(billing.service_date).toLocaleDateString('en-US') : 'N/A';

  // Safely get client information
  const clientName = billing.company?.company_name || billing.individual?.individual_name || 'N/A';
  const clientEmail = billing.company?.email1 || billing.individual?.email1 || '';
  const clientPhone = billing.company?.phone1 || billing.individual?.phone1 || '';
  const serviceName = billing.service_type?.name || 'Service';
  const invoiceNumber = billing.invoice_number || 'N/A';
  const quantity = billing.quantity || 1;
  const typingCharges = parseFloat(billing.typing_charges || 0);
  const governmentCharges = parseFloat(billing.government_charges || 0);
  const discount = parseFloat(billing.discount || 0);
  const subtotal = typingCharges + governmentCharges;
  const totalAmount = parseFloat(billing.total_amount || 0);
  const vatPercentage = parseFloat(billing.vat_percentage || 0);
  const vatAmount = parseFloat(billing.vat_amount || 0);
  const totalAmountWithVat = parseFloat(billing.total_amount_with_vat || totalAmount);
  const cashType = billing.cash_type || 'N/A';
  const paidAmount = 0; // This should come from payment records
  const amountDue = totalAmountWithVat - paidAmount;

  const amountInWords = numberToWords(totalAmountWithVat);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tax Invoice ${invoiceNumber}</title>
      <meta charset="UTF-8">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          font-family: Arial, sans-serif;
        }
        body {
          padding: 20px;
          background-color: #f5f5f5;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          background-color: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          padding: 25px;
          border-radius: 5px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1px solid #ddd;
          padding-bottom: 20px;
          margin-bottom: 20px;
        }
        .logo-section {
          flex: 1;
        }
        .logo-image {
          max-width: 180px;
          height: auto;
          margin-bottom: 10px;
        }
        .logo-text {
          font-size: 24px;
          font-weight: bold;
          color: #1e3a8a;
          margin-bottom: 5px;
        }
        .logo-tagline {
          font-size: 10px;
          color: #666;
          margin-bottom: 15px;
          text-transform: uppercase;
        }
        .company-details {
          font-size: 11px;
          line-height: 1.4;
          color: #333;
        }
        .company-details strong {
          color: #000;
        }
        .invoice-title-section {
          flex: 1;
          text-align: right;
        }
        .invoice-title {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        .barcode-image {
          height: 60px;
          background-color: #f0f0f0;
          margin-bottom: 10px;
          border: 1px dashed #ccc;
        }
        .invoice-meta {
          font-size: 11px;
          line-height: 1.4;
          color: #333;
        }
        .invoice-meta strong {
          color: #000;
        }
        .client-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 1px solid #ddd;
        }
        .client-details {
          font-size: 11px;
          line-height: 1.4;
        }
        .client-details strong {
          display: block;
          margin-bottom: 5px;
        }
        .status-section {
          text-align: right;
        }
        .status-badge {
          background-color: #999;
          color: white;
          padding: 5px 15px;
          border-radius: 3px;
          font-size: 14px;
        }
        .services-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .services-table th {
          background-color: #f9f9f9;
          padding: 10px;
          text-align: left;
          border-bottom: 1px solid #ddd;
          font-size: 11px;
        }
        .services-table td {
          padding: 10px;
          border-bottom: 1px solid #f0f0f0;
          font-size: 11px;
        }
        .services-table .date {
          font-size: 9px;
          color: #666;
        }
        .totals-section {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        .totals-table {
          width: 300px;
          border-collapse: collapse;
        }
        .totals-table td {
          padding: 5px 10px;
          font-size: 11px;
        }
        .totals-table .label {
          text-align: right;
          padding-right: 20px;
        }
        .totals-table .value {
          text-align: right;
          font-weight: bold;
        }
        .grand-total {
          border-top: 1px solid #ddd;
          font-weight: bold;
        }
        .amount-due {
          font-weight: bold;
        }
        .amount-words {
          padding: 10px;
          background-color: #f9f9f9;
          font-size: 11px;
          margin-bottom: 20px;
          border-radius: 3px;
        }
        .logo-footer-container {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          margin-top: 10px;
        }
        .logo-footer {
          width: 60px;
          height: 60px;
          object-fit: contain;
        }
        .bank-details {
          padding: 15px;
          background-color: #f9f9f9;
          font-size: 11px;
          line-height: 1.4;
          border-radius: 3px;
          margin-bottom: 20px;
        }
        .bank-details strong {
          color: #000;
        }
        @media print {
          body {
            margin: 0;
            padding: 0;
            background: white;
          }
          .invoice-container {
            border: none;
            box-shadow: none;
            margin: 0;
            padding: 20px;
            border-radius: 0;
          }
          .header {
            page-break-after: avoid;
          }
          .services-table {
            page-break-inside: avoid;
          }
          .totals-section {
            page-break-before: avoid;
          }
        }
        @media (max-width: 768px) {
          .header {
            flex-direction: column;
          }
          .invoice-title-section {
            text-align: left;
            margin-top: 20px;
          }
          .client-info {
            flex-direction: column;
          }
          .status-section {
            text-align: left;
            margin-top: 10px;
          }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <!-- Header -->
        <div class="header">
          <div class="logo-section">
            <img src="/servigens.png" alt="SERVIGENS" class="logo-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
            <div class="logo-text" style="display:none;">SERVIGENS</div>

            <div class="company-details">
              <strong>Servigens Business Group</strong><br>
              Dar Al Salam - Building, 9th Floor - Corniche St - Al<br>
              Danah -Abu Dhabi Corniche- UAE<br>
              <strong>Tel:</strong> +97154887748<br>
              <strong>Mob:</strong> 0544887748<br>
              <strong>Email:</strong> info@servigens.com<br>
              <strong>Web:</strong> https://www.servigens.com/<br>
              <strong>TRN:</strong> 1050653462000003
            </div>
          </div>
          <div class="invoice-title-section">
            <div class="invoice-title">TAX INVOICE</div>
            <div class="barcode-image"></div>
            <div class="invoice-meta">
              <strong>Invoice #:</strong> ${invoiceNumber}<br>
              <strong>Generated on:</strong> ${formattedDate} ${formattedTime}<br>
              <strong>Created By:</strong> ${createdBy}
            </div>
          </div>
        </div>

        <!-- Client Information -->
        <div class="client-info">
          <div class="client-details">
            <strong>${clientName.toUpperCase()}</strong>
            ${clientEmail ? `<div><strong>Email:</strong> ${clientEmail}</div>` : ''}
            ${clientPhone ? `<div><strong>Phone:</strong> ${clientPhone}</div>` : ''}
          </div>
          <div class="status-section">
            <span class="status-badge">${amountDue > 0 ? 'Unpaid' : 'Paid'}</span>
          </div>
        </div>

        <!-- Services Table -->
        <table class="services-table">
          <thead>
            <tr>
              <th>Service</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Fees/Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${serviceName}</td>
              <td>${serviceName}<br><span class="date">${serviceDate}</span></td>
              <td>${quantity}</td>
              <td>${typingCharges.toFixed(2)}</td>
              <td>${typingCharges.toFixed(2)}</td>
            </tr>
            ${governmentCharges > 0 ? `
            <tr>
              <td>Government Charges</td>
              <td>Government processing fees</td>
              <td>${quantity}</td>
              <td>${governmentCharges.toFixed(2)}</td>
              <td>${governmentCharges.toFixed(2)}</td>
            </tr>
            ` : ''}
            ${discount > 0 ? `
            <tr>
              <td>Discount</td>
              <td>Discount applied</td>
              <td>1</td>
              <td>-${discount.toFixed(2)}</td>
              <td>-${discount.toFixed(2)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>

        <!-- Totals Section -->
        <div class="totals-section">
          <table class="totals-table">
            <tr class="grand-total">
              <td class="label">Grand Total</td>
              <td class="value">${totalAmountWithVat.toFixed(2)}</td>
            </tr>
            <tr>
              <td class="label">Paid</td>
              <td class="value">${paidAmount.toFixed(2)}</td>
            </tr>
            <tr class="amount-due">
              <td class="label">Amount Due</td>
              <td class="value">${amountDue.toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Amount in Words -->
        <div class="amount-words">
          In Words: <span>${amountInWords}</span>
        </div>

        <div class="logo-footer-container">
          <img src="/Daman Health Insurance Logo Vector.svg .png" class="logo-footer" />
          <img src="/abu-dhabi-judicial-department-adjd-logo-vector-1.png" class="logo-footer" />
          <img src="/tamm abu dhabi government Logo Vector.svg .png" class="logo-footer" />
          <img src="/tas-heel-dubai-uae-seeklogo.png" class="logo-footer" />
          <img src="/the-emirates-new-seeklogo.png" class="logo-footer" />
          <img src="/uaeicp-federal-authority-for-identity-citizenshi-seeklogo.png" class="logo-footer" />
        </div>

        <!-- Bank Details -->
        <div class="bank-details">
          <strong>COMPANY ACCOUNT TITLE :</strong> SERVIGENS INTERNATIONAL HOLIDAYS - ABU DHABI COMMERCIAL BANK<br>
          <strong>ACCOUNT NUMBER :</strong> 13024796820001 - <strong>IBAN NUMBER :</strong> AE650300013024796820001
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print invoice in a new window
 */
export const printInvoice = (billing: any, createdBy: string = 'Admin'): void => {
  const invoiceHTML = generateInvoiceHTML(billing, createdBy);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }
};

/**
 * Download invoice as PDF using browser's print-to-PDF functionality
 */
export const downloadInvoicePDF = (billing: any, createdBy: string = 'Admin'): void => {
  const invoiceHTML = generateInvoiceHTML(billing, createdBy);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    // Set the document title for the PDF filename
    const clientName = billing.company?.company_name || billing.individual?.individual_name || 'Client';
    const invoiceNumber = billing.invoice_number || 'Invoice';
    const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedInvoiceNumber = invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_');
    printWindow.document.title = `Invoice_${sanitizedInvoiceNumber}_${sanitizedClientName}`;

    // Trigger print dialog (user can save as PDF)
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }
};

