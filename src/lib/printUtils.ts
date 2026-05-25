export function printElement(element: HTMLElement | null, title: string = 'طباعة') {
  if (!element) return;

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
