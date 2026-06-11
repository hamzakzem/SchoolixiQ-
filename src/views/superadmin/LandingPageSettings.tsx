import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Save, Plus, Trash2, RefreshCw, Eye } from 'lucide-react';
import {
  DEFAULT_LANDING_PAGE_CONFIG,
  fetchLandingPageConfig,
  saveLandingPageConfig,
  type LandingPageConfig,
  type LandingFaqItem,
  type LandingTestimonial,
  type LandingFeatureCard,
} from '../../lib/landingPageConfig';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';

function uid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function LandingPageSettings() {
  const [config, setConfig] = useState<LandingPageConfig>(DEFAULT_LANDING_PAGE_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchLandingPageConfig();
      setConfig(data);
    } catch (error) {
      handleFirestoreError(error, OperationType.READ, 'system/landingPage');
      toast.error('تعذر تحميل إعدادات صفحة الهبوط');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const toastId = toast.loading('جاري حفظ إعدادات صفحة الهبوط...');
    try {
      await saveLandingPageConfig(config);
      toast.success('تم حفظ إعدادات صفحة الهبوط بنجاح', { id: toastId });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'system/landingPage');
      toast.error('فشل حفظ الإعدادات', { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  const updateStringList = (key: 'problemPoints' | 'solutionPoints', index: number, value: string) => {
    const list = [...config[key]];
    list[index] = value;
    setConfig({ ...config, [key]: list });
  };

  const addStringListItem = (key: 'problemPoints' | 'solutionPoints') => {
    setConfig({ ...config, [key]: [...config[key], ''] });
  };

  const removeStringListItem = (key: 'problemPoints' | 'solutionPoints', index: number) => {
    setConfig({ ...config, [key]: config[key].filter((_, i) => i !== index) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">إعدادات صفحة الهبوط</h2>
          <p className="text-slate-500 text-sm mt-1">تحكم بمحتوى الصفحة التسويقية العامة — التحديثات تظهر فوراً دون نشر.</p>
        </div>
        <div className="flex gap-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Eye size={16} />
            معاينة
          </a>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </div>
      </div>

      {/* Toggles */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="font-black text-lg">التفعيل والأقسام</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {(
            [
              ['landingEnabled', 'تفعيل صفحة الهبوط للزوار'],
              ['showPricing', 'عرض قسم الباقات'],
              ['showTestimonials', 'عرض آراء العملاء'],
              ['showFaq', 'عرض الأسئلة الشائعة'],
              ['showAppDownload', 'عرض قسم تحميل التطبيق'],
              ['showPartners', 'عرض الشركاء في التذييل'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer font-bold text-sm">
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                className="w-5 h-5 rounded"
              />
              {label}
            </label>
          ))}
        </div>
      </section>

      {/* Hero */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="font-black text-lg">قسم البطل (Hero)</h3>
        {(
          [
            ['heroTitle', 'العنوان الرئيسي'],
            ['heroSubtitle', 'العنوان الفرعي'],
            ['heroBadgeText', 'نص الشارة'],
            ['primaryCtaLabel', 'زر البدء'],
            ['secondaryCtaLabel', 'زر تسجيل الدخول'],
            ['heroImageUrl', 'رابط صورة البطل (اختياري)'],
            ['footerMarketingText', 'نص تسويقي في التذييل'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-bold mb-1 text-slate-600 dark:text-slate-400">{label}</label>
            {key === 'heroSubtitle' || key === 'footerMarketingText' ? (
              <textarea
                value={config[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                rows={3}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 font-medium"
              />
            ) : (
              <input
                value={config[key]}
                onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-3 font-medium"
              />
            )}
          </div>
        ))}
      </section>

      {/* Problem / Solution lists */}
      {(['problemPoints', 'solutionPoints'] as const).map((key) => (
        <section key={key} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg">{key === 'problemPoints' ? 'نقاط المشكلة' : 'نقاط الحل'}</h3>
            <button type="button" onClick={() => addStringListItem(key)} className="text-blue-600 font-bold text-sm flex items-center gap-1">
              <Plus size={16} /> إضافة
            </button>
          </div>
          {config[key].map((item, index) => (
            <div key={`${key}-${index}`} className="flex gap-2">
              <input
                value={item}
                onChange={(e) => updateStringList(key, index, e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-2"
              />
              <button type="button" onClick={() => removeStringListItem(key, index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </section>
      ))}

      {/* Smart gate & parent app */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <h3 className="font-black text-lg">أقسام مميزة</h3>
        {(
          [
            ['smartGateTitle', 'عنوان البوابة الذكية'],
            ['smartGateDescription', 'وصف البوابة الذكية'],
            ['parentAppTitle', 'عنوان تطبيق ولي الأمر'],
            ['parentAppDescription', 'وصف تطبيق ولي الأمر'],
          ] as const
        ).map(([key, label]) => (
          <div key={key}>
            <label className="block text-sm font-bold mb-1">{label}</label>
            <textarea
              value={config[key]}
              onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
              rows={key.includes('Description') ? 3 : 2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4 py-3"
            />
          </div>
        ))}
      </section>

      {/* Feature cards */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-black text-lg">بطاقات المميزات</h3>
          <button
            type="button"
            onClick={() =>
              setConfig({
                ...config,
                featureCards: [
                  ...config.featureCards,
                  { id: uid(), title: '', description: '' },
                ],
              })
            }
            className="text-blue-600 font-bold text-sm flex items-center gap-1"
          >
            <Plus size={16} /> بطاقة
          </button>
        </div>
        {config.featureCards.map((card, index) => (
          <div key={card.id} className="grid sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <input
              placeholder="العنوان"
              value={card.title}
              onChange={(e) => {
                const cards = [...config.featureCards];
                cards[index] = { ...card, title: e.target.value };
                setConfig({ ...config, featureCards: cards });
              }}
              className="rounded-lg border px-3 py-2"
            />
            <input
              placeholder="الوصف"
              value={card.description}
              onChange={(e) => {
                const cards = [...config.featureCards];
                cards[index] = { ...card, description: e.target.value };
                setConfig({ ...config, featureCards: cards });
              }}
              className="sm:col-span-2 rounded-lg border px-3 py-2"
            />
            <button
              type="button"
              onClick={() =>
                setConfig({
                  ...config,
                  featureCards: config.featureCards.filter((_, i) => i !== index),
                })
              }
              className="text-red-500 text-sm font-bold"
            >
              حذف
            </button>
          </div>
        ))}
      </section>

      {/* Testimonials */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex justify-between">
          <h3 className="font-black text-lg">آراء العملاء</h3>
          <button
            type="button"
            onClick={() =>
              setConfig({
                ...config,
                testimonials: [
                  ...config.testimonials,
                  { id: uid(), name: '', role: '', quote: '' },
                ],
              })
            }
            className="text-blue-600 font-bold text-sm"
          >
            + إضافة
          </button>
        </div>
        {config.testimonials.map((t, index) => (
          <div key={t.id} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <input placeholder="الاسم" value={t.name} onChange={(e) => {
              const list = [...config.testimonials];
              list[index] = { ...t, name: e.target.value };
              setConfig({ ...config, testimonials: list });
            }} className="w-full rounded-lg border px-3 py-2" />
            <input placeholder="الدور / المدرسة" value={t.role} onChange={(e) => {
              const list = [...config.testimonials];
              list[index] = { ...t, role: e.target.value };
              setConfig({ ...config, testimonials: list });
            }} className="w-full rounded-lg border px-3 py-2" />
            <textarea placeholder="الاقتباس" value={t.quote} onChange={(e) => {
              const list = [...config.testimonials];
              list[index] = { ...t, quote: e.target.value };
              setConfig({ ...config, testimonials: list });
            }} rows={2} className="w-full rounded-lg border px-3 py-2" />
            <button type="button" onClick={() => setConfig({ ...config, testimonials: config.testimonials.filter((_, i) => i !== index) })} className="text-red-500 text-sm">حذف</button>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
        <div className="flex justify-between">
          <h3 className="font-black text-lg">الأسئلة الشائعة</h3>
          <button
            type="button"
            onClick={() =>
              setConfig({
                ...config,
                faq: [...config.faq, { id: uid(), question: '', answer: '' }],
              })
            }
            className="text-blue-600 font-bold text-sm"
          >
            + سؤال
          </button>
        </div>
        {config.faq.map((item, index) => (
          <div key={item.id} className="space-y-2 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <input placeholder="السؤال" value={item.question} onChange={(e) => {
              const list = [...config.faq];
              list[index] = { ...item, question: e.target.value };
              setConfig({ ...config, faq: list });
            }} className="w-full rounded-lg border px-3 py-2" />
            <textarea placeholder="الإجابة" value={item.answer} onChange={(e) => {
              const list = [...config.faq];
              list[index] = { ...item, answer: e.target.value };
              setConfig({ ...config, faq: list });
            }} rows={2} className="w-full rounded-lg border px-3 py-2" />
            <button type="button" onClick={() => setConfig({ ...config, faq: config.faq.filter((_, i) => i !== index) })} className="text-red-500 text-sm">حذف</button>
          </div>
        ))}
      </section>
    </div>
  );
}
