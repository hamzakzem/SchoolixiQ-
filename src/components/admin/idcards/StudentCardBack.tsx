import React from "react";
import { IdCardTemplate } from "../../../types/idCardTemplate";
import QRCodeSection from "./QRCodeSection";
import { Globe, Phone, MapPin, Mail } from "lucide-react";

interface StudentCardBackProps {
  student: any;
  cardData: any;
  isRtl?: boolean;
  template?: IdCardTemplate | null;
}

export default function StudentCardBack({
  student,
  cardData,
  isRtl,
  template,
}: StudentCardBackProps) {
  if (!cardData) return <div className="student-card-print hidden" />;

  const bgColor = template?.colors?.background || "#ffffff";
  const primaryColor = template?.colors?.primary || "#4f46e5";
  const textColor = template?.colors?.text || "#1e293b";
  const isDark = template?.layout === "dark";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`student-card-print relative overflow-hidden flex flex-col justify-between shadow-xl select-none ${isDark ? "bg-slate-900" : "bg-white"}`}
      style={{
        backgroundColor: isDark ? undefined : bgColor,
        color: isDark ? "#cbd5e1" : textColor,
        fontFamily: template?.fonts?.family ? `'${template.fonts.family}', sans-serif` : "Inter, sans-serif",
        borderRadius: "2cqi",
        containerType: 'inline-size',
        width: template?.layout === "horizontal"
          ? (template?.size === "hanging" ? "100mm" : template?.size === "pocket" ? "90mm" : template?.size === "custom" ? `${template.customSize?.height}mm` : "85.6mm")
          : (template?.size === "hanging" ? "70mm" : template?.size === "pocket" ? "60mm" : template?.size === "custom" ? `${template.customSize?.width}mm` : "54mm"),
        height: template?.layout === "horizontal"
          ? (template?.size === "hanging" ? "70mm" : template?.size === "pocket" ? "60mm" : template?.size === "custom" ? `${template.customSize?.width}mm` : "54mm")
          : (template?.size === "hanging" ? "100mm" : template?.size === "pocket" ? "90mm" : template?.size === "custom" ? `${template.customSize?.height}mm` : "85.6mm"),
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 2px 4px rgba(255,255,255,0.4)"
      }}
    >
      <div className="flex-1 flex flex-col p-[4cqi] justify-between relative z-10">
        <div className="flex flex-col gap-[2cqi]">
          <h3 className="font-bold text-[3cqi] text-center mb-[1cqi]" style={{ color: isDark ? "#fff" : primaryColor }}>
            {isRtl ? "تعليمات و سياسات البطاقة" : "Card Policies & Instructions"}
          </h3>
          <ul className="text-[2.2cqi] space-y-[1cqi] opacity-80 list-disc pl-[3cqi] rtl:pr-[3cqi] rtl:pl-0">
            <li>{isRtl ? "هذه البطاقة ملك للمدرسة ويجب إعادتها عند الطلب." : "This card is the property of the school and must be returned upon request."}</li>
            <li>{isRtl ? "يجب إبراز هذه البطاقة في جميع الأوقات داخل الحرم المدرسي." : "Must be presented at all times within the school campus."}</li>
            <li>{isRtl ? "في حال الفقدان، يرجى إبلاغ الإدارة فوراً." : "If lost, please report to the administration immediately."}</li>
            <li>{isRtl ? "لا يسمح باستخدام هذه البطاقة إلا من قبل الشخص المصرح له." : "Card is non-transferable and for authorized use only."}</li>
          </ul>
        </div>
        
        <div className="flex items-center justify-between mt-auto border-t pt-[2cqi] gap-[2cqi]" style={{ borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" }}>
          <div className="flex flex-col gap-[1cqi] text-[2cqi] opacity-70">
            {cardData.schoolPhone && (
              <div className="flex items-center gap-[1cqi]">
                <Phone size={10} />
                <span>{cardData.schoolPhone}</span>
              </div>
            )}
            {cardData.schoolAddress && (
              <div className="flex items-center gap-[1cqi]">
                <MapPin size={10} />
                <span>{cardData.schoolAddress}</span>
              </div>
            )}
          </div>
          
          <div className="w-[12cqi] shrink-0">
            <QRCodeSection
                studentId={student.id}
                customValue={`${window.location.origin}/verify/${student.id}`}
                studentName={student.name}
                qrSize="12cqi" 
            />
          </div>
        </div>
      </div>
      
      {/* Footer Banner */}
      <div 
        className="h-[6cqi] w-full shrink-0 flex items-center justify-center text-[2cqi] font-bold text-white tracking-widest"
        style={{ backgroundColor: primaryColor }}
      >
        {isRtl ? "في حالة العثور عليها يرجى تسليمها" : "IF FOUND, PLEASE DROP IN ANY MAILBOX"}
      </div>
    </div>
  );
}
