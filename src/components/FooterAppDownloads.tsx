import { FooterAndroidDownload } from './FooterAndroidDownload';

type Props = {
  appName?: string;
  compact?: boolean;
};

/** Android APK download only */
export function FooterAppDownloads({ appName, compact = false }: Props) {
  return <FooterAndroidDownload appName={appName} compact={compact} />;
}

export default FooterAppDownloads;
