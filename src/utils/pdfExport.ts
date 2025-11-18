import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFColumn {
  header: string;
  dataKey: string;
  width?: number;
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: string;
  columns: PDFColumn[];
  data: any[];
  fileName: string;
  summaryData?: { label: string; value: string | number }[];
  orientation?: 'portrait' | 'landscape';
  showPageNumbers?: boolean;
  showDate?: boolean;
  customHeader?: string[];
}

/**
 * Add professional header with company logo and info
 */
const addProfessionalHeader = (doc: jsPDF, title: string, subtitle?: string, dateRange?: string): number => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftX = 20;
  const rightX = pageWidth - 20;
  let baseY = 20;

  // Try loading the logo
  const logoImg = "/servigens-logo.png";
  const logoWidth = 35;
  const logoHeight = 35;

  try {
    doc.addImage(logoImg, "PNG", leftX, baseY, logoWidth, logoHeight);
  } catch (err) {
    console.warn("Logo missing...");
  }

  // Company info starts BELOW the logo
  let leftY = baseY + logoHeight + 5;

  // Company details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("SERVIGENS VISA SERVICES", leftX, leftY);
  leftY += 6;

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

  // Right section - Report title
  let rightY = baseY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title.toUpperCase(), rightX, rightY, { align: "right" });
  rightY += 8;

  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(subtitle, rightX, rightY, { align: "right" });
    rightY += 6;
  }

  if (dateRange) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(dateRange, rightX, rightY, { align: "right" });
    rightY += 6;
  }

  // Generation date
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleString()}`, rightX, rightY, { align: "right" });
  rightY += 6;

  // Return the Y position after header
  const finalY = Math.max(leftY, rightY) + 8;

  // Draw divider line
  doc.setLineWidth(0.5);
  doc.line(20, finalY, pageWidth - 20, finalY);

  return finalY + 8;
};

/**
 * Add partner logos to footer
 */
const addPartnerLogosFooter = (doc: jsPDF, yPosition: number) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Partner logos array
  const partnerLogos = [
    "/Daman Health Insurance Logo Vector.svg .png",
    "/abu-dhabi-judicial-department-adjd-logo-vector-1.png",
    "/tamm abu dhabi government Logo Vector.svg .png",
    "/tas-heel-dubai-uae-seeklogo.png",
    "/the-emirates-new-seeklogo.png",
    "/uaeicp-federal-authority-for-identity-citizenshi-seeklogo.png"
  ];

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

  return yPosition + partnerLogoHeight + 5;
};

/**
 * Export data to PDF with consistent formatting
 */
export const exportToPDF = (options: PDFExportOptions) => {
  const {
    title,
    subtitle,
    dateRange,
    columns,
    data,
    fileName,
    summaryData,
    orientation = 'portrait',
    showPageNumbers = true,
    showDate = true,
    customHeader
  } = options;

  // Create new PDF document
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add professional header with logo and company info
  let yPosition = addProfessionalHeader(doc, title, subtitle, dateRange);

  // Add summary data if provided
  if (summaryData && summaryData.length > 0) {
    yPosition += 2;

    const summaryTableData = summaryData.map(item => [item.label, item.value]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Summary', 'Value']],
      body: summaryTableData,
      theme: 'grid',
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left'
      },
      bodyStyles: {
        fontSize: 10
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 'auto' },
        1: { halign: 'right', cellWidth: 'auto' }
      },
      margin: { left: 14, right: 14 }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Add main data table
  if (data.length > 0) {
    const tableColumns = columns.map(col => col.header);
    const tableData = data.map(row =>
      columns.map(col => {
        const value = row[col.dataKey];
        // Format numbers with commas
        if (typeof value === 'number') {
          return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return value || '-';
      })
    );

    autoTable(doc, {
      startY: yPosition,
      head: [tableColumns],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 9,
        halign: 'left'
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      },
      margin: { left: 14, right: 14, bottom: 35 }, // Extra bottom margin for partner logos
      didDrawPage: (data) => {
        // Add page numbers
        if (showPageNumbers) {
          const pageCount = (doc as any).internal.getNumberOfPages();
          const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;

          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Page ${currentPage} of ${pageCount}`,
            pageWidth / 2,
            pageHeight - 25,
            { align: 'center' }
          );
        }

        // Add partner logos at bottom
        const logoY = pageHeight - 20;
        addPartnerLogosFooter(doc, logoY);

        // Add footer text
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          'SERVIGENS VISA SERVICES - Professional Visa & Business Services',
          pageWidth / 2,
          pageHeight - 5,
          { align: 'center' }
        );
      }
    });
  } else {
    // No data message
    doc.setFontSize(12);
    doc.setFont('helvetica', 'italic');
    doc.text('No data available for the selected criteria.', pageWidth / 2, yPosition + 20, { align: 'center' });

    // Add partner logos even when no data
    const logoY = pageHeight - 20;
    addPartnerLogosFooter(doc, logoY);
  }

  // Save the PDF
  doc.save(fileName);
};

/**
 * Export simple summary report to PDF
 */
export const exportSummaryToPDF = (options: {
  title: string;
  subtitle?: string;
  dateRange?: string;
  summaryItems: { label: string; value: string | number; highlight?: boolean }[];
  fileName: string;
}) => {
  const { title, subtitle, dateRange, summaryItems, fileName } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Add professional header with logo and company info
  let yPosition = addProfessionalHeader(doc, title, subtitle, dateRange);

  yPosition += 5;

  // Add summary items
  summaryItems.forEach((item, index) => {
    const boxY = yPosition + (index * 25);

    // Draw box
    if (item.highlight) {
      doc.setFillColor(59, 130, 246); // Blue for highlighted items
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFillColor(245, 247, 250); // Light gray
      doc.setTextColor(0, 0, 0);
    }

    doc.roundedRect(20, boxY, pageWidth - 40, 20, 3, 3, 'F');

    // Add label
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label, 25, boxY + 8);

    // Add value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(String(item.value), pageWidth - 25, boxY + 13, { align: 'right' });

    doc.setTextColor(0, 0, 0); // Reset text color
  });

  // Add partner logos at bottom
  const logoY = pageHeight - 20;
  addPartnerLogosFooter(doc, logoY);

  // Add footer text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text(
    'SERVIGENS VISA SERVICES - Professional Visa & Business Services',
    pageWidth / 2,
    pageHeight - 5,
    { align: 'center' }
  );

  // Save the PDF
  doc.save(fileName);
};

