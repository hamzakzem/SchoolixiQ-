import React from "react";
import { IdCardTemplate } from "../../../types/idCardTemplate";
import { PremiumLayouts } from "./PremiumLayouts";

interface StudentCardProps {
  student: any;
  cardData: any;
  isRtl?: boolean;
  template?: IdCardTemplate | null;
  /** Fixed-size on-screen preview (settings studio) — avoids blank cqi/mm rendering */
  previewMode?: boolean;
}

export default function StudentCard({
  student,
  cardData,
  isRtl,
  template,
  previewMode = false,
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

  const bgColor = template?.colors?.background || "#ffffff";
  const textColor = template?.colors?.text || "#1e293b";
  const borderColor = template?.colors?.border || "#e2e8f0";

  const isHanging = template?.size === "hanging";
  const isHorizontal = template?.layout === "horizontal";

  const mmToPx = (mm: number) => Math.round(mm * 3.7795275591);

  const cardWidthMm = isHorizontal
    ? isHanging
      ? 100
      : template?.size === "pocket"
        ? 90
        : template?.size === "custom"
          ? template.customSize?.height ?? 86
          : 85.6
    : isHanging
      ? 70
      : template?.size === "pocket"
        ? 60
        : template?.size === "custom"
          ? template.customSize?.width ?? 54
          : 54;

  const cardHeightMm = isHorizontal
    ? isHanging
      ? 70
      : template?.size === "pocket"
        ? 60
        : template?.size === "custom"
          ? template.customSize?.width ?? 54
          : 54
    : isHanging
      ? 100
      : template?.size === "pocket"
        ? 90
        : template?.size === "custom"
          ? template.customSize?.height ?? 86
          : 85.6;

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
        backgroundColor: template?.layout === "dark" ? undefined : bgColor,
        color: textColor,
        fontFamily: template?.fonts?.family ? `'${template.fonts.family}', sans-serif` : "Inter, sans-serif",
        borderRadius: previewMode ? "12px" : "2cqi",
        containerType: "inline-size",
        width: previewMode ? "100%" : `${cardWidthMm}mm`,
        height: previewMode ? "100%" : `${cardHeightMm}mm`,
        minWidth: previewMode ? mmToPx(cardWidthMm) : undefined,
        minHeight: previewMode ? mmToPx(cardHeightMm) : undefined,
        boxShadow: previewMode
          ? "0 8px 32px -8px rgba(0,0,0,0.2)"
          : "0 10px 40px -10px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.2), inset 0 2px 4px rgba(255,255,255,0.4)",
      }}
    >
      {/* Subtle gloss — must stay BELOW layout content (was z-50 and washed the card white) */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none rounded-[inherit]"
        style={{
          background:
            "linear-gradient(105deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 40%, rgba(255,255,255,0) 70%, rgba(255,255,255,0.12) 100%)",
        }}
      />

      {/* Background Layer (Watermark) */}
      {template?.background?.type === "watermark" &&
        (template?.background?.imageUrl || template?.background?.watermarkText) && (
          <div
            className="absolute inset-0 z-0 pointer-events-none flex items-center justify-center overflow-hidden"
            style={{ opacity: template?.background?.watermarkOpacity ?? 0.12 }}
          >
            {template.background.imageUrl ? (
              <img
                src={template.background.imageUrl}
                alt=""
                className="object-contain max-w-none"
                style={{
                  width: `${template.background.watermarkScale ?? 80}%`,
                  height: `${template.background.watermarkScale ?? 80}%`,
                }}
              />
            ) : (
              <span
                className="font-black uppercase tracking-[0.35em] select-none whitespace-nowrap"
                style={{
                  fontFamily: template.fonts?.family || "Cairo, sans-serif",
                  fontSize: "min(12cqi, 28px)",
                  color: template.colors?.primary || "#0B2345",
                  transform: "rotate(-24deg)",
                }}
              >
                {template.background.watermarkText}
              </span>
            )}
          </div>
        )}

      {/* Dynamic Layout Engine */}
      <PremiumLayouts
        student={student}
        cardData={cardData}
        isRtl={!!isRtl}
        template={template!}
      />
    </div>
    </>
  );
}
