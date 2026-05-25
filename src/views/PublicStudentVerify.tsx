import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useLanguage } from "../lib/LanguageContext";
import {
  ShieldCheck,
  User,
  MapPin,
  Phone,
  Mail,
  Building,
  Activity,
  Calendar,
} from "lucide-react";
import { motion } from "motion/react";

export default function PublicStudentVerify() {
  const { studentId } = useParams();
  const { isRtl } = useLanguage();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!studentId) return;
      try {
        const docRef = doc(db, "students", studentId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStudent({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError(isRtl ? "لم يتم العثور على الطالب" : "Student not found");
        }
      } catch (err) {
        console.error(err);
        setError(isRtl ? "حدث خطأ أثناء تحميل البيانات" : "Error loading data");
      } finally {
        setLoading(false);
      }
    };
    fetchStudent();
  }, [studentId, isRtl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-slate-500 font-bold">
            {isRtl ? "جاري التحقق..." : "Verifying..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div
        className="min-h-screen bg-slate-50 flex items-center justify-center p-4"
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center border-t-4 border-red-500">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{error}</h2>
          <p className="text-slate-500">
            {isRtl
              ? "رمز الـ QR غير صالح أو منتهي الصلاحية."
              : "Invalid or expired QR code."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-100 py-12 px-4"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md mx-auto relative"
      >
        {/* Verification Badge */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex flex-col items-center z-10 drop-shadow-xl">
          <div className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg border-4 border-slate-100">
            <ShieldCheck size={28} />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 pt-10">
          {/* Header */}
          <div className="px-8 pb-8 text-center border-b border-slate-100">
            <h1 className="text-2xl font-black text-slate-900">
              {student.name}
            </h1>
            <p className="text-indigo-600 font-bold tracking-widest mt-1 uppercase text-sm">
              {student.id.substring(0, 8)}
            </p>
            <div className="inline-flex items-center gap-1 mt-3 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              {isRtl ? "طالب مسجل رسمياً" : "Verified Student"}
            </div>
          </div>

          {/* Details */}
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Activity size={16} />
                  <span className="text-xs font-bold uppercase">
                    {isRtl ? "الفئة" : "Class"}
                  </span>
                </div>
                <p className="text-slate-900 font-bold">
                  {student.className || "-"}
                </p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Calendar size={16} />
                  <span className="text-xs font-bold uppercase">
                    {isRtl ? "تاريخ الميلاد" : "DOB"}
                  </span>
                </div>
                <p className="text-slate-900 font-bold">{student.dob || "-"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    {isRtl ? "ولي الأمر" : "Parent Phone"}
                  </p>
                  <p className="text-slate-900 font-mono font-bold mt-0.5">
                    {student.parentPhone || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center shrink-0">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    {isRtl ? "الإيميل" : "Email"}
                  </p>
                  <p className="text-slate-900 font-bold mt-0.5 max-w-[200px] truncate">
                    {student.parentEmail || "-"}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">
                    {isRtl ? "العنوان" : "Address"}
                  </p>
                  <p className="text-slate-900 font-bold mt-0.5 leading-snug">
                    {student.address || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <div className="flex items-center justify-center gap-2 text-slate-400 mb-2">
                <Building size={16} />
                <span className="text-xs font-bold uppercase">
                  {isRtl ? "معلومات المدرسة" : "School System"}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium max-w-[250px] mx-auto leading-relaxed">
                {isRtl
                  ? "تم إصدار هذه البطاقة عبر نظام Schoolix الذكي لإدارة المدارس."
                  : "This card was issued by Schoolix Smart Management System."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
