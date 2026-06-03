import React from 'react';
import { GraduationCap, Upload, User, Hash, Phone, Mail, Key, MapPin } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FormSection, FormInput, FormSelect, LabeledField } from '../ui/FormField';

export type StudentFormState = {
  name: string;
  registrationNumber: string;
  classId: string;
  email: string;
  password: string;
  parentPhone: string;
  parentEmail: string;
  address: string;
  driverPhone: string;
  parentPassword: string;
  photoUrl: string;
};

interface StudentFormModalProps {
  open: boolean;
  onClose: () => void;
  isEdit: boolean;
  value: StudentFormState;
  onChange: (patch: Partial<StudentFormState>) => void;
  classes: { id: string; name: string }[];
  isUploadingPhoto: boolean;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function StudentFormModal({
  open,
  onClose,
  isEdit,
  value,
  onChange,
  classes,
  isUploadingPhoto,
  onPhotoUpload,
  onSubmit,
}: StudentFormModalProps) {
  const set = (patch: Partial<StudentFormState>) => onChange(patch);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'تعديل بيانات الطالب' : 'تسجيل طالب جديد'}
      description="تأكد من دقة البيانات — تُستخدم في الوثائق الرسمية والنتائج."
      icon={<GraduationCap size={26} className="text-[#0B2345] dark:text-[#D4A64A]" />}
      maxWidthClass="max-w-2xl"
      footer={
        <>
          <Button type="submit" form="student-form" size="lg" fullWidth className="sm:flex-1 order-1 sm:order-none">
            {isEdit ? 'حفظ التغييرات' : 'تأكيد وإضافة الطالب'}
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={onClose} className="w-full sm:w-auto order-2 sm:order-none">
            إلغاء
          </Button>
        </>
      }
    >
      <form id="student-form" onSubmit={onSubmit} className="space-y-6">
        <FormSection title="الصورة الشخصية" description="اختياري — تظهر في البطاقة والقوائم">
          <div className="sq-form-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
            <div className="sq-form-photo-preview shrink-0 mx-auto sm:mx-0">
              {value.photoUrl ? (
                <img src={value.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <GraduationCap size={28} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1 space-y-3 min-w-0 w-full">
              <input type="file" accept="image/*" onChange={onPhotoUpload} className="hidden" id="student-photo-upload" />
              <label htmlFor="student-photo-upload" className="sq-form-upload-btn">
                <Upload size={16} />
                {isUploadingPhoto ? 'جاري الرفع...' : 'رفع صورة من الجهاز'}
              </label>
              <LabeledField label="رابط الصورة (اختياري)">
                <FormInput
                  type="url"
                  ltr
                  placeholder="https://..."
                  value={value.photoUrl}
                  onChange={(e) => set({ photoUrl: e.target.value })}
                />
              </LabeledField>
            </div>
          </div>
        </FormSection>

        <FormSection title="بيانات الطالب">
          <LabeledField label="الاسم الكامل" required>
            <FormInput
              required
              icon={User}
              placeholder="الاسم الرباعي واللقب"
              value={value.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="رقم السجل الدراسي" required>
            <FormInput
              required
              icon={Hash}
              ltr
              placeholder="2024/001"
              value={value.registrationNumber}
              onChange={(e) => set({ registrationNumber: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="الصف الحالي" required>
            <FormSelect
              required
              icon={GraduationCap}
              value={value.classId}
              onChange={(e) => set({ classId: e.target.value })}
            >
              <option value="">اختر الصف...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelect>
          </LabeledField>
          <LabeledField label="عنوان السكن" className="sq-form-span-2">
            <FormInput
              icon={MapPin}
              placeholder="المحافظة - القضاء - الحي"
              value={value.address}
              onChange={(e) => set({ address: e.target.value })}
            />
          </LabeledField>
        </FormSection>

        <FormSection title="بيانات ولي الأمر" description="للتواصل وتسجيل الدخول في تطبيق أولياء الأمور">
          <LabeledField label="واتساب ولي الأمر">
            <FormInput
              icon={Phone}
              ltr
              placeholder="07XXXXXXXXX"
              value={value.parentPhone}
              onChange={(e) => set({ parentPhone: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="رقم السائق (للبطاقة)" hint="اختياري">
            <FormInput
              icon={Phone}
              ltr
              placeholder="07XXXXXXXXX"
              value={value.driverPhone}
              onChange={(e) => set({ driverPhone: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="إيميل ولي الأمر">
            <FormInput
              type="email"
              icon={Mail}
              ltr
              placeholder="parent@school.com"
              value={value.parentEmail}
              onChange={(e) => set({ parentEmail: e.target.value })}
            />
          </LabeledField>
          <LabeledField label="كلمة سر ولي الأمر">
            <FormInput
              type="text"
              icon={Key}
              placeholder="كلمة مرور قوية"
              value={value.parentPassword}
              onChange={(e) => set({ parentPassword: e.target.value })}
            />
          </LabeledField>
        </FormSection>
      </form>
    </Modal>
  );
}
