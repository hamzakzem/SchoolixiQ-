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
