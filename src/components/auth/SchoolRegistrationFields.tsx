import React from 'react';
import { MapPin, Users } from 'lucide-react';

export type SchoolRegistrationFormValues = {
  address: string;
  governorate: string;
  directorate: string;
  educationLevel: string;
  workingHours: string;
  studyType: string;
  estimatedStudents: string;
};

type Props = {
  values: SchoolRegistrationFormValues;
  onChange: (patch: Partial<SchoolRegistrationFormValues>) => void;
  isRtl?: boolean;
  className?: string;
};

export function buildSchoolFirestoreFields(values: SchoolRegistrationFormValues) {
  const estimated = Number(values.estimatedStudents) || 0;
  return {
    address: values.address.trim(),
    governorate: values.governorate,
    directorate: values.directorate,
    educationLevel: values.educationLevel,
    workingHours: values.workingHours,
    studyType: values.studyType,
    estimatedStudents: estimated,
    stage: values.educationLevel,
    shift: values.workingHours,
    genderType: values.studyType,
    approximateStudents: values.estimatedStudents,
  };
}

export function buildRegistrationCustomerInfo(
  schoolName: string,
  email: string,
  phone: string,
  values: SchoolRegistrationFormValues,
) {
  const schoolFields = buildSchoolFirestoreFields(values);
  return {
    name: schoolName,
    email,
    phone,
    ...values,
    ...schoolFields,
  };
}

export default function SchoolRegistrationFields({
  values,
  onChange,
  isRtl = true,
  className = '',
}: Props) {
  const inputPad = isRtl ? 'pr-11 pl-4 text-right' : 'pl-11 pr-4 text-left';
  const iconPos = isRtl ? 'right-4' : 'left-4';

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
          {isRtl ? 'العنوان التفصيلي للمدرسة' : 'Detailed school address'}
        </label>
        <div className="relative">
          <MapPin className={`absolute ${iconPos} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
          <input
            required
            type="text"
            value={values.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className={`w-full ${inputPad} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
            placeholder={isRtl ? 'المحافظة - القضاء - الحي' : 'Province - district - neighborhood'}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            {isRtl ? 'المحافظة' : 'Governorate'}
          </label>
          <select
            required
            value={values.governorate}
            onChange={(e) => onChange({ governorate: e.target.value })}
            className="w-full px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm sm:text-base outline-none focus:border-slate-900"
          >
            <option value="" disabled>{isRtl ? 'اختر المحافظة...' : 'Select governorate...'}</option>
            <option value="بغداد">بغداد</option>
            <option value="البصرة">البصرة</option>
            <option value="نينوى">نينوى</option>
            <option value="أربيل">أربيل</option>
            <option value="النجف">النجف</option>
            <option value="ذي قار">ذي قار</option>
            <option value="كركوك">كركوك</option>
            <option value="الأنبار">الأنبار</option>
            <option value="ديالى">ديالى</option>
            <option value="المثنى">المثنى</option>
            <option value="القادسية">القادسية (الديوانية)</option>
            <option value="ميسان">ميسان</option>
            <option value="واسط">واسط</option>
            <option value="صلاح الدين">صلاح الدين</option>
            <option value="دهوك">دهوك</option>
            <option value="السليمانية">السليمانية</option>
            <option value="بابل">بابل</option>
            <option value="كربلاء">كربلاء</option>
            <option value="حلبجة">حلبجة</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            {isRtl ? 'المديرية' : 'Directorate'}
          </label>
          <select
            required
            value={values.directorate}
            onChange={(e) => onChange({ directorate: e.target.value })}
            className="w-full px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm sm:text-base outline-none focus:border-slate-900"
          >
            <option value="" disabled>{isRtl ? 'اختر المديرية...' : 'Select directorate...'}</option>
            <option value="مديرية الكرخ الاولى">مديرية الكرخ الاولى</option>
            <option value="مديرية الكرخ الثانية">مديرية الكرخ الثانية</option>
            <option value="مديرية الكرخ الثالثه">مديرية الكرخ الثالثه</option>
            <option value="مديرية الرصافة الاولى">مديرية الرصافة الاولى</option>
            <option value="مديرية الرصافة الثانية">مديرية الرصافة الثانية</option>
            <option value="مديرية الرصافة الثالثه">مديرية الرصافة الثالثه</option>
            <option value="أخرى / مديرية أخرى">أخرى / مديرية أخرى</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            {isRtl ? 'المرحلة الدراسية' : 'Education stage'}
          </label>
          <select
            required
            value={values.educationLevel}
            onChange={(e) => onChange({ educationLevel: e.target.value })}
            className="w-full px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm sm:text-base outline-none focus:border-slate-900"
          >
            <option value="" disabled>{isRtl ? 'المرحلة الدراسية...' : 'Select stage...'}</option>
            <option value="روضة">روضة</option>
            <option value="ابتدائي">ابتدائي</option>
            <option value="متوسطة">متوسطة</option>
            <option value="اعدادية">اعدادية</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            {isRtl ? 'وقت الدوام' : 'Working hours'}
          </label>
          <select
            required
            value={values.workingHours}
            onChange={(e) => onChange({ workingHours: e.target.value })}
            className="w-full px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm sm:text-base outline-none focus:border-slate-900"
          >
            <option value="" disabled>{isRtl ? 'وقت الدوام...' : 'Select shift...'}</option>
            <option value="صباحي">صباحي</option>
            <option value="مسائي">مسائي</option>
            <option value="مدمج">مدمج</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            {isRtl ? 'نوع الدراسة' : 'Study type'}
          </label>
          <select
            required
            value={values.studyType}
            onChange={(e) => onChange({ studyType: e.target.value })}
            className="w-full px-4 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/30 font-bold text-sm sm:text-base outline-none focus:border-slate-900"
          >
            <option value="" disabled>{isRtl ? 'نوع الدراسة...' : 'Select study type...'}</option>
            <option value="مختلطة">مختلطة</option>
            <option value="بنات فقط">بنات فقط</option>
            <option value="اولاد فقط">اولاد فقط</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            {isRtl ? 'عدد الطلاب المقدر' : 'Estimated students'}
          </label>
          <div className="relative">
            <Users className={`absolute ${iconPos} top-1/2 -translate-y-1/2 text-slate-400`} size={16} />
            <input
              required
              type="number"
              min={1}
              value={values.estimatedStudents}
              onChange={(e) => onChange({ estimatedStudents: e.target.value })}
              className={`w-full ${inputPad} py-3.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-200 focus:border-slate-900 outline-none font-bold bg-slate-50/30 text-sm sm:text-base`}
              placeholder={isRtl ? 'مثال: 500' : 'e.g. 500'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
