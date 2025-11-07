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
  let yPosition = 15;

  // Add company branding/header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Servigence CRM', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Add report title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Add date range if provided
  if (dateRange) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(dateRange, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Add custom header lines if provided
  if (customHeader && customHeader.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    customHeader.forEach(line => {
      doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 5;
    });
  }

  // Add generation date if enabled
  if (showDate) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
  }

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
      margin: { left: 14, right: 14 },
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
            pageHeight - 10,
            { align: 'center' }
          );
        }

        // Add footer
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(
          'Servigence CRM - Customer Relationship Management System',
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
  let yPosition = 15;

  // Add company branding/header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Servigence CRM', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Add report title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;

  // Add subtitle if provided
  if (subtitle) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Add date range if provided
  if (dateRange) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(dateRange, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 5;
  }

  // Add generation date
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

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

  // Save the PDF
  doc.save(fileName);
};

