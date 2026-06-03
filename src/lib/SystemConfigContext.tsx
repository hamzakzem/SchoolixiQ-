import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, getDocFromServer } from 'firebase/firestore';
import { BRAND_THEME_COLOR } from './brandAssets';
import { BRAND_LOGO_URL, resolveAppLogo } from './resolveBrandLogo';

interface MarketingFeature {
  title: string;
  description: string;
}

interface SocialLinks {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  whatsapp?: string;
}

interface SystemConfig {
  appName: string;
  appLogo?: string;
  /** Direct link to Android APK (Firebase Storage, CDN, or /downloads/schoolixiq.apk) */
  androidApkUrl?: string;
  supportPhones: string[];
  supportEmails: string[];
  successPartners: {name: string, logoUrl: string}[];
  marketingTitle?: string;
  marketingSubtitle?: string;
  marketingFeatures?: MarketingFeature[];
  socialLinks?: SocialLinks;
  promotionalBanners?: { id: string; imageUrl: string; active: boolean; link?: string }[];
}

const defaultSystemConfig: SystemConfig = {
  appName: 'SchoolixiQ',
  appLogo: BRAND_LOGO_URL,
  androidApkUrl: 'https://schoolixiq.com/downloads/schoolixiq.apk',
  supportPhones: ['+964 770 000 0000'],
  supportEmails: ['support@schoolixiq.iq'],
  successPartners: [],
  marketingTitle: 'منصة الإدارة والتحصيل الذكي لمدارس العراق الأهلية',
  marketingSubtitle: 'نظام متكامل يربط الإدارة والمعلمين وأولياء الأمور لتسهيل جباية الأقساط، تتبع الغيابات ومراقبة النتائج بمرونة تامة ونظام إشعارات ذكي.',
  marketingFeatures: [
    {
      title: 'متابعة الأقساط الذكية',
      description: 'لوحة تحكم تفصيلية لمتابعة الأقساط والتحصيل اليومي وجدولة دفعات الطلاب تلقائياً حسب الصفوف.'
    },
    {
      title: 'ربط متكامل مع أولياء الأمور',
      description: 'واجهة خاصة بولي الأمر يتيح له متابعة غيابات أبنائه، نتائجهم الدراسية، وتواريخ سداد الأقساط بدقة.'
    },
    {
      title: 'إنذارات ونظام تذكير متطور',
      description: 'نظام تذكير فوري وتلقائي لإعلام أولياء الأمور بالدفعات المستحقة والمتأخرة عبر الوسائل المتاحة لتجنب تراكم المبالغ.'
    },
    {
      title: 'إحصائيات وتقارير تفاعلية',
      description: 'تقارير مالية وإدارية ذكية تدعم اتخاذ القرار وتوفر لك رؤية فورية عن الديون، المتحصلات، والموازنة السنوية.'
    }
  ],
  socialLinks: {
    instagram: '',
    twitter: '',
    linkedin: '',
    whatsapp: ''
  },
  promotionalBanners: []
};

const SystemConfigContext = createContext<{config: SystemConfig}>({ config: defaultSystemConfig });

export const SystemConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<SystemConfig>(() => {
    try {
      const cached = localStorage.getItem('schoolixiq_system_config');
      if (cached) {
        const parsed = JSON.parse(cached) as SystemConfig;
        return {
          ...defaultSystemConfig,
          ...parsed,
          appLogo: resolveAppLogo(parsed.appLogo),
        };
      }
    } catch (e) {
      console.warn("Error reading cached system config:", e);
    }
    return defaultSystemConfig;
  });

  useEffect(() => {
    const configRef = doc(db, 'system', 'config');
    
    // First try to load from cache/server so it's ready fast
    getDocFromServer(configRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        const appName = data.appName || 'SchoolixiQ';
        const appLogo = resolveAppLogo(
          typeof data.appLogo === 'string' ? data.appLogo : undefined,
        );
        const updatedConfig = {
          ...defaultSystemConfig,
          ...data,
          appName: appName,
          appLogo: appLogo,
          androidApkUrl:
            typeof data.androidApkUrl === 'string' && data.androidApkUrl.trim()
              ? data.androidApkUrl.trim()
              : defaultSystemConfig.androidApkUrl,
        };
        setConfig(updatedConfig);
        try {
          localStorage.setItem('schoolixiq_system_config', JSON.stringify(updatedConfig));
        } catch (e) {
          console.warn("Failed to update cache on getDoc:", e);
        }
        document.title = appName;
      }
    }).catch(e => console.error("System config initial fetch failed:", e));

    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const appName = data.appName || 'SchoolixiQ';
        const appLogo = resolveAppLogo(
          typeof data.appLogo === 'string' ? data.appLogo : undefined,
        );
        const newConfig = {
          appName: appName,
          appLogo: appLogo,
          androidApkUrl:
            typeof data.androidApkUrl === 'string' && data.androidApkUrl.trim()
              ? data.androidApkUrl.trim()
              : defaultSystemConfig.androidApkUrl,
          supportPhones: data.supportPhones || (data.supportPhone ? [data.supportPhone] : ['+964 770 000 0000']),
          supportEmails: data.supportEmails || (data.supportEmail ? [data.supportEmail] : ['support@schoolixiq.iq']),
          successPartners: data.successPartners || [],
          marketingTitle: data.marketingTitle || defaultSystemConfig.marketingTitle,
          marketingSubtitle: data.marketingSubtitle || defaultSystemConfig.marketingSubtitle,
          marketingFeatures: data.marketingFeatures || defaultSystemConfig.marketingFeatures
        };
        setConfig(newConfig);
        try {
          localStorage.setItem('schoolixiq_system_config', JSON.stringify(newConfig));
        } catch (e) {
          console.warn("Failed to cache system config on snapshot:", e);
        }
        document.title = appName;
      }
    }, (error) => {
      console.warn("System config real-time listener failed, falling back to local/cached state:", error);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (config.appName) {
      document.title = config.appName;
    }
    const updateFavicon = () => {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      const faviconSrc = resolveAppLogo(config.appLogo);
      link.type = 'image/png';
      link.href = faviconSrc;

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.getElementsByTagName('head')[0].appendChild(appleLink);
      }
      appleLink.href = faviconSrc;

      const themeMeta =
        document.querySelector('meta[name="theme-color"]') ||
        (() => {
          const m = document.createElement('meta');
          m.setAttribute('name', 'theme-color');
          document.head.appendChild(m);
          return m;
        })();
      themeMeta.setAttribute('content', BRAND_THEME_COLOR);
    };
    updateFavicon();
  }, [config.appLogo, config.appName]);

  return (
    <SystemConfigContext.Provider value={{ config }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => useContext(SystemConfigContext);
