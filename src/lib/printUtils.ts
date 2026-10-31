import { Capacitor } from '@capacitor/core';
import { saveElementAsPdf } from './pdfUtils';

/**
 * Opens the print window synchronously inside a tap/click handler. Safari (iPhone/iPad)
 * blocks window.open() that runs later (after a timeout or await), so callers that need
 * to re-render before printing open the window first and pass it to printElement.
 */
export function openPrintWindow(): Window | null {
  if (Capacitor.isNativePlatform()) return null;
  const win = window.open('', '_blank');
  if (win) {
    win.document.write('<html dir="rtl"><body style="font-family:system-ui;padding:40px;color:#0b2345">جاري تجهيز الصفحة للطباعة…</body></html>');
  }
  return win;
}

export function printElement(
  element: HTMLElement | null,
  title: string = 'طباعة',
  targetWindow?: Window | null,
) {
  if (!element) {
    targetWindow?.close();
    return false;
  }

  if (Capacitor.isNativePlatform()) {
    // The app's WebView cannot print: save a (multi-page) PDF instead
    const safeTitle = title.replace(/[^a-zA-Z0-9\u0600-\u06FF]/gi, '_');
    void saveElementAsPdf(element, `${safeTitle}.pdf`).catch((err) =>
      console.error('Native print/pdf failure:', err),
    );
    return true;
  }

  const printWindow = targetWindow && !targetWindow.closed ? targetWindow : window.open('', '_blank');
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
          /* The app stylesheet hides #print-mount on screen (it is the in-page print
             fallback); in this window it is the page itself, so show it as a preview. */
          #print-mount { display: block !important; }
          @media (max-width: 700px) { body { padding: 56px 8px 8px; } }
        </style>
      </head>
      <body>
        <div id="print-mount">
          ${contentHtml}
        </div>
        <div class="sx-print-toolbar">
          <button type="button" onclick="window.print()">طباعة / حفظ PDF</button>
          <button type="button" onclick="window.close()">إغلاق</button>
        </div>
        <style>
          .sx-print-toolbar { position: fixed; top: 12px; inset-inline-start: 12px; display: flex; gap: 8px; z-index: 10; }
          .sx-print-toolbar button { font: 700 14px system-ui, sans-serif; padding: 10px 16px; border-radius: 12px; border: 1px solid #cbd5e1; background: #fff; color: #0b2345; }
          .sx-print-toolbar button:first-child { background: #0b2345; color: #fff; border-color: #0b2345; }
          @media print { .sx-print-toolbar { display: none !important; } }
        </style>
        <script>
          // Wait for fonts and images, then open the print dialog. Phones (iOS/Android)
          // return from print() before the user acts, so the window is closed only after
          // printing on desktop; on phones the toolbar stays for a second try or to close.
          var isTouch = matchMedia('(pointer: coarse)').matches;
          window.onload = function () {
            var ready = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
            ready.then(function () {
              setTimeout(function () { window.focus(); window.print(); }, 350);
            });
          };
          if (!isTouch) {
            window.onafterprint = function () { setTimeout(function () { window.close(); }, 200); };
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
  return true;
}
