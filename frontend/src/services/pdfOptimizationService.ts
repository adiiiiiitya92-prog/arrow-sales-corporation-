import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { uploadImageToFirebase } from './firebase';

export interface PDFGeneratorOptions {
  fileName?: string;
  quality?: number; // 0.1 to 1.0 (default 0.60 for ultra-low KB size)
  scale?: number;   // Canvas scale (default 1.3 for crisp text under 200 KB)
  uploadToFirebase?: boolean;
  firebasePath?: string;
}

/**
 * Generates an ultra-compact PDF from an HTML element or container,
 * with canvas compression to keep output file size under 150 KB - 250 KB.
 */
export async function generateOptimizedPDF(
  element: HTMLElement,
  options: PDFGeneratorOptions = {}
): Promise<{ pdfBlob: Blob; pdfUrl?: string; fileSizeKB: number }> {
  const quality = options.quality || 0.60;
  const scale = options.scale || 1.3;
  const fileName = options.fileName || `document_${Date.now()}.pdf`;

  // 1. Render HTML element to canvas with optimized scale
  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#ffffff',
    logging: false
  });

  const imgData = canvas.toDataURL('image/jpeg', quality);

  // 2. Initialize A4 jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgProps = pdf.getImageProperties(imgData);
  const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  // 3. Output compressed Blob
  const pdfBlob = pdf.output('blob');
  const fileSizeKB = parseFloat((pdfBlob.size / 1024).toFixed(1));
  console.log(`📄 Optimized PDF Generated: ${fileName} (${fileSizeKB} KB)`);

  // 4. Optionally upload to Firebase Storage
  let pdfUrl: string | undefined = undefined;
  if (options.uploadToFirebase && options.firebasePath) {
    pdfUrl = await uploadImageToFirebase(
      pdfBlob,
      options.firebasePath,
      { maxSizeKB: 250, isDocument: true }
    );
  }

  return { pdfBlob, pdfUrl, fileSizeKB };
}

/**
 * Direct print & save helper for browser isolated window print with low-KB optimization
 */
export function triggerOptimizedPrintWindow(htmlContent: string, title: string = 'SolarCRM Document') {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert("Please allow popups to open document print preview.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          @media print {
            body { font-family: sans-serif; -webkit-print-color-adjust: exact; }
            .no-print { display: none !important; }
            @page { margin: 10mm; size: A4; }
          }
        </style>
      </head>
      <body class="bg-white text-slate-800 p-4">
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 400);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
