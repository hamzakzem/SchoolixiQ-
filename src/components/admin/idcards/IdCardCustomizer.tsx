import React, { useState } from 'react';
import {
  Save,
  LayoutTemplate,
  Palette,
  Type,
  Maximize,
  Settings2,
  Image as ImageIcon,
  UploadCloud,
  Layers,
  SlidersHorizontal,
  Droplets,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { IdCardTemplate } from '../../../types/idCardTemplate';
import IdCardFontSettings from './FontSettings';
import IdCardLayoutPicker from './IdCardLayoutPicker';
import StudentCard from './StudentCard';
import {
  COLOR_PRESETS,
  ELEMENT_TOGGLE_KEYS,
  ELEMENT_LABELS_AR,
  ELEMENT_LABELS_EN,
} from '../../../lib/idCardPresets';
import { uploadImageToServer } from '../../../lib/imageUtils';

type TabId = 'design' | 'elements' | 'photo' | 'colors' | 'fonts' | 'size' | 'watermark';

type Props = {
  template: IdCardTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<IdCardTemplate>>;
  isRtl: boolean;
  isSaving: boolean;
  onSave: () => void;
  mockStudent: Record<string, unknown>;
  mockCardData: Record<string, unknown>;
};

const TABS: { id: TabId; icon: React.ElementType; ar: string; en: string }[] = [
  { id: 'design', icon: LayoutTemplate, ar: 'التصميم', en: 'Design' },
  { id: 'elements', icon: Layers, ar: 'العناصر', en: 'Elements' },
  { id: 'photo', icon: ImageIcon, ar: 'الصورة', en: 'Photo' },
  { id: 'colors', icon: Palette, ar: 'الألوان', en: 'Colors' },
  { id: 'fonts', icon: Type, ar: 'الخطوط', en: 'Fonts' },
  { id: 'size', icon: Maximize, ar: 'الأبعاد', en: 'Size' },
  { id: 'watermark', icon: Droplets, ar: 'علامة مائية', en: 'Watermark' },
];

function SectionCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 p-4 sm:p-5">
      <h3 className="font-black text-sm text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Icon size={18} className="text-[#0B2345] dark:text-indigo-400" />
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function IdCardCustomizer({
  template,
  setTemplate,
  isRtl,
  isSaving,
  onSave,
  mockStudent,
  mockCardData,
}: Props) {
  const [tab, setTab] = useState<TabId>('design');
  const labels = isRtl ? ELEMENT_LABELS_AR : ELEMENT_LABELS_EN;

  const updateElement = (key: (typeof ELEMENT_TOGGLE_KEYS)[number], value: boolean) => {
    setTemplate((prev) => ({
      ...prev,
      elements: { ...prev.elements, [key]: value },
    }));
  };

  const updateColor = (key: keyof IdCardTemplate['colors'], value: string) => {
    setTemplate((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const colorLabelAr: Record<string, string> = {
    primary: 'اللون الرئيسي',
    secondary: 'اللون الثانوي',
    background: 'خلفية البطاقة',
    text: 'لون النص',
    border: 'الإطار',
    headerText: 'نص الترويسة',
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex-1 min-w-0 space-y-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900">
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Settings2 size={22} className="text-[#0B2345]" />
                {isRtl ? 'تخصيص الهوية المدرسية' : 'ID Card Studio'}
              </h2>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                {isRtl
                  ? 'صمّم هوية احترافية مع معاينة فورية'
                  : 'Professional ID design with live preview'}
              </p>
            </div>
            <button
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#0B2345] hover:bg-indigo-800 text-white rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Save size={18} />
              {isSaving ? (isRtl ? 'جاري الحفظ...' : 'Saving...') : isRtl ? 'حفظ القالب' : 'Save template'}
            </button>
          </div>

          <div className="flex gap-1 p-2 overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 scrollbar-thin">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  tab === t.id
                    ? 'bg-[#0B2345] text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                }`}
              >
                <t.icon size={14} />
                {isRtl ? t.ar : t.en}
              </button>
            ))}
          </div>

          <div className="p-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {tab === 'design' && (
              <SectionCard title={isRtl ? 'شكل الهوية والتصميم' : 'Layout & design'} icon={LayoutTemplate}>
                <IdCardLayoutPicker
                  value={template.layout}
                  onChange={(id) => setTemplate((p) => ({ ...p, layout: id }))}
                  isRtl={isRtl}
                />
              </SectionCard>
            )}

            {tab === 'elements' && (
              <SectionCard title={isRtl ? 'العناصر المعروضة' : 'Displayed elements'} icon={Layers}>
                <div className="flex flex-wrap gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((p) => ({
                        ...p,
                        elements: Object.fromEntries(
                          ELEMENT_TOGGLE_KEYS.map((k) => [k, true]),
                        ) as IdCardTemplate['elements'],
                      }))
                    }
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {isRtl ? 'تحديد الكل' : 'Select all'}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTemplate((p) => ({
                        ...p,
                        elements: {
                          ...p.elements,
                          schoolLogo: true,
                          studentPhoto: true,
                          qrCode: true,
                          className: true,
                          expiryDate: true,
                        },
                      }))
                    }
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200"
                  >
                    {isRtl ? 'الأساسيات فقط' : 'Essentials only'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {ELEMENT_TOGGLE_KEYS.map((key) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-700 cursor-pointer hover:border-indigo-300 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!template.elements[key]}
                        onChange={(e) => updateElement(key, e.target.checked)}
                        className="w-4 h-4 rounded text-[#0B2345] focus:ring-indigo-500"
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {labels[key] || key}
                      </span>
                    </label>
                  ))}
                </div>
              </SectionCard>
            )}

            {tab === 'photo' && template.elements.studentPhoto && (
              <SectionCard title={isRtl ? 'إعدادات صورة الطالب' : 'Student photo'} icon={SlidersHorizontal}>
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-2">
                      {isRtl ? 'شكل الصورة' : 'Shape'}
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {(['rounded', 'circle', 'square', 'portrait'] as const).map((shape) => (
                        <button
                          key={shape}
                          type="button"
                          onClick={() =>
                            setTemplate((p) => ({
                              ...p,
                              photoSettings: { ...p.photoSettings, shape },
                            }))
                          }
                          className={`px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                            (template.photoSettings?.shape || 'rounded') === shape
                              ? 'border-[#0B2345] bg-indigo-50 text-[#0B2345]'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {shape}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600">
                        {isRtl ? 'العرض %' : 'Width %'}
                      </label>
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={template.photoSettings?.width ?? 44}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            photoSettings: { ...p.photoSettings, width: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#0B2345]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">
                        {isRtl ? 'الارتفاع %' : 'Height %'}
                      </label>
                      <input
                        type="range"
                        min={20}
                        max={80}
                        value={template.photoSettings?.height ?? 48}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            photoSettings: { ...p.photoSettings, height: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#0B2345]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        {isRtl ? 'الاحتواء' : 'Fit'}
                      </label>
                      <select
                        value={template.photoSettings?.fitMode || 'cover'}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            photoSettings: {
                              ...p.photoSettings,
                              fitMode: e.target.value as IdCardTemplate['photoSettings']['fitMode'],
                            },
                          }))
                        }
                        className="w-full text-xs p-2.5 border rounded-xl bg-white"
                      >
                        <option value="cover">{isRtl ? 'تغطية' : 'Cover'}</option>
                        <option value="contain">{isRtl ? 'احتواء' : 'Contain'}</option>
                        <option value="fill">{isRtl ? 'ملء' : 'Fill'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        {isRtl ? 'إطار' : 'Frame'}
                      </label>
                      <select
                        value={template.photoSettings?.frameStyle || 'modern'}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            photoSettings: {
                              ...p.photoSettings,
                              frameStyle: e.target.value as NonNullable<
                                IdCardTemplate['photoSettings']
                              >['frameStyle'],
                            },
                          }))
                        }
                        className="w-full text-xs p-2.5 border rounded-xl bg-white"
                      >
                        <option value="none">{isRtl ? 'بدون' : 'None'}</option>
                        <option value="modern">{isRtl ? 'عصري' : 'Modern'}</option>
                        <option value="premium">{isRtl ? 'فاخر' : 'Premium'}</option>
                        <option value="minimal">{isRtl ? 'بسيط' : 'Minimal'}</option>
                        <option value="branded">{isRtl ? 'علامة' : 'Branded'}</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 block mb-1">
                        {isRtl ? 'سمك الإطار' : 'Border'}
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={6}
                        value={template.photoSettings?.borderThickness ?? 2}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            photoSettings: {
                              ...p.photoSettings,
                              borderThickness: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-full accent-[#0B2345]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 block mb-1">
                      {isRtl ? 'لون الإطار' : 'Border color'}
                    </label>
                    <input
                      type="color"
                      value={template.photoSettings?.borderColor || '#ffffff'}
                      onChange={(e) =>
                        setTemplate((p) => ({
                          ...p,
                          photoSettings: { ...p.photoSettings, borderColor: e.target.value },
                        }))
                      }
                      className="w-full h-10 rounded-xl cursor-pointer border-0"
                    />
                  </div>
                </div>
              </SectionCard>
            )}

            {tab === 'photo' && !template.elements.studentPhoto && (
              <p className="text-sm text-slate-500 text-center py-8">
                {isRtl ? 'فعّل «صورة الطالب» من تبويب العناصر' : 'Enable Student Photo in Elements tab'}
              </p>
            )}

            {tab === 'colors' && (
              <SectionCard title={isRtl ? 'ألوان الهوية' : 'Card colors'} icon={Palette}>
                <div className="flex flex-wrap gap-2 mb-4">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.nameAr}
                      type="button"
                      onClick={() => setTemplate((p) => ({ ...p, colors: { ...preset.colors } }))}
                      className="px-3 py-1.5 rounded-full text-[10px] font-bold border border-slate-200 hover:border-[#0B2345] transition-colors"
                      style={{
                        background: `linear-gradient(90deg, ${preset.colors.primary}, ${preset.colors.secondary})`,
                        color: '#fff',
                      }}
                    >
                      {preset.nameAr}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {(Object.keys(template.colors) as (keyof IdCardTemplate['colors'])[]).map((key) => (
                    <div key={key} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">
                        {isRtl ? colorLabelAr[key] || key : key}
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="color"
                          value={template.colors[key] || '#000000'}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0"
                        />
                        <input
                          type="text"
                          value={template.colors[key] || ''}
                          onChange={(e) => updateColor(key, e.target.value)}
                          className="flex-1 text-[10px] p-1.5 border rounded-lg font-mono uppercase"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            {tab === 'fonts' && <IdCardFontSettings template={template} setTemplate={setTemplate} isRtl={isRtl} />}

            {tab === 'size' && (
              <SectionCard title={isRtl ? 'أبعاد الهوية (ملم)' : 'Dimensions (mm)'} icon={Maximize}>
                <select
                  value={template.size}
                  onChange={(e) =>
                    setTemplate((p) => ({ ...p, size: e.target.value as IdCardTemplate['size'] }))
                  }
                  className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold mb-4"
                >
                  <option value="pvc">{isRtl ? 'PVC (54×86)' : 'PVC (54×86)'}</option>
                  <option value="pocket">{isRtl ? 'جيب (60×90)' : 'Pocket (60×90)'}</option>
                  <option value="hanging">{isRtl ? 'تعليق (70×100)' : 'Hanging (70×100)'}</option>
                  <option value="custom">{isRtl ? 'مخصص' : 'Custom'}</option>
                </select>
                {template.size === 'custom' && (
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500">{isRtl ? 'العرض' : 'Width'}</label>
                      <input
                        type="number"
                        value={template.customSize?.width ?? 54}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            customSize: { ...p.customSize!, width: Number(e.target.value) },
                          }))
                        }
                        className="w-full p-2 border rounded-xl text-center font-bold mt-1"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-slate-500">{isRtl ? 'الارتفاع' : 'Height'}</label>
                      <input
                        type="number"
                        value={template.customSize?.height ?? 86}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            customSize: { ...p.customSize!, height: Number(e.target.value) },
                          }))
                        }
                        className="w-full p-2 border rounded-xl text-center font-bold mt-1"
                      />
                    </div>
                  </div>
                )}
              </SectionCard>
            )}

            {tab === 'watermark' && (
              <SectionCard title={isRtl ? 'العلامة المائية' : 'Watermark'} icon={Droplets}>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                      {isRtl ? 'نص العلامة المائية' : 'Watermark text'}
                    </label>
                    <input
                      type="text"
                      value={template.background.watermarkText || ''}
                      onChange={(e) =>
                        setTemplate((p) => ({
                          ...p,
                          background: { ...p.background, watermarkText: e.target.value, type: 'watermark' },
                        }))
                      }
                      className="w-full p-3 border rounded-xl text-sm"
                      placeholder={isRtl ? 'اسم المدرسة...' : 'School name...'}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                      {isRtl ? 'رفع صورة العلامة المائية' : 'Watermark image'}
                    </label>
                    <label className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <UploadCloud size={18} className="text-[#0B2345]" />
                      <span className="text-sm font-bold">{isRtl ? 'اختر صورة' : 'Upload image'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const url = await uploadImageToServer(file, 'watermarks');
                            setTemplate((p) => ({
                              ...p,
                              background: { ...p.background, imageUrl: url, type: 'watermark' },
                            }));
                            toast.success(isRtl ? 'تم الرفع' : 'Uploaded');
                          } catch {
                            toast.error(isRtl ? 'فشل الرفع' : 'Upload failed');
                          }
                        }}
                      />
                    </label>
                    {template.background.imageUrl && (
                      <button
                        type="button"
                        onClick={() =>
                          setTemplate((p) => ({
                            ...p,
                            background: { ...p.background, imageUrl: '', type: 'solid' },
                          }))
                        }
                        className="mt-2 text-xs font-bold text-red-600"
                      >
                        {isRtl ? 'إزالة الصورة' : 'Remove image'}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-600">
                        {isRtl ? 'الشفافية' : 'Opacity'} ({Math.round((template.background.watermarkOpacity ?? 0.12) * 100)}%)
                      </label>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={template.background.watermarkOpacity ?? 0.12}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            background: { ...p.background, watermarkOpacity: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#0B2345]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600">
                        {isRtl ? 'حجم العلامة %' : 'Scale %'}
                      </label>
                      <input
                        type="range"
                        min={20}
                        max={120}
                        value={template.background.watermarkScale ?? 80}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            background: { ...p.background, watermarkScale: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#0B2345]"
                      />
                    </div>
                  </div>
                </div>
              </SectionCard>
            )}
          </div>
        </div>
      </div>

      <div className="w-full xl:w-[380px] shrink-0 xl:sticky xl:top-4 self-start">
        <div className="bg-gradient-to-br from-slate-100 to-slate-200/80 dark:from-slate-900 dark:to-slate-950 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-inner min-h-[420px] flex flex-col items-center justify-center">
          <span className="self-start mb-4 bg-white/90 dark:bg-slate-800 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isRtl ? 'معاينة حية' : 'Live preview'}
          </span>
          <div
            className="id-card-preview-host shrink-0"
            style={{
              width: Math.round((template.size === 'custom' ? template.customSize?.width ?? 54 : 54) * 3.78),
              height: Math.round(
                (template.size === 'hanging'
                  ? 100
                  : template.size === 'pocket'
                    ? 90
                    : template.size === 'custom'
                      ? template.customSize?.height ?? 86
                      : 85.6) * 3.78,
              ),
            }}
          >
            <StudentCard
              student={mockStudent}
              cardData={mockCardData}
              isRtl={isRtl}
              template={template}
              previewMode
            />
          </div>
        </div>
      </div>
    </div>
  );
}
