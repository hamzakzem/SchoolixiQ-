import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, getDocFromServer } from 'firebase/firestore';

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
  supportPhones: string[];
  supportEmails: string[];
  successPartners: {name: string, logoUrl: string}[];
  marketingTitle?: string;
  marketingSubtitle?: string;
  marketingFeatures?: MarketingFeature[];
  socialLinks?: SocialLinks;
}

const defaultSystemConfig: SystemConfig = {
  appName: 'SchoolixiQ',
  appLogo: '',
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
  }
};

const SystemConfigContext = createContext<{config: SystemConfig}>({ config: defaultSystemConfig });

export const SystemConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const [config, setConfig] = useState<SystemConfig>(defaultSystemConfig);

  useEffect(() => {
    const configRef = doc(db, 'system', 'config');
    
    // First try to load from cache/server so it's ready fast
    getDocFromServer(configRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        const appName = data.appName || 'SchoolixiQ';
        const appLogo = typeof data.appLogo !== 'undefined' ? data.appLogo : '';
        setConfig(prev => ({
          ...prev,
          ...data,
          appName: appName,
          appLogo: appLogo
        }));
        document.title = appName;
      }
    }).catch(e => console.error("System config initial fetch failed:", e));

    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const appName = data.appName || 'SchoolixiQ';
        const appLogo = typeof data.appLogo !== 'undefined' ? data.appLogo : '';
        setConfig({
          appName: appName,
          appLogo: appLogo,
          supportPhones: data.supportPhones || (data.supportPhone ? [data.supportPhone] : ['+964 770 000 0000']),
          supportEmails: data.supportEmails || (data.supportEmail ? [data.supportEmail] : ['support@schoolixiq.iq']),
          successPartners: data.successPartners || [],
          marketingTitle: data.marketingTitle || defaultSystemConfig.marketingTitle,
          marketingSubtitle: data.marketingSubtitle || defaultSystemConfig.marketingSubtitle,
          marketingFeatures: data.marketingFeatures || defaultSystemConfig.marketingFeatures
        });
        document.title = appName;
      }
    });

    return () => unsub();
  }, []);

  return (
    <SystemConfigContext.Provider value={{ config }}>
      {children}
    </SystemConfigContext.Provider>
  );
};

export const useSystemConfig = () => useContext(SystemConfigContext);
