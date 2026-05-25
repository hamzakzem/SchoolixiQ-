import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import { Phone, Mail, MapPin, X, ShieldCheck, ExternalLink, Sparkles } from "lucide-react";
import { useLanguage } from "../../../lib/LanguageContext";

export default function QRCodeSection({ 
  studentId, 
  customValue,
  parentPhone,
  parentEmail,
  address,
  studentName,
  qrSize = 56
}: { 
  studentId: string;
  customValue?: string;
  parentPhone?: string;
  parentEmail?: string;
  address?: string;
  studentName?: string;
  qrSize?: number | string;
}) {
  const [, setSearchParams] = useSearchParams();
  const { isRtl } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  // Generate QR code value pointing to a public verification profile
  const verificationUrl = `${window.location.origin}/verify/${studentId}`;
  const qrString = customValue || verificationUrl;

  const handleTestScan = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <div className="flex flex-col items-center justify-center shrink-0">
        <button
          type="button"
          className="p-[1cqi] bg-white rounded-lg justify-center items-center flex border border-slate-200 cursor-pointer hover:border-indigo-400 hover:scale-105 transition-all print:cursor-default print:scale-100 print:border-slate-200"
          style={{ width: typeof qrSize === 'number' ? `${qrSize}px` : qrSize, height: typeof qrSize === 'number' ? `${qrSize}px` : qrSize }}
          title={isRtl ? "انقر لعرض البيانات" : "Click to view details"}
          onClick={handleTestScan}
        >
          <div className="w-full h-full flex items-center justify-center">
            <QRCodeSVG value={qrString} style={{ width: '100%', height: '100%' }} level="H" includeMargin={false} />
          </div>
        </button>
        <span className="text-[3.5cqi] text-slate-400 mt-[1cqi] font-bold print:hidden text-center whitespace-nowrap">
          {isRtl ? "مسح كزائر" : "Click to view"}
        </span>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
            {/* Backdrop click closer */}
            <div className="absolute inset-0" onClick={() => setIsOpen(false)} />
            
            {/* Elegant Card Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              transition={{ type: "spring", duration: 0.5 }}
              dir={isRtl ? "rtl" : "ltr"}
              className="relative w-full max-w-sm bg-slate-900 text-white rounded-[2.5rem] p-6 shadow-2xl border border-white/10 overflow-hidden"
            >
              {/* Modern Grid Background Graphic */}
              <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "20px 20px"
              }} />

              {/* Glowing gradients */}
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500 rounded-full filter blur-[100px] opacity-30 pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500 rounded-full filter blur-[100px] opacity-20 pointer-events-none" />

              {/* Close button */}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/5 active:scale-90"
              >
                <X size={16} />
              </button>

              {/* Header */}
              <div className="flex flex-col items-center text-center mt-2 mb-6">
                <div className="w-14 h-14 bg-gradient-to-tr from-indigo-500 to-sky-400 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3 border border-white/10">
                  <ShieldCheck size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-black tracking-tight font-display bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                  {isRtl ? "بيانات ولي أمر الطالب" : "Parent Details (QR Screen)"}
                </h3>
                {studentName && (
                  <p className="text-xs text-indigo-300 font-bold mt-1 flex items-center gap-1">
                    <Sparkles size={12} className="animate-pulse" />
                    {isRtl ? `الطالب: ${studentName}` : `Student: ${studentName}`}
                  </p>
                )}
              </div>

              {/* Form Block / Elegant Card */}
              <div className="space-y-4 relative z-10">
                {/* Phone Card */}
                <div className="group bg-white/[0.04] hover:bg-white/[0.07] border border-white/5 p-4 rounded-3xl flex items-center justify-between transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-400 rounded-xl flex items-center justify-center border border-indigo-500/20">
                      <Phone size={18} />
                    </div>
                    <div>
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {isRtl ? "رقم هاتف ولي الأمر" : "Parent's Phone"}
                      </span>
                      <span className="text-sm font-black font-mono tracking-wider block mt-0.5">
                        {parentPhone || '-'}
                      </span>
                    </div>
                  </div>
                  {parentPhone && parentPhone !== '-' && (
                    <a
                      href={`tel:${parentPhone}`}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl flex items-center gap-1 transition-all hover:scale-105"
                    >
                      <ExternalLink size={12} />
                      {isRtl ? "اتصال" : "Call"}
                    </a>
                  )}
                </div>

                {/* Email Card */}
                <div className="group bg-white/[0.04] hover:bg-white/[0.07] border border-white/5 p-4 rounded-3xl flex items-center justify-between transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center border border-sky-500/20">
                      <Mail size={18} />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                        {isRtl ? "البريد الإلكتروني" : "Parent's Email"}
                      </span>
                      <span className="text-sm font-bold truncate block mt-0.5 max-w-[150px]" title={parentEmail}>
                        {parentEmail || '-'}
                      </span>
                    </div>
                  </div>
                  {parentEmail && parentEmail !== '-' && (
                    <a
                      href={`mailto:${parentEmail}`}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-xs font-bold rounded-xl flex items-center gap-1 transition-all hover:scale-105"
                    >
                      <ExternalLink size={12} />
                      {isRtl ? "إرسال" : "Email"}
                    </a>
                  )}
                </div>

                {/* Residence Address Card */}
                <div className="bg-white/[0.04] border border-white/5 p-4 rounded-3xl flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center border border-emerald-500/20">
                      <MapPin size={18} />
                    </div>
                    <div>
                      <span className="block text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                        {isRtl ? "عنوان السكن" : "Residence Address"}
                      </span>
                      <p className="text-sm font-bold text-white leading-relaxed mt-0.5">
                        {address || '-'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Secure footer badge */}
              <div className="mt-6 pt-4 border-t border-white/5 text-center text-[9px] text-slate-500 font-bold flex items-center justify-center gap-1">
                <ShieldCheck size={11} className="text-emerald-500 animate-pulse" />
                {isRtl ? "نظام هويات الطلاب الآمن" : "Secure Student ID System"}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
