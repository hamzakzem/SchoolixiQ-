import { FooterAndroidDownload } from './FooterAndroidDownload';
import { FooterIosDownload } from './FooterIosDownload';

type Props = {
  appName?: string;
  compact?: boolean;
};

/** Android APK + iOS App Store (Apple-compliant) */
export function FooterAppDownloads({ appName, compact = false }: Props) {
  if (compact) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
        <FooterAndroidDownload appName={appName} compact />
        <FooterIosDownload appName={appName} compact />
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
      <FooterAndroidDownload appName={appName} />
      <FooterIosDownload appName={appName} />
    </div>
  );
}

export default FooterAppDownloads;
