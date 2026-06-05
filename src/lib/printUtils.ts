import { Capacitor } from '@capacitor/core';
import { savePdf } from './pdfUtils';

export function printElement(element: HTMLElement | null, title: string = 'طباعة') {
  if (!element) return false;

  if (Capacitor.isNativePlatform()) {
     // Run async PDF generation in background for native
     (async () => {
       try {
         const { toPng } = await import('html-to-image');
         const { default: jsPDF } = await import('jspdf');
         
         const dataUrl = await toPng(element, {
            cacheBust: true,
            style: { background: "white" },
            pixelRatio: 2,
         });
         
         const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
         const imgProps = pdf.getImageProperties(dataUrl);
         const pdfWidth = pdf.internal.pageSize.getWidth();
         const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
         
         pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
         const dataUriString = pdf.output('datauristring');
         
         const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/gi, '_');
         await savePdf(dataUriString, `${safeTitle}.pdf`);
       } catch (err) {
         console.error('Native print/pdf failure:', err);
       }
     })();
     return true;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    // If we're able to show a toast, that's great, but we can't import toast here nicely without risking circular deps, 
    // so we just return false and let the caller show a toast.
    return false;
  }

  const contentHtml = element.outerHTML;
  let styleTags = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    styleTags += node.outerHTML + '\n';
  });

  printWindow.document.open();
  printWindow.document.write(`
    <html dir="rtl">
      <head>
        <title>${title}</title>
        <base href="${window.location.origin}">
        ${styleTags}
        <style>
          @media print {
            body { 
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
          }
          body { 
             margin: 0; 
             padding: 20mm; 
             background: white; 
             font-family: 'Inter', system-ui, sans-serif; 
          }
        </style>
      </head>
      <body>
        <div id="print-mount">
          ${contentHtml}
        </div>
        <script>
          window.onload = () => {
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}
