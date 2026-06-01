import React, { useState } from 'react';
import { IdCardTemplate, TextStyle, CustomFont } from '../../../types/idCardTemplate';
import { Type, UploadCloud, Plus, Trash2 } from 'lucide-react';
import { uploadImageToServer } from '../../../lib/imageUtils'; // We can use it for fonts too since it returns a server URL, or a base64, but wait. imageUtils does compressImageToBase64, maybe we shouldn't use it for fonts.

interface FontSettingsProps {
  template: IdCardTemplate;
  setTemplate: React.Dispatch<React.SetStateAction<IdCardTemplate>>;
  isRtl: boolean;
}

const ARABIC_FONTS = [
  "Cairo", "Tajawal", "IBM Plex Sans Arabic", "Noto Sans Arabic", "Almarai", "Changa"
];
const ENGLISH_FONTS = [
  "Inter", "Poppins", "Roboto", "Open Sans", "Montserrat", "Noto Sans"
];

export default function IdCardFontSettings({ template, setTemplate, isRtl }: FontSettingsProps) {
  const [activeTab, setActiveTab] = useState<'global' | 'elements' | 'custom'>('global');

  const updateGlobalFont = (field: keyof IdCardTemplate['fonts'], value: any) => {
    setTemplate(prev => ({
      ...prev,
      fonts: { ...prev.fonts, [field]: value }
    }));
  };

  const updateElementFont = (element: keyof Omit<IdCardTemplate['fonts'], 'family'|'size'|'weight'|'customFonts'>, field: keyof TextStyle, value: any) => {
    setTemplate(prev => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [element]: {
          ...(prev.fonts[element] || {}),
          [field]: value
        }
      }
    }));
  };

  const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const newFont: CustomFont = {
        name: file.name.split('.')[0].replace(/[^a-zA-Z0-9]/g, ' '),
        url: result,
        format: file.name.split('.').pop() || 'ttf'
      };
      
      setTemplate(prev => ({
        ...prev,
        fonts: {
          ...prev.fonts,
          customFonts: [...(prev.fonts.customFonts || []), newFont]
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeCustomFont = (index: number) => {
    setTemplate(prev => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        customFonts: prev.fonts.customFonts?.filter((_, i) => i !== index)
      }
    }));
  };

  const allAvailableFonts = [
    ...ENGLISH_FONTS,
    ...ARABIC_FONTS,
    ...(template.fonts.customFonts?.map(f => f.name) || [])
  ];

  const renderFontSelectors = (familyVal: string, weightVal: string, onFamilyChange: (v: string) => void, onWeightChange: (v: string) => void) => (
    <div className="flex gap-4 items-center">
      <div className="flex-1">
        <label className="text-xs font-bold text-slate-500 mb-1 block">{isRtl ? "الخط" : "Font Family"}</label>
        <select
          value={familyVal}
          onChange={(e) => onFamilyChange(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <optgroup label={isRtl ? "الخطوط الإنجليزية" : "English Fonts"}>
            {ENGLISH_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </optgroup>
          <optgroup label={isRtl ? "الخطوط العربية" : "Arabic Fonts"}>
            {ARABIC_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
          </optgroup>
          {template.fonts.customFonts && template.fonts.customFonts.length > 0 && (
            <optgroup label={isRtl ? "خطوط مخصصة" : "Custom Fonts"}>
              {template.fonts.customFonts.map(f => <option key={f.name} value={f.name}>{f.name}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      <div className="w-1/3">
        <label className="text-xs font-bold text-slate-500 mb-1 block">{isRtl ? "وزن الخط" : "Weight"}</label>
        <select
          value={weightVal}
          onChange={(e) => onWeightChange(e.target.value)}
          className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
        >
          <option value="light">Light</option>
          <option value="normal">Normal</option>
          <option value="medium">Medium</option>
          <option value="semibold">SemiBold</option>
          <option value="bold">Bold</option>
          <option value="black">Black</option>
        </select>
      </div>
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm overflow-hidden mt-4">
      <h3 className="text-lg font-black mb-4 flex items-center gap-2">
        <Type className="text-[#0B2345]" />
        {isRtl ? "إعدادات الخطوط والطباعة" : "Advanced Typography System"}
      </h3>

      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab('global')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'global' ? 'border-indigo-600 text-[#0B2345]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {isRtl ? "الخط الأساسي" : "Global Font"}
        </button>
        <button
          onClick={() => setActiveTab('elements')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'elements' ? 'border-indigo-600 text-[#0B2345]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {isRtl ? "خطوط العناصر" : "Element Fonts"}
        </button>
        <button
          onClick={() => setActiveTab('custom')}
          className={`pb-3 px-4 text-sm font-bold transition-all border-b-2 ${activeTab === 'custom' ? 'border-indigo-600 text-[#0B2345]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          {isRtl ? "رفع خط مخصص" : "Custom Fonts"}
        </button>
      </div>

      <div className="space-y-4">
        {activeTab === 'global' && (
          <div className="space-y-4">
            {renderFontSelectors(
              template.fonts.family || 'Inter',
              template.fonts.weight || 'normal',
              (v) => updateGlobalFont('family', v),
              (v) => updateGlobalFont('weight', v)
            )}
            <div>
               <label className="text-xs font-bold text-slate-500 mb-1 block">{isRtl ? "حجم الخط الأساسي" : "Base Size"}</label>
               <select
                 value={template.fonts.size || 'medium'}
                 onChange={(e) => updateGlobalFont('size', e.target.value)}
                 className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
               >
                 <option value="small">Small</option>
                 <option value="medium">Medium</option>
                 <option value="large">Large</option>
               </select>
            </div>
            <p className="text-xs text-slate-400">
              {isRtl ? "يتم تطبيق هذا الخط على جميع نصوص الهوية ما لم يتم تخصيص خط لكل عنصر." : "This font will be applied to all ID elements unless explicitly overridden."}
            </p>
          </div>
        )}

        {activeTab === 'elements' && (
          <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2">
            {[
              { key: 'schoolName', label: isRtl ? "اسم المدرسة" : "School Name" },
              { key: 'studentName', label: isRtl ? "اسم الطالب" : "Student Name" },
              { key: 'cardTitle', label: isRtl ? "العنوان/البيانات الأساسية" : "Card Title/Main Data" },
              { key: 'contactInfo', label: isRtl ? "معلومات الاتصال" : "Contact Information" },
              { key: 'qrInfo', label: isRtl ? "بيانات QR" : "QR Information" },
              { key: 'barcodeInfo', label: isRtl ? "بيانات الباركود" : "Barcode Information" },
            ].map(el => (
              <div key={el.key} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h4 className="font-bold text-sm mb-3">{el.label}</h4>
                {renderFontSelectors(
                  (template.fonts as any)[el.key]?.family || template.fonts.family,
                  (template.fonts as any)[el.key]?.weight || template.fonts.weight,
                  (v) => updateElementFont(el.key as any, 'family', v),
                  (v) => updateElementFont(el.key as any, 'weight', v)
                )}
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isRtl ? "الحجم (px)" : "Size (px)"}</label>
                    <input 
                      type="number" 
                      value={(template.fonts as any)[el.key]?.size || ''}
                      onChange={(e) => updateElementFont(el.key as any, 'size', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Auto"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isRtl ? "التباعد" : "Spacing"}</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={(template.fonts as any)[el.key]?.letterSpacing || ''}
                      onChange={(e) => updateElementFont(el.key as any, 'letterSpacing', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isRtl ? "طول السطر" : "Line Height"}</label>
                    <input 
                      type="number" 
                      step="0.1"
                      value={(template.fonts as any)[el.key]?.lineHeight || ''}
                      onChange={(e) => updateElementFont(el.key as any, 'lineHeight', Number(e.target.value))}
                      className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                      placeholder="Normal"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'custom' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 relative group">
              <input 
                type="file" 
                accept=".ttf,.otf,.woff,.woff2"
                onChange={handleFontUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud size={32} className="text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-bold text-slate-700">{isRtl ? "اضغط لرفع خط" : "Click to Upload Font"}</p>
              <p className="text-xs text-slate-500">{isRtl ? "صيغ مدعومة: TTF, OTF, WOFF, WOFF2" : "Supported: TTF, OTF, WOFF, WOFF2"}</p>
            </div>

            {template.fonts.customFonts && template.fonts.customFonts.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="font-bold text-sm mb-2">{isRtl ? "الخطوط المرفوعة" : "Uploaded Fonts"}</h4>
                {template.fonts.customFonts.map((font, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="font-medium text-sm">{font.name} {"(" + font.format + ")"}</span>
                    <button onClick={() => removeCustomFont(idx)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
