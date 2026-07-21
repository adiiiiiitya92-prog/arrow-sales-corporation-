import jsPDF from 'jspdf';
import type { Lead, Quotation, OrderConfirmation } from '../types';
import dayjs from 'dayjs';
import logoImg from '../assets/Arrow-sales-corporation_logo-300x84.png';

let cachedLogoDataUrl: string | null = null;

async function getLogoBase64(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const img = new Image();
    img.src = logoImg;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      cachedLogoDataUrl = canvas.toDataURL('image/png');
      return cachedLogoDataUrl;
    }
  } catch (err) {
    console.warn("Logo load error:", err);
  }
  return null;
}

export const pdfService = {
  async generateQuotationPDF(q: Quotation, lead: Lead, creatorName: string): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const logoData = await getLogoBase64();

    // Palette
    const emerald = [16, 185, 129];
    const slateDark = [15, 23, 42];

    // Header Background Banner
    doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.rect(0, 0, 210, 32, 'F');

    // Accent line below banner
    doc.setFillColor(emerald[0], emerald[1], emerald[2]);
    doc.rect(0, 32, 210, 2, 'F');

    // Company Logo / Title
    if (logoData) {
      doc.addImage(logoData, 'PNG', 15, 5, 56, 16);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('ARROW SALES CORPORATION', 15, 18);
    }

    doc.setTextColor(226, 232, 240);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLAR POWER & RENEWABLE ENERGY SOLUTIONS', 15, 27);

    // Document Type & Meta (Right Side)
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('QUOTATION / PROPOSAL', 195, 16, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Quote No: ${q.quotationNumber}`, 195, 22, { align: 'right' });
    doc.text(`Date: ${dayjs(q.createdAt || new Date()).format('DD MMM YYYY')}`, 195, 27, { align: 'right' });

    // Client Info Box
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 40, 88, 34, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 40, 88, 34, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CUSTOMER / CLIENT DETAILS', 20, 47);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`Name: ${lead.name}`, 20, 53);

    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: +91 ${lead.phoneNumber}`, 20, 59);
    if (lead.email) doc.text(`Email: ${lead.email}`, 20, 64);
    doc.text(`Requirement: ${lead.requirement}`, 20, 69);

    // Meta Box (Right Column)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(107, 40, 88, 34, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(107, 40, 88, 34, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PROPOSAL SPECIFICATIONS', 112, 47);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Valid Until: ${dayjs(q.followUpDate).format('DD MMMM YYYY')}`, 112, 53);
    doc.text(`Prepared By: ${creatorName}`, 112, 59);
    doc.text(`Status: Active Proposal`, 112, 64);

    // Table Headers
    doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.rect(15, 82, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('S.No', 18, 87);
    doc.text('Item / Component Description', 35, 87);
    doc.text('Qty', 125, 87, { align: 'right' });
    doc.text('Rate (INR)', 155, 87, { align: 'right' });
    doc.text('Amount (INR)', 190, 87, { align: 'right' });

    // Table Rows
    let yPos = 96;
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'normal');
    q.items.forEach((item, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, yPos - 5, 180, 8, 'F');
      }

      doc.text(`${idx + 1}`, 18, yPos);
      const itemName = item.itemName.length > 42 ? item.itemName.substring(0, 39) + '...' : item.itemName;
      doc.text(itemName, 35, yPos);
      doc.text(`${item.qty}`, 125, yPos, { align: 'right' });
      doc.text(`Rs. ${item.rate.toLocaleString('en-IN')}`, 155, yPos, { align: 'right' });
      doc.text(`Rs. ${item.amount.toLocaleString('en-IN')}`, 190, yPos, { align: 'right' });
      
      doc.setDrawColor(241, 245, 249);
      doc.line(15, yPos + 3, 195, yPos + 3);
      yPos += 9;
    });

    // Totals Box
    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.text('Subtotal:', 140, yPos);
    doc.text(`Rs. ${q.subtotal.toLocaleString('en-IN')}`, 190, yPos, { align: 'right' });

    yPos += 6;
    doc.setFillColor(emerald[0], emerald[1], emerald[2]);
    doc.rect(130, yPos - 4, 65, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text('GRAND TOTAL:', 133, yPos + 1.5);
    doc.text(`Rs. ${q.grandTotal.toLocaleString('en-IN')}`, 190, yPos + 1.5, { align: 'right' });

    // Terms & Conditions
    yPos += 22;
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Terms & Conditions:', 15, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('1. Quotation validity is 30 days from the date of issue.', 15, yPos + 6);
    doc.text('2. Payment Terms: 50% advance on order booking, 40% on material delivery, 10% after commissioning.', 15, yPos + 11);
    doc.text('3. Installation will be scheduled within 7 working days of stock delivery.', 15, yPos + 16);

    // Sign off
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('For Arrow Sales Corporation', 130, yPos + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(creatorName, 130, yPos + 10);
    doc.text('Authorized Signatory', 130, yPos + 14);

    return doc.output('blob');
  },

  async generateConfirmationPDF(
    oc: OrderConfirmation,
    lead: Lead,
    creatorName: string,
    signatureUrl: string
  ): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const logoData = await getLogoBase64();
    const emerald = [16, 185, 129];
    const slateDark = [15, 23, 42];

    doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.rect(0, 0, 210, 32, 'F');

    doc.setFillColor(emerald[0], emerald[1], emerald[2]);
    doc.rect(0, 32, 210, 2, 'F');

    if (logoData) {
      doc.addImage(logoData, 'PNG', 15, 5, 56, 16);
    } else {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('ARROW SALES CORPORATION', 15, 18);
    }

    doc.setTextColor(226, 232, 240);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('ORDER CONFIRMATION & ADVANCE RECEIPT', 15, 27);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('BOOKING RECEIPT', 195, 16, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Booking Date: ${dayjs(oc.createdAt || new Date()).format('DD MMM YYYY')}`, 195, 22, { align: 'right' });
    doc.text(`Payment Mode: ${oc.paymentMode.toUpperCase()}`, 195, 27, { align: 'right' });

    // Client Box
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(15, 40, 88, 34, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(15, 40, 88, 34, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('CUSTOMER DETAILS', 20, 47);
    doc.setFontSize(9);
    doc.text(`Name: ${lead.name}`, 20, 53);
    doc.setFont('helvetica', 'normal');
    doc.text(`Phone: +91 ${lead.phoneNumber}`, 20, 59);
    doc.text(`Requirement: ${lead.requirement}`, 20, 65);

    // Payment Box
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(107, 40, 88, 34, 3, 3, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(107, 40, 88, 34, 3, 3, 'D');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ADVANCE PAYMENT DETAILS', 112, 47);
    doc.setFontSize(9);
    doc.text(`Advance Amount: Rs. ${oc.advanceAmount.toLocaleString('en-IN')}`, 112, 53);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mode: ${oc.paymentMode.replace('_', ' ').toUpperCase()}`, 112, 59);
    if (oc.paymentReference) doc.text(`Ref/UTR: ${oc.paymentReference}`, 112, 65);

    // Signature stamp if present
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Confirmed By:', 130, 200);
    doc.setFont('helvetica', 'normal');
    doc.text(creatorName, 130, 205);

    if (signatureUrl && signatureUrl.startsWith('data:image')) {
      doc.addImage(signatureUrl, 'PNG', 130, 215, 45, 18);
    }

    return doc.output('blob');
  },

  /**
   * Generates a clean, modern Materials Delivery Challan & Dispatch Note
   * featuring a crisp WHITE header with official logo, compact dynamic spacing, and signature seals.
   */
  async generateChallanPDF(ch: any): Promise<Blob> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const logoData = await getLogoBase64();

    // Theme palette (Crisp White Header, Dark Slate Typography, Emerald Accents)
    const slateDark = [15, 23, 42];
    const slateGray = [71, 85, 105];
    const emerald = [16, 185, 129];

    // ===================================
    // HEADER: CLEAN WHITE BACKGROUND & LOGO
    // ===================================
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, 210, 34, 'F');

    // Company Logo / Title Left Side
    if (logoData) {
      doc.addImage(logoData, 'PNG', 14, 6, 60, 17);
    } else {
      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('ARROW SALES CORPORATION', 14, 18);
    }

    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLAR POWER SYSTEMS • MATERIAL DISPATCH NOTE', 14, 28);

    // Document Header Right Side (Clean Box)
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('DELIVERY CHALLAN', 196, 14, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129); // Emerald text
    doc.text(`CHALLAN NO: ${ch.challanNumber}`, 196, 20, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text(`Date: ${dayjs(ch.createdAt || new Date()).format('DD MMM YYYY, hh:mm A')}`, 196, 26, { align: 'right' });

    // Clean Subtle Header Divider Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 32, 196, 32);

    // ===================================
    // SECTION 1: CUSTOMER & TRANSPORT DETAILS (COMPACT SPACING)
    // ===================================
    const sec1Y = 36;

    // Box 1: Deliver To (Customer)
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, sec1Y, 90, 32, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, sec1Y, 90, 32, 2, 2, 'D');

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('DELIVER TO (CUSTOMER DETAILS)', 18, sec1Y + 6);

    doc.setDrawColor(203, 213, 225);
    doc.line(18, sec1Y + 8, 98, sec1Y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Client Name: ${ch.leadName}`, 18, sec1Y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text(`Project Ref ID: ${ch.leadId}`, 18, sec1Y + 19.5);
    doc.text(`Destination: Client Site Address`, 18, sec1Y + 25);

    // Box 2: Transport & Vehicle Info
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(106, sec1Y, 90, 32, 2, 2, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(106, sec1Y, 90, 32, 2, 2, 'D');

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('TRANSPORT & CARRIER DETAILS', 110, sec1Y + 6);

    doc.setDrawColor(203, 213, 225);
    doc.line(110, sec1Y + 8, 190, sec1Y + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(`Vehicle Number: ${ch.vehicleNumber}`, 110, sec1Y + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text(`Driver Name: ${ch.driverName} (+91 ${ch.driverPhone})`, 110, sec1Y + 19.5);
    doc.text(`Dispatch Representative: ${ch.employeeName}`, 110, sec1Y + 25);

    // Dynamic Y calculation based on notes presence
    let currentY = sec1Y + 36;
    if (ch.notes) {
      doc.setFillColor(254, 243, 199); // Light amber banner
      doc.roundedRect(14, currentY, 182, 8, 2, 2, 'F');
      doc.setDrawColor(251, 191, 36);
      doc.roundedRect(14, currentY, 182, 8, 2, 2, 'D');

      doc.setTextColor(146, 64, 14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`DISPATCH NOTES: ${ch.notes}`, 18, currentY + 5.5);
      currentY += 12;
    }

    // ===================================
    // SECTION 2: DISPATCHED MATERIALS TABLE (DYNAMIC NATURAL SPACING)
    // ===================================
    doc.setFillColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.rect(14, currentY, 182, 7.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('S.NO', 18, currentY + 5);
    doc.text('ITEM / COMPONENT DESCRIPTION', 34, currentY + 5);
    doc.text('CATEGORY', 140, currentY + 5);
    doc.text('DISPATCHED QTY', 192, currentY + 5, { align: 'right' });

    currentY += 12;
    let totalItemsCount = 0;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    ch.items.forEach((item: any, idx: number) => {
      const qtyNum = Number(item.qty) || 0;
      totalItemsCount += qtyNum;

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, currentY - 4.5, 182, 7.5, 'F');
      }

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.text(`${idx + 1}`, 18, currentY);

      const prodName = item.productName.length > 55 ? item.productName.substring(0, 52) + '...' : item.productName;
      doc.text(prodName, 34, currentY);

      doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
      doc.text(item.category ? item.category.replace('_', ' ').toUpperCase() : 'SOLAR PART', 140, currentY);

      doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.qty} UNITS`, 192, currentY, { align: 'right' });
      doc.setFont('helvetica', 'normal');

      doc.setDrawColor(241, 245, 249);
      doc.line(14, currentY + 2.5, 196, currentY + 2.5);
      currentY += 7.5;
    });

    // Summary Total Row
    doc.setFillColor(241, 245, 249);
    doc.rect(14, currentY - 1.5, 182, 7.5, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(14, currentY - 1.5, 182, 7.5, 'D');

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('TOTAL DISPATCHED UNITS / QUANTITY:', 110, currentY + 3.5);
    doc.setTextColor(16, 185, 129);
    doc.text(`${totalItemsCount} UNITS`, 192, currentY + 3.5, { align: 'right' });

    // ===================================
    // SECTION 3: DECLARATION & SIGNATURE SEALS (FITS NATURAL SPACING WITHOUT EMPTY GAPS)
    // ===================================
    const footerY = currentY + 14;

    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('RECEIPT ACKNOWLEDGEMENT & UNDERTAKING:', 14, footerY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(slateGray[0], slateGray[1], slateGray[2]);
    doc.text('We hereby acknowledge receipt of the above listed solar equipment and materials in sound condition & exact specified quantity.', 14, footerY + 4.5);

    // 3 Signature Columns (positioned right below acknowledgement)
    const signY = footerY + 22;

    // Signature 1: Driver / Carrier
    doc.setDrawColor(203, 213, 225);
    doc.line(14, signY - 4, 64, signY - 4);
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("DRIVER / CARRIER SIGNATURE", 14, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Driver: ${ch.driverName}`, 14, signY + 3.5);

    // Signature 2: Receiver / Customer
    doc.line(80, signY - 4, 130, signY - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("CUSTOMER RECEIVER STAMP & SIGN", 80, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`Customer: ${ch.leadName}`, 80, signY + 3.5);

    // Signature 3: Authorized Signatory
    doc.line(146, signY - 4, 196, signY - 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("FOR ARROW SALES CORPORATION", 146, signY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text("Authorized Dispatch Officer", 146, signY + 3.5);

    return doc.output('blob');
  }
};
