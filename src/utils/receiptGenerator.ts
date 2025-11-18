import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
 * Generate and download a payment receipt as PDF
 */
export const generatePaymentReceipt = (receiptData: ReceiptData): void => {
  try {
  // Create PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let yPosition = 20;

  // =============== PROFESSIONAL HEADER ===============

  const logoImg = "/servigens-logo.png";

  // Define header block positions
  const leftX = 20;
  const rightX = pageWidth - 20;

  let baseY = 20;

  // Try loading the logo - centered
  const logoWidth = 40;
  const logoHeight = 40;
  try {
    doc.addImage(logoImg, "PNG", leftX, baseY, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Logo missing...");
  }

  // Company info starts BELOW the logo
  let leftY = baseY + logoHeight + 5; // Start below logo with 5mm gap

  // Right column start
  let rightY = baseY;

  // ---------------- LEFT COLUMN (Company Info) - BELOW LOGO ----------------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SERVIGENS VISA SERVICES", leftX, leftY);
  leftY += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const companyDetails = [
    "Dar Al Salam - Building, 9th Floor - Corniche St",
    "Al Danah - Abu Dhabi Corniche - UAE",
    "Tel: +97154887748 | Mob: 0544887748",
    "Email: info@servigens.com",
    "Web: https://www.servigens.com/",
    "TRN: 1050653462000003"
  ];

  companyDetails.forEach(line => {
    doc.text(line, leftX, leftY);
    leftY += 4.5;
  });

  // ---------- RIGHT SECTION (receipt info) ----------
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("PAYMENT RECEIPT", rightX, rightY, { align: "right" });

  rightY += 10;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(`Receipt #: ${receiptData.receiptNumber}`, rightX, rightY, { align: "right" });
  rightY += 6;

  doc.text(`Date: ${receiptData.date}`, rightX, rightY, { align: "right" });
  rightY += 6;

  // Set Y to whichever column is taller (prevents overlap)
  yPosition = Math.max(leftY, rightY) + 8;

  // Divider line
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // ================= CUSTOMER INFO =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185); // Blue color for section headers
  doc.text("CUSTOMER INFORMATION", 20, yPosition);
  doc.setTextColor(0, 0, 0); // Reset to black
  yPosition += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  doc.text(`Name: ${receiptData.customerName}`, 20, yPosition);
  yPosition += 5;

  doc.text(
    `Type: ${receiptData.customerType === "company" ? "Company" : "Individual"}`,
    20,
    yPosition
  );
  yPosition += 10;

  // ================= PAYMENT DETAILS =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(41, 128, 185);
  doc.text("PAYMENT DETAILS", 20, yPosition);
  doc.setTextColor(0, 0, 0);
  yPosition += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  if (receiptData.invoiceNumber) {
    doc.text(`Invoice Number: ${receiptData.invoiceNumber}`, 20, yPosition);
    yPosition += 5;
  }

  if (receiptData.serviceName) {
    doc.text(`Service: ${receiptData.serviceName}`, 20, yPosition);
    yPosition += 5;
  }

  doc.text(`Description: ${receiptData.description}`, 20, yPosition);
  yPosition += 8;

  // Right-aligned payment information
  const rightAlignX = pageWidth - 20;

  // Highlight amount paid with background
  doc.setFillColor(232, 245, 233); // Light green background
  doc.rect(18, yPosition - 4, pageWidth - 36, 8, 'F');

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(27, 94, 32); // Dark green
  doc.text(
    `Amount Paid: AED ${receiptData.amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`,
    rightAlignX,
    yPosition,
    { align: "right" }
  );
  doc.setTextColor(0, 0, 0); // Reset to black
  yPosition += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(
    `Payment Method: ${receiptData.paymentMethod
      .replace("_", " ")
      .toUpperCase()}`,
    rightAlignX,
    yPosition,
    { align: "right" }
  );
  yPosition += 5;

  if (receiptData.transactionId) {
    doc.text(`Transaction ID: ${receiptData.transactionId}`, rightAlignX, yPosition, { align: "right" });
    yPosition += 5;
  }

  doc.text(`Status: ${receiptData.status.toUpperCase()}`, rightAlignX, yPosition, { align: "right" });
  yPosition += 10;

  // ================= INVOICE SUMMARY =================
  if (receiptData.totalAmount) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(41, 128, 185);
    doc.text("INVOICE SUMMARY", 20, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    // Create a summary box
    const summaryStartY = yPosition - 2;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);

    doc.text(
      `Total Amount: AED ${receiptData.totalAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      25,
      yPosition
    );
    yPosition += 5;

    doc.text(
      `Total Paid: AED ${(receiptData.paidAmount || 0).toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`,
      25,
      yPosition
    );
    yPosition += 5;

    doc.setFont("helvetica", "bold");
    doc.text(
      `Outstanding: AED ${(receiptData.outstandingAmount || 0).toLocaleString(
        "en-US",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }
      )}`,
      25,
      yPosition
    );
    yPosition += 3;

    // Draw box around summary
    doc.rect(20, summaryStartY, pageWidth - 40, yPosition - summaryStartY);
    yPosition += 10;
  }

  // ================= NOTES =================
  if (receiptData.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("NOTES", 20, yPosition);
    yPosition += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    const lines = doc.splitTextToSize(
      receiptData.notes,
      pageWidth - 40
    );
    doc.text(lines, 20, yPosition);
    yPosition += lines.length * 5 + 10;
  }

  // ================= PARTNER LOGOS (MANDATORY) =================
  yPosition += 5;

  // Partner logos array (without Servigens)
  const partnerLogos = [
    "/Daman Health Insurance Logo Vector.svg .png",
    "/abu-dhabi-judicial-department-adjd-logo-vector-1.png",
    "/tamm abu dhabi government Logo Vector.svg .png",
    "/tas-heel-dubai-uae-seeklogo.png",
    "/the-emirates-new-seeklogo.png",
    "/uaeicp-federal-authority-for-identity-citizenshi-seeklogo.png"
  ];

  // Calculate spacing for partner logos
  const partnerLogoWidth = 15;
  const partnerLogoHeight = 13;
  const totalPartnersWidth = partnerLogos.length * partnerLogoWidth;
  const partnerSpacing = (pageWidth - 40 - totalPartnersWidth) / (partnerLogos.length - 1);

  let partnerLogoX = 20;

  // Add each partner logo
  partnerLogos.forEach((logoPath, index) => {
    try {
      doc.addImage(logoPath, "PNG", partnerLogoX, yPosition, partnerLogoWidth, partnerLogoHeight);
    } catch (err) {
      console.warn(`Partner logo ${index + 1} missing: ${logoPath}`);
    }
    partnerLogoX += partnerLogoWidth + partnerSpacing;
  });

  yPosition += partnerLogoHeight + 10;

  // Divider
  doc.setLineWidth(0.5);
  doc.line(20, yPosition, pageWidth - 20, yPosition);
  yPosition += 8;

  // ================= FOOTER =================
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Thank you for your payment!", pageWidth / 2, yPosition, {
    align: "center",
  });

  yPosition += 10;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.text(
    `Generated on ${new Date().toLocaleString()}`,
    pageWidth / 2,
    yPosition,
    { align: "center" }
  );

  yPosition += 4;

  doc.text("This is a computer-generated receipt.", pageWidth / 2, yPosition, {
    align: "center",
  });

  // Footer logos removed - partner logos are shown in the mandatory section above

  // Save PDF
  doc.save(`receipt-${receiptData.receiptNumber}.pdf`);
  toast.success("Receipt PDF downloaded successfully");
} catch (error) {
  console.error("Error generating PDF receipt:", error);
  toast.error("Failed to generate PDF receipt");
}


};

/**
 * DEPRECATED: Generate and download a payment receipt as TXT (kept for backward compatibility)
 */
export const generatePaymentReceiptTXT = (receiptData: ReceiptData): void => {
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
    .payment-details-right {
      text-align: right;
    }
    .payment-details-right .detail-row {
      justify-content: flex-end;
    }
    .partner-logos-section {
      margin: 30px 0 20px 0;
      padding: 20px 0;
      border-top: 1px solid #e5e7eb;
      border-bottom: 1px solid #e5e7eb;
    }
    .partner-logos-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      flex-wrap: wrap;
    }
    .partner-logo {
      height: 45px;
      width: auto;
      object-fit: contain;
      opacity: 0.85;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .logo-footer-container {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 20px;
      padding: 15px 0;
      flex-wrap: wrap;
    }
    .logo-footer {
      height: 40px;
      width: auto;
      object-fit: contain;
      opacity: 0.8;
    }
      .new-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  text-align: left;
}

.left-section {
  max-width: 55%;
}

.right-section {
  text-align: right;
  max-width: 40%;
}

.receipt-logo {
  width: 120px;
  height: auto;
  margin-bottom: 15px;
  display: block;
}

.company-details {
  font-size: 12px;
  line-height: 1.4;
  margin-top: 0;
}

  </style>
</head>
<body>
 <div class="header new-header">
  <div class="left-section">
    <img src="/servigens-logo.png" alt="SERVIGENS" class="receipt-logo"
         onerror="this.style.display='none';" />

    <div class="company-details">
      <strong>SERVIGENS VISA SERVICES</strong><br>
      Dar Al Salam - Building, 9th Floor - Corniche St<br>
      Al Danah - Abu Dhabi Corniche - UAE<br>
      <strong>Tel:</strong> +97154887748 | <strong>Mob:</strong> 0544887748<br>
      <strong>Email:</strong> info@servigens.com<br>
      <strong>Web:</strong> https://www.servigens.com/<br>
      <strong>TRN:</strong> 1050653462000003
    </div>
  </div>

  <div class="right-section">
    <div class="receipt-title">PAYMENT RECEIPT</div>
    <div><strong>Receipt #:</strong> ${receiptData.receiptNumber}</div>
    <div><strong>Date:</strong> ${receiptData.date}</div>
  </div>
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

  <div class="details-section payment-details-right">
    <h3 style="text-align: left;">Payment Details</h3>
    <div class="detail-row">
      <span class="value amount">Amount Paid: AED ${receiptData.amount.toLocaleString()}</span>
    </div>
    <div class="detail-row">
      <span class="value">Payment Method: ${receiptData.paymentMethod.replace('_', ' ').toUpperCase()}</span>
    </div>
    ${receiptData.transactionId ? `
    <div class="detail-row">
      <span class="value">Transaction ID: ${receiptData.transactionId}</span>
    </div>
    ` : ''}
    <div class="detail-row">
      <span class="value">Status: ${receiptData.status.toUpperCase()}</span>
    </div>
  </div>

  ${receiptData.notes ? `
  <div class="details-section">
    <h3>Notes</h3>
    <p>${receiptData.notes}</p>
  </div>
  ` : ''}

  <div class="partner-logos-section">
    <div class="partner-logos-container">
      <img src="/Daman Health Insurance Logo Vector.svg .png" class="partner-logo" alt="Daman Health Insurance" />
      <img src="/abu-dhabi-judicial-department-adjd-logo-vector-1.png" class="partner-logo" alt="Abu Dhabi Judicial Department" />
      <img src="/tamm abu dhabi government Logo Vector.svg .png" class="partner-logo" alt="TAMM Abu Dhabi Government" />
      <img src="/tas-heel-dubai-uae-seeklogo.png" class="partner-logo" alt="Tasheel" />
      <img src="/the-emirates-new-seeklogo.png" class="partner-logo" alt="The Emirates" />
      <img src="/uaeicp-federal-authority-for-identity-citizenshi-seeklogo.png" class="partner-logo" alt="UAE ICP" />
    </div>
  </div>

  <div class="footer">
    <p>Thank you for your payment!</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
    <p>This is a computer-generated receipt.</p>
  </div>
</body>
</html>
  `;
};
