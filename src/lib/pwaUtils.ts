import { UserRole } from '../types';

export const PWA_DESKTOP_DISMISS_KEY = 'schoolix_pwa_desktop_dismissed_at';
export const PWA_DISMISS_DAYS = 7;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
const installListeners = new Set<() => void>();

function notifyInstallListeners(): void {
  for (const listener of installListeners) {
    listener();
  }
}

export function initPwaInstallCapture(): void {
  if (typeof window === 'undefined' || (window as { __schoolixPwaInit?: boolean }).__schoolixPwaInit) {
    return;
  }
  (window as { __schoolixPwaInit?: boolean }).__schoolixPwaInit = true;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event as BeforeInstallPromptEvent;
    console.info('[PWA] INSTALL_PROMPT_AVAILABLE');
    notifyInstallListeners();
  });

  window.addEventListener('appinstalled', () => {
    console.info('[PWA] APP_INSTALLED');
    deferredInstallPrompt = null;
    notifyInstallListeners();
  });
}

export function subscribePwaInstallAvailability(listener: () => void): () => void {
  installListeners.add(listener);
  return () => installListeners.delete(listener);
}

export function getDeferredPwaInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredInstallPrompt;
}

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  const capacitor = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return (
    window.location.href.startsWith('capacitor:') ||
    window.location.href.startsWith('file:') ||
    capacitor?.isNativePlatform?.() === true
  );
}

export function isPwaStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function isPwaLaunchQuery(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('source') === 'pwa' || params.has('shortcut');
  } catch {
    return false;
  }
}

export function isDesktopPwaInstallContext(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (isCapacitorNative() || isPwaStandalone()) return false;
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return false;
  if (/iphone|ipad|ipod/i.test(ua)) return false;
  return true;
}

export function isPwaDesktopDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(PWA_DESKTOP_DISMISS_KEY);
  if (!raw) return false;
  const dismissedAt = Number(raw);
  if (!Number.isFinite(dismissedAt)) return false;
  const days = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
  return days < PWA_DISMISS_DAYS;
}

export function dismissPwaDesktopPrompt(): void {
  localStorage.setItem(PWA_DESKTOP_DISMISS_KEY, String(Date.now()));
}

const SCHOOL_ADMIN_INSTALL_ROLES = new Set<string>([
  UserRole.ADMIN,
  UserRole.STAFF,
  UserRole.ASSISTANT,
  UserRole.SCHOOL_ASSISTANT,
  'school_admin',
  UserRole.SUPERADMIN,
  UserRole.PLATFORM_ASSISTANT,
  'super_admin',
]);

export function canShowDesktopPwaInstall(role?: string | null): boolean {
  if (!role) return false;
  return SCHOOL_ADMIN_INSTALL_ROLES.has(role);
}

export function applyPwaStandaloneBodyClass(): void {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('pwa-standalone', isPwaStandalone());
}

export function getRoleDashboardLabel(role?: string | null): string {
  switch (role) {
    case UserRole.SUPERADMIN:
    case 'super_admin':
    case UserRole.PLATFORM_ASSISTANT:
    case 'platform_assistant':
      return 'super_admin';
    case UserRole.ADMIN:
    case UserRole.STAFF:
    case UserRole.ASSISTANT:
    case UserRole.SCHOOL_ASSISTANT:
    case 'school_assistant':
    case 'school_admin':
      return 'admin';
    case UserRole.TEACHER:
      return 'teacher';
    case UserRole.PARENT:
      return 'parent';
    case UserRole.GUARD:
    case 'guard':
      return 'guard';
    default:
      return 'unknown';
  }
}
