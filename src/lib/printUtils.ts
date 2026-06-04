import { Capacitor } from '@capacitor/core';
import { savePdf } from './pdfUtils';

function collectDocumentStyles(): string {
  let styleTags = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    styleTags += node.outerHTML + '\n';
  });
  return styleTags;
}

function buildPrintHtml(contentHtml: string, title: string): string {
  const styleTags = collectDocumentStyles();
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
  <head>
    <meta charset="utf-8" />
    <title>${title}</title>
    <base href="${window.location.origin}/">
    ${styleTags}
    <style>
      @page { margin: 8mm; }
      @media print {
        body {
          padding: 0 !important;
          margin: 0 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .student-card-print {
          break-inside: avoid !important;
          page-break-inside: avoid !important;
        }
      }
      body {
        margin: 0;
        padding: 12mm;
        background: white;
        font-family: 'Cairo', 'Inter', system-ui, sans-serif;
      }
      /* cqi needs a sized container in print window */
      .student-card-print {
        container-type: inline-size;
      }
    </style>
  </head>
  <body>
    <div id="print-mount">${contentHtml}</div>
    <script>
      function doPrint() {
        const imgs = Array.from(document.images);
        Promise.all(
          imgs.map(
            (img) =>
              img.complete
                ? Promise.resolve()
                : new Promise((r) => {
                    img.onload = img.onerror = r;
                  }),
          ),
        ).finally(() => {
          setTimeout(() => {
            window.focus();
            window.print();
          }, 350);
        });
      }
      if (document.readyState === 'complete') doPrint();
      else window.addEventListener('load', doPrint);
    </script>
  </body>
</html>`;
}

function printViaHiddenIframe(html: string, title: string): boolean {
  const iframe = document.createElement('iframe');
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;',
  );
  iframe.setAttribute('title', title);
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  iframe.onload = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      /* ignore */
    }
    setTimeout(() => document.body.removeChild(iframe), 2000);
  };

  return true;
}

export function printElement(
  element: HTMLElement | null,
  title: string = 'طباعة',
): boolean {
  if (!element) return false;

  if (Capacitor.isNativePlatform()) {
    (async () => {
      try {
        const { toPng } = await import('html-to-image');
        const { default: jsPDF } = await import('jspdf');

        const dataUrl = await toPng(element, {
          cacheBust: true,
          style: { background: 'white' },
          pixelRatio: 2,
        });

        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const imgProps = pdf.getImageProperties(dataUrl);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        const dataUriString = pdf.output('datauristring');

        const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/gi, '_');
        await savePdf(dataUriString, `${safeTitle}.pdf`);
      } catch (err) {
        console.error('Native print/pdf failure:', err);
      }
    })();
    return true;
  }

  const contentHtml = element.innerHTML;
  const html = buildPrintHtml(contentHtml, title);

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }

  return printViaHiddenIframe(html, title);
}
