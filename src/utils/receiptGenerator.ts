import toast from 'react-hot-toast';

export interface ReceiptData {
  receiptNumber: string;
  date: string;
  customerName: string;
  customerType: 'company' | 'individual';
  customerId: string;
  amount: number;
  description: string;
  paymentMethod: 'cash' | 'bank_transfer' | 'credit_card' | 'cheque' | 'online';
  status: 'draft' | 'issued' | 'paid' | 'cancelled';
  transactionId?: string;
  notes?: string;
  invoiceNumber?: string;
  totalAmount?: number;
  paidAmount?: number;
  outstandingAmount?: number;
  serviceName?: string;
}

export interface OutstandingReceiptData {
  customerName: string;
  customerType: 'company' | 'individual';
  customerId: string;
  totalDues: number;
  totalAdvancePayments: number;
  netOutstanding: number;
  creditLimit: number;
  phone?: string;
  email?: string;
}

/**
 * Generate a receipt number with current timestamp
 */
export const generateReceiptNumber = (): string => {
  return `RCP-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
};

/**
 * Generate and download a payment receipt
 */
export const generatePaymentReceipt = (receiptData: ReceiptData): void => {
  const receiptContent = `
PAYMENT RECEIPT
===============

Receipt #: ${receiptData.receiptNumber}
Date: ${receiptData.date}
Customer: ${receiptData.customerName}
Customer Type: ${receiptData.customerType === 'company' ? 'Company' : 'Individual'}

${receiptData.invoiceNumber ? `Invoice: ${receiptData.invoiceNumber}` : ''}
${receiptData.serviceName ? `Service: ${receiptData.serviceName}` : ''}

PAYMENT DETAILS
---------------
Amount Paid: AED ${receiptData.amount.toLocaleString()}
Payment Method: ${receiptData.paymentMethod.replace('_', ' ').toUpperCase()}
${receiptData.transactionId ? `Transaction ID: ${receiptData.transactionId}` : ''}

${receiptData.totalAmount ? `
INVOICE SUMMARY
---------------
Total Amount: AED ${receiptData.totalAmount.toLocaleString()}
Total Paid: AED ${(receiptData.paidAmount || 0).toLocaleString()}
Outstanding: AED ${(receiptData.outstandingAmount || 0).toLocaleString()}
` : ''}

${receiptData.notes ? `Notes: ${receiptData.notes}` : ''}

Thank you for your payment!
Servigence Business Services

Generated on ${new Date().toLocaleString()}
This is a computer-generated receipt.
  `.trim();

  downloadTextFile(receiptContent, `receipt-${receiptData.receiptNumber}.txt`);
  toast.success('Receipt downloaded successfully');
};

/**
 * Generate and download an outstanding statement receipt
 */
export const generateOutstandingStatement = (customerData: OutstandingReceiptData): void => {
  const receiptNumber = generateReceiptNumber();
  const currentDate = new Date().toLocaleDateString();
  
  const statementContent = `
OUTSTANDING STATEMENT
====================

Statement #: ${receiptNumber}
Date: ${currentDate}

CUSTOMER INFORMATION
-------------------
Name: ${customerData.customerName}
Type: ${customerData.customerType === 'company' ? 'Company' : 'Individual'}
Customer ID: ${customerData.customerId}
${customerData.phone ? `Phone: ${customerData.phone}` : ''}
${customerData.email ? `Email: ${customerData.email}` : ''}

ACCOUNT SUMMARY
---------------
Total Dues: AED ${customerData.totalDues.toLocaleString()}
Advance Payments: AED ${customerData.totalAdvancePayments.toLocaleString()}
Net Outstanding: AED ${Math.abs(customerData.netOutstanding).toLocaleString()}
Credit Limit: AED ${customerData.creditLimit.toLocaleString()}

STATUS: ${customerData.netOutstanding > 0 ? 'OUTSTANDING' : customerData.netOutstanding < 0 ? 'CREDIT BALANCE' : 'BALANCED'}

${customerData.netOutstanding > 0 ? `
PAYMENT DUE
-----------
Please arrange payment for the outstanding amount of AED ${customerData.netOutstanding.toLocaleString()}.
` : customerData.netOutstanding < 0 ? `
CREDIT BALANCE
--------------
You have a credit balance of AED ${Math.abs(customerData.netOutstanding).toLocaleString()}.
This amount can be used for future services.
` : `
ACCOUNT BALANCED
----------------
Your account is fully balanced. Thank you for your prompt payments.
`}

Thank you for your business!
Servigence Business Services

Generated on ${new Date().toLocaleString()}
This is a computer-generated statement.
  `.trim();

  downloadTextFile(statementContent, `outstanding-statement-${customerData.customerName.replace(/[^a-zA-Z0-9]/g, '_')}-${receiptNumber}.txt`);
  toast.success('Outstanding statement downloaded successfully');
};

/**
 * Utility function to download text content as a file
 */
const downloadTextFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Generate HTML receipt content for printing
 */
export const generateHTMLReceipt = (receiptData: ReceiptData): string => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${receiptData.receiptNumber}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.6;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }
    .receipt-title {
      font-size: 20px;
      font-weight: bold;
      color: #059669;
      margin: 20px 0;
    }
    .details-section {
      background-color: #f9fafb;
      padding: 15px;
      border-radius: 8px;
      margin: 15px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin: 8px 0;
    }
    .label {
      font-weight: bold;
      color: #374151;
    }
    .value {
      color: #111827;
    }
    .amount {
      font-size: 18px;
      font-weight: bold;
      color: #059669;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">Servigence Business Services</div>
    <div class="receipt-title">PAYMENT RECEIPT</div>
    <div>Receipt #: ${receiptData.receiptNumber}</div>
    <div>Date: ${receiptData.date}</div>
  </div>

  <div class="details-section">
    <h3>Customer Information</h3>
    <div class="detail-row">
      <span class="label">Name:</span>
      <span class="value">${receiptData.customerName}</span>
    </div>
    <div class="detail-row">
      <span class="label">Type:</span>
      <span class="value">${receiptData.customerType === 'company' ? 'Company' : 'Individual'}</span>
    </div>
  </div>

  <div class="details-section">
    <h3>Payment Details</h3>
    <div class="detail-row">
      <span class="label">Amount Paid:</span>
      <span class="value amount">AED ${receiptData.amount.toLocaleString()}</span>
    </div>
    <div class="detail-row">
      <span class="label">Payment Method:</span>
      <span class="value">${receiptData.paymentMethod.replace('_', ' ').toUpperCase()}</span>
    </div>
    ${receiptData.transactionId ? `
    <div class="detail-row">
      <span class="label">Transaction ID:</span>
      <span class="value">${receiptData.transactionId}</span>
    </div>
    ` : ''}
  </div>

  ${receiptData.notes ? `
  <div class="details-section">
    <h3>Notes</h3>
    <p>${receiptData.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your payment!</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>This is a computer-generated receipt.</p>
  </div>
</body>
</html>
  `;
};
