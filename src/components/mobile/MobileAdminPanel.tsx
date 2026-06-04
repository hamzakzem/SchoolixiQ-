import type { ReactNode } from 'react';
import { useMobileMockupShell } from '../../lib/useMobileMockupShell';

/** Compact, navy-aligned layout for admin sub-pages inside the native app. */
export default function MobileAdminPanel({ children }: { children: ReactNode }) {
  const inApp = useMobileMockupShell();
  if (!inApp) return <>{children}</>;
  return (
    <div data-sq-mobile-panel className="sq-mobile-panel px-3 py-4 w-full max-w-full">
      {children}
    </div>
  );
}
