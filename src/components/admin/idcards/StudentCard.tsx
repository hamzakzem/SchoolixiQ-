import React from "react";
import { IdCardTemplate } from "../../../types/idCardTemplate";
import { resolveStudentPhotoUrl } from "../../../lib/studentPhoto";
import { PremiumLayouts } from "./PremiumLayouts";

interface StudentCardProps {
  student: any;
  cardData: any;
  isRtl?: boolean;
  template?: IdCardTemplate | null;
}

export default function StudentCard({
  student,
  cardData,
  isRtl,
  template,
}: StudentCardProps) {
  // If card is not issued/created, cardData could be null
  if (!cardData) {
    return (
      <div className="student-card-print border-2 border-dashed border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center bg-slate-50/50 text-center gap-2">
        <p className="text-slate-400 font-bold text-xs">
          {isRtl ? "لم يتم إصدار الهوية بعد" : "ID Card not issued yet"}
        </p>
      </div>
    );
  }

  const displayCardData = {
    ...cardData,
    photoUrl: resolveStudentPhotoUrl(student, cardData),
  };

  const bgColor = template?.colors?.background || "#ffffff";
  const textColor = template?.colors?.text || "#1e293b";
  const borderColor = template?.colors?.border || "#e2e8f0";

  const isHanging = template?.size === "hanging";
  
  // Custom Fonts Injection
  const customFontsStyles = template?.fonts?.customFonts?.map(font => `
    @font-face {
      font-family: '${font.name}';
      src: url('${font.url}') format('${font.format}');
      font-weight: normal;
      font-style: normal;
    }
  `).join('\n') || '';

  return (
    <>
    {customFontsStyles && <style>{customFontsStyles}</style>}
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`student-card-print relative overflow-hidden flex flex-col justify-between shadow-xl select-none ${template?.layout === "dark" ? "bg-slate-900" : "bg-white"}`}
      style={{
        backgroundColor: template?.layout === "dark" ? undefined : bgColor, // Allows classes to override if needed, but fall back to styles
        color: textColor,
        fontFamily: template?.fonts?.family ? `'${template.fonts.family}', sans-serif` : "Inter, sans-serif",
        borderRadius: "2cqi", // Professional rounded corners for premium feel
        containerType: 'inline-size',
        width: template?.layout === "horizontal"
          ? (template?.size === "hanging"
            ? "100mm"
            : template?.size === "pocket"
              ? "90mm"
              : template?.size === "custom"
                ? `${template.customSize?.height}mm`
                : "85.6mm")
          : (template?.size === "hanging"
            ? "70mm"
            : template?.size === "pocket"
              ? "60mm"
              : template?.size === "custom"
                ? `${template.customSize?.width}mm`
                : "54mm"), // PVC width fallback
        height: template?.layout === "horizontal"
          ? (template?.size === "hanging"
            ? "70mm"
            : template?.size === "pocket"
              ? "60mm"
              : template?.size === "custom"
                ? `${template.customSize?.width}mm`
                : "54mm")
          : (template?.size === "hanging"
            ? "100mm"
            : template?.size === "pocket"
              ? "90mm"
              : template?.size === "custom"
                ? `${template.customSize?.height}mm`
                : "85.6mm"), // PVC height fallback
        boxShadow: "0 10px 40px -10px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 2px 4px rgba(255,255,255,0.4)"
      }}
    >
      {/* Physical Card Reflection overlay */}
      <div className="absolute inset-0 z-50 pointer-events-none rounded-[2cqi]" style={{ 
        background: 'linear-gradient(105deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 25%, rgba(255,255,255,0) 75%, rgba(255,255,255,0.2) 100%)',
        mixBlendMode: 'overlay'
      }} />

      {/* Background Layer (Watermark) */}
      {template?.background?.type === "watermark" &&
        template?.background?.imageUrl && (
          <div
            className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden"
            style={{ opacity: template?.background?.watermarkOpacity ?? 0.1 }}
          >
            <img
              src={template.background.imageUrl}
              alt="Watermark"
              className="w-[80%] h-[80%] object-contain"
            />
          </div>
        )}

      {/* Dynamic Layout Engine */}
      <PremiumLayouts
        student={student}
        cardData={displayCardData}
        isRtl={!!isRtl}
        template={template!}
      />
    </div>
    </>
  );
}
