import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { toast } from 'react-hot-toast';

export async function savePdf(pdfDataUri: string, filename: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      // The dataUri for jsPDF will be formated like "data:application/pdf;filename=generated.pdf;base64,....."
      // or "data:application/pdf;base64,....."
      const base64Data = pdfDataUri.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid PDF data URI');
      }
      
      const fileNameWithExt = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
      
      const result = await Filesystem.writeFile({
        path: fileNameWithExt,
        data: base64Data,
        directory: Directory.Documents
      });
      
      toast.success(`تم حفظ ملف ${fileNameWithExt} في المستندات (Documents)`, { id: 'pdf-toast' });
      return true;
    } catch (e: any) {
      console.error('Error saving PDF natively:', e);
      toast.error('فشل حفظ ملف PDF في الجهاز', { id: 'pdf-toast' });
      return false;
    }
  } else {
    // For Web, usually jsPdf.save() takes care of it, but we can do a fallback standard anchor download
    try {
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return true;
    } catch (e) {
      console.error('Web PDF download failed:', e);
      return false;
    }
  }
}

/** 1×1 transparent PNG: stands in for an image that cannot be loaded (e.g. cross-origin). */
const IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

/**
 * Renders an element to an A4 PDF, adding pages when it is taller than one page,
 * and saves it (download on the web, Documents folder in the Android/iOS app).
 */
export async function saveElementAsPdf(element: HTMLElement, filename: string): Promise<boolean> {
  const { toJpeg } = await import('html-to-image');
  const { default: jsPDF } = await import('jspdf');

  // JPEG keeps a full-page report around 1 MB instead of ~10 MB as PNG (phones, slow links)
  const dataUrl = await toJpeg(element, {
    cacheBust: true,
    style: { background: 'white' },
    backgroundColor: '#ffffff',
    pixelRatio: 2,
    quality: 0.9,
    imagePlaceholder: IMAGE_PLACEHOLDER,
  });

  const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgProps = pdf.getImageProperties(dataUrl);
  const imgHeight = (imgProps.height * pageWidth) / imgProps.width;

  // Same image on every page, shifted up by one page height each time.
  let offset = 0;
  pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, imgHeight);
  while (imgHeight - offset > pageHeight + 1) {
    offset += pageHeight;
    pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', 0, -offset, pageWidth, imgHeight);
  }

  const name = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  if (Capacitor.isNativePlatform()) {
    return savePdf(pdf.output('datauristring'), name);
  }
  pdf.save(name);
  return true;
}
