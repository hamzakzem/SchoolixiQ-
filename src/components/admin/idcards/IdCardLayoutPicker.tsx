import React from 'react';
import { Check } from 'lucide-react';
import { ID_CARD_LAYOUTS, type IdCardLayoutId } from '../../../lib/idCardPresets';

type Props = {
  value: IdCardLayoutId;
  onChange: (id: IdCardLayoutId) => void;
  isRtl: boolean;
};

export function IdCardLayoutPicker({ value, onChange, isRtl }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
      {ID_CARD_LAYOUTS.map((layout) => {
        const selected = value === layout.id;
        return (
          <button
            key={layout.id}
            type="button"
            onClick={() => onChange(layout.id)}
            className={`group relative text-start rounded-2xl border-2 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
              selected
                ? 'border-[#0B2345] bg-indigo-50/80 dark:bg-indigo-950/30 shadow-md ring-2 ring-[#0B2345]/20'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-indigo-300'
            }`}
          >
            {selected && (
              <span className="absolute top-2 end-2 w-6 h-6 rounded-full bg-[#0B2345] text-white flex items-center justify-center shadow">
                <Check size={14} />
              </span>
            )}
            <div
              className="h-20 rounded-xl mb-2 overflow-hidden border border-slate-200/80 shadow-inner relative"
              style={{
                background: `linear-gradient(145deg, ${layout.preview.from}, ${layout.preview.to})`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-5 opacity-90"
                style={{ background: layout.preview.accent }}
              />
              <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 items-end">
                <div
                  className="w-8 h-10 rounded-md border-2 border-white/80 shadow-sm shrink-0"
                  style={{ background: layout.preview.accent }}
                />
                <div className="flex-1 space-y-1">
                  <div className="h-1.5 rounded-full bg-slate-300/80 w-full" />
                  <div className="h-1.5 rounded-full bg-slate-200/80 w-3/4" />
                  <div className="h-1.5 rounded-full bg-slate-200/60 w-1/2" />
                </div>
              </div>
            </div>
            <p className="font-black text-xs text-slate-900 dark:text-white leading-tight">
              {isRtl ? layout.nameAr : layout.nameEn}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
              {layout.descriptionAr}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export default IdCardLayoutPicker;
