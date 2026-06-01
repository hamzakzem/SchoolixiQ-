import React from "react";
import QRCodeSection from "./QRCodeSection";
import { HorizontalLayout } from "./HorizontalLayout";
import {
  Image as ImageIcon,
  PenTool,
  Stamp,
  Phone,
  Mail,
  Car,
  MapPin,
  GraduationCap,
} from "lucide-react";
import Barcode from "react-barcode";
import { IdCardTemplate } from "../../../types/idCardTemplate";

interface LayoutProps {
  student: any;
  cardData: any;
  isRtl: boolean;
  template: IdCardTemplate;
}

export const PremiumLayouts = ({
  student,
  cardData,
  isRtl,
  template,
}: LayoutProps) => {
  if (!template) return null;

  if (template.layout === "horizontal") {
    return (
      <HorizontalLayout
        student={student}
        cardData={cardData}
        isRtl={isRtl}
        template={template}
      />
    );
  }

  const primaryColor = template.colors?.primary || "#4f46e5";
  const secondaryColor = template.colors?.secondary || "#ffffff";
  const textColor = template.colors?.text || "#1e293b";
  const borderColor = template.colors?.border || "#e2e8f0";

  const showPhoto = template.elements?.studentPhoto !== false;
  const photoSettings = template.photoSettings || {};
  const photoShape = photoSettings.shape || template.elements?.photoShape || "rounded";
  const fitMode = photoSettings.fitMode || "cover";
  const customPhotoWidth = photoSettings.width;
  const customPhotoHeight = photoSettings.height;
  const showQr = template.elements?.qrCode !== false;

  // Custom Styles by Layout
  const isGlass = template.layout === "glass";
  const isDark = template.layout === "dark";
  const isExecutive = template.layout === "executive";
  const isCorporate = template.layout === "corporate";
  const isGradient = template.layout === "gradient";
  const isSmallCard = template.size === "pvc" || template.size === "pocket";

  const getRadiusClass = () => {
    switch (photoShape) {
       case 'circle': return 'rounded-full';
       case 'square': return 'rounded-sm'; // slight rounded on square looks professional
       case 'portrait': return 'rounded-md';
       default: return 'rounded-[2.5cqi]';
    }
  };
  const radiusClass = getRadiusClass();
  const blurRadiusClass = photoShape === 'circle' ? 'rounded-full' : photoShape === 'square' ? 'rounded-md' : 'rounded-[3cqi]';

  // Photo size calculation
  const getPhotoSize = () => {
    let w, h;
    if (photoShape === 'circle' || photoShape === 'square') {
      w = isSmallCard ? 44 : isExecutive ? 54 : 48;
      h = w;
    } else if (photoShape === 'portrait') {
      w = isSmallCard ? 40 : isExecutive ? 50 : 44;
      h = isSmallCard ? 52 : isExecutive ? 65 : 58;
    } else { // rounded/default
      w = isSmallCard ? 40 : isExecutive ? 50 : 44;
      h = isSmallCard ? 48 : isExecutive ? 60 : 54;
    }
    
    // Apply custom scale if exists
    if (customPhotoWidth) w = customPhotoWidth;
    if (customPhotoHeight) h = customPhotoHeight;

    return {
      width: `${w}cqi`,
      height: `${h}cqi`
    };
  };
  const photoSize = getPhotoSize();

  const getStyle = (elementKey: keyof Omit<IdCardTemplate['fonts'], 'family'|'size'|'weight'|'customFonts'>) => {
    const fSettings = template.fonts?.[elementKey];
    if (!fSettings) return {};
    
    const style: React.CSSProperties = {};
    if (fSettings.family) style.fontFamily = `'${fSettings.family}', sans-serif`;
    if (fSettings.weight && fSettings.weight !== 'normal') style.fontWeight = fSettings.weight as any;
    if (fSettings.size) style.fontSize = `${parseFloat(fSettings.size.toString()) * 0.49}cqi`;
    if (fSettings.letterSpacing) style.letterSpacing = `${parseFloat(fSettings.letterSpacing.toString()) * 0.49}cqi`;
    if (fSettings.lineHeight) style.lineHeight = fSettings.lineHeight;

    return style;
  };

  const bgClasses = isGlass
    ? "bg-white/40 backdrop-blur-md border-white/20"
    : isExecutive
    ? "bg-gradient-to-br from-slate-50 to-slate-200"
    : isDark
    ? "bg-gradient-to-br from-slate-900 to-slate-800"
    : isGradient
    ? `bg-gradient-to-br ${primaryColor}10 ${secondaryColor}10`
    : "";
  const headerGradient = isGradient
    ? `linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd)`
    : isExecutive
    ? `linear-gradient(to right, ${primaryColor}, #334155, ${primaryColor})`
    : primaryColor;

  if (isExecutive) {
    return (
      <div 
        className={`relative z-10 flex flex-col h-full w-full justify-between bg-slate-50 overflow-hidden text-slate-900 border`}
        style={{ borderColor: primaryColor }}
      >
        {/* Background Accent */}
        <div 
          className="absolute top-0 left-0 right-0 h-[45%] opacity-[0.03] pointer-events-none"
          style={{ background: `linear-gradient(135deg, ${primaryColor}, transparent)` }}
        />
        
        {/* Header Section */}
        {template.elements?.schoolLogo !== false && (
          <div className="w-full flex items-center justify-between px-[5cqi] pt-[6cqi] shrink-0 relative z-10 gap-[3cqi]">
             {cardData.schoolLogo ? (
               <div className="w-[12cqi] h-[12cqi] shrink-0 bg-white rounded-xl shadow-sm border border-slate-200/60 flex items-center justify-center p-[1cqi]">
                 <img src={cardData.schoolLogo} alt="" className="w-full h-full object-contain" />
               </div>
             ) : (
               <div className="w-[12cqi] h-[12cqi] shrink-0 bg-white rounded-xl shadow-sm border border-slate-200/60 flex items-center justify-center">
                 <GraduationCap className="w-[6cqi] h-[6cqi]" style={{ color: primaryColor }} />
               </div>
             )}
             <div className="flex flex-col flex-1 truncate text-end rtl:text-start">
               <h2 className="font-bold text-[3.8cqi] leading-tight truncate tracking-tight text-slate-900" style={getStyle('schoolName')}>
                 {cardData.schoolName || "School Name"}
               </h2>
               <span className="text-[2.2cqi] uppercase tracking-widest font-semibold mt-[0.5cqi] opacity-70" style={{ color: primaryColor }}>
                 {isRtl ? "بطاقة تعريفية" : "STUDENT ID TESSERACT"}
               </span>
             </div>
          </div>
        )}

        {/* Unified Identity Section */}
        <div className="relative z-10 mx-[4cqi] mt-[4cqi] bg-white rounded-[3cqi] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-[4cqi] flex items-center gap-[4cqi]">
          {showPhoto && (
            <div 
              className={`relative shadow-sm border-[2px] shrink-0 flex items-center justify-center bg-slate-50 ${radiusClass} overflow-hidden`}
              style={{
                width: photoSize.width,
                height: photoSize.height,
                borderColor: photoSettings.borderColor || primaryColor
              }}
            >
              {cardData.photoUrl ? (
                <img
                  src={cardData.photoUrl}
                  alt=""
                  className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ImageIcon className="w-[8cqi] h-[8cqi] opacity-20" />
              )}
            </div>
          )}
          
          <div className="flex flex-col w-full min-w-0">
            <h3
              className="font-black leading-[1.2] tracking-wide mb-[1.5cqi] break-words whitespace-normal text-slate-900 w-full"
              style={{ 
                wordBreak: 'break-word',
                fontSize: template.fonts?.studentName?.size 
                  ? `${parseFloat(template.fonts.studentName.size.toString()) * 0.49}cqi` 
                  : (student.name.length > 25 ? '4cqi' : '5cqi'),
                ...getStyle('studentName') 
              }}
            >
              {student.name}
            </h3>
            {template.elements?.className !== false && (
              <span className="text-[2.8cqi] font-bold px-[2.5cqi] py-[1cqi] rounded-md uppercase tracking-widest bg-slate-50 border border-slate-100 text-slate-700 w-fit">
                {cardData.className}
              </span>
            )}
          </div>
        </div>

        {/* Data Grid Section */}
        <div className="flex-1 w-full px-[5cqi] pt-[4cqi] overflow-hidden flex flex-col gap-[3cqi] shrink min-h-0 relative z-10" style={getStyle('contactInfo')}>
          <div className="grid grid-cols-2 gap-x-[4cqi] gap-y-[3cqi]">
            <div className="flex items-center gap-[2cqi]">
              <div className="bg-slate-200 w-[0.8cqi] h-full rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <div className="flex flex-col min-w-0">
                <span className="text-[2cqi] uppercase tracking-widest font-semibold opacity-50 mb-[0.2cqi]">{isRtl ? "رقم الطالب" : "ID NUMBER"}</span>
                <span className="font-mono font-bold text-[3.2cqi] truncate text-slate-800">{student.id.substring(0, 10).toUpperCase()}</span>
              </div>
            </div>
            
            {template.elements?.examNumber && (
            <div className="flex items-center gap-[2cqi]">
              <div className="bg-slate-200 w-[0.8cqi] h-full rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <div className="flex flex-col min-w-0">
                <span className="text-[2cqi] uppercase tracking-widest font-semibold opacity-50 mb-[0.2cqi]">{isRtl ? "الرقم الامتحاني" : "EXAM NO."}</span>
                <span className="font-mono font-bold text-[3.2cqi] truncate text-slate-800">{cardData.examNumber || student.examNumber || "-"}</span>
              </div>
            </div>
            )}
            
            {template.elements?.issueDate && (
            <div className="flex items-center gap-[2cqi]">
              <div className="bg-slate-200 w-[0.8cqi] h-full rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <div className="flex flex-col min-w-0">
                <span className="text-[2cqi] uppercase tracking-widest font-semibold opacity-50 mb-[0.2cqi]">{isRtl ? "الإصدار" : "ISSUED"}</span>
                <span className="font-mono font-bold text-[3.2cqi] truncate text-slate-800">{cardData.issueDate || "-"}</span>
              </div>
            </div>
            )}

            {template.elements?.expiryDate && (
            <div className="flex items-center gap-[2cqi]">
              <div className="bg-slate-200 w-[0.8cqi] h-full rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
              <div className="flex flex-col min-w-0">
                <span className="text-[2cqi] uppercase tracking-widest font-semibold opacity-50 mb-[0.2cqi]">{isRtl ? "الانتهاء" : "EXPIRES"}</span>
                <span className="font-mono font-bold text-[3.2cqi] truncate text-slate-800">{cardData.expiryDate || cardData.validUntil || "-"}</span>
              </div>
            </div>
            )}
          </div>

          <div className="flex flex-col gap-[2cqi] mt-auto pb-[2cqi]">
            {template.elements?.guardianName && (
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-[2cqi] last:border-0 last:pb-0">
                <span className="text-[2.2cqi] uppercase tracking-widest font-semibold opacity-50">{isRtl ? "ولي الأمر" : "GUARDIAN"}</span>
                <span className="font-bold text-[3cqi] text-slate-800 truncate max-w-[50cqi]">{cardData.guardianName || student.guardianName || "-"}</span>
              </div>
            )}
            {template.elements?.parentPhone !== false && (
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-[2cqi] last:border-0 last:pb-0">
                <span className="text-[2.2cqi] uppercase tracking-widest font-semibold opacity-50">{isRtl ? "هاتف ولي الأمر" : "GUARDIAN TEL"}</span>
                <span className="font-mono font-bold text-[3cqi] text-slate-800">{student.parentPhone || "-"}</span>
              </div>
            )}
            {template.elements?.driverPhone && (
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-[2cqi] last:border-0 last:pb-0">
                <span className="text-[2.2cqi] uppercase tracking-widest font-semibold opacity-50">{isRtl ? "السائق" : "DRIVER"}</span>
                <span className="font-bold text-[3cqi] text-slate-800 truncate max-w-[50cqi]">
                  {cardData.driverName ? `${cardData.driverName} - ${cardData.driverPhone}` : cardData.driverPhone}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer (QR & Barcode) */}
        <div className="w-full bg-[#0f172a] flex items-center justify-between px-[5cqi] py-[3.5cqi] shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[0.75cqi]" style={{ backgroundColor: primaryColor }} />
          
          {template.elements?.barcode !== false ? (
            <div className="bg-white/95 rounded-[1.5cqi] p-[1.5cqi] styled-barcode">
              <style>{`.styled-barcode svg { height: 9cqi !important; width: auto !important; max-width: 40cqi !important; }`}</style>
              <Barcode
                value={student.id.substring(0, 9).toUpperCase()}
                width={1.2}
                height={24}
                displayValue={true}
                fontSize={11}
                margin={0}
                font={template.fonts?.barcodeInfo?.family || undefined}
                background="transparent"
              />
            </div>
          ) : <div />}
          
          {showQr && (
            <div className="bg-white p-[1.5cqi] rounded-[2cqi] shadow-sm shrink-0">
              <QRCodeSection
                studentId={student.id}
                customValue={`${window.location.origin}/verify/${student.id}`}
                parentPhone={student.parentPhone || cardData.parentPhone || "-"}
                parentEmail={student.parentEmail || cardData.parentEmail || "-"}
                address={cardData.residenceAddress || student.address || "-"}
                studentName={student.name}
                qrSize="12cqi" 
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isCorporate) {
    return (
      <div 
        className={`relative z-10 flex flex-col h-full w-full justify-between bg-white overflow-hidden text-slate-900 border-2`}
        style={{ borderColor: primaryColor }}
      >
        {/* Top Header */}
        <div className="w-full flex items-center px-[4cqi] py-[3cqi] shrink-0 border-b-2 gap-[3cqi]" style={{ borderColor: primaryColor, backgroundColor: isDark ? '#1e293b' : '#f8fafc' }}>
             {cardData.schoolLogo && (
               <div className="w-[11cqi] h-[11cqi] shrink-0 bg-white p-[0.5cqi] rounded-md shadow-sm border border-slate-200">
                 <img src={cardData.schoolLogo} alt="" className="w-full h-full object-contain" />
               </div>
             )}
             <div className="flex flex-col flex-1 truncate">
               <h2 className="font-bold text-[3.8cqi] uppercase tracking-wide leading-tight truncate text-slate-900" style={getStyle('schoolName')}>
                 {cardData.schoolName || "School Name"}
               </h2>
             </div>
             
             <div className="shrink-0 flex flex-col items-end rtl:items-start ml-auto rtl:mr-auto rtl:ml-0">
               <span 
                 className="text-[2.2cqi] font-bold uppercase tracking-widest px-[2cqi] py-[0.8cqi] rounded-sm text-white shadow-sm"
                 style={{ backgroundColor: primaryColor }}
               >
                 {isRtl ? "هوية طالب" : "STUDENT ID"}
               </span>
             </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 flex flex-col w-full px-[4cqi] pt-[4cqi] flex-nowrap min-h-0 overflow-hidden" style={getStyle('contactInfo')}>
          
          {/* Unified Identity Section */}
          <div className="flex items-start gap-[4cqi] w-full border-b-[1.5px] pb-[4cqi] mb-[3cqi] border-slate-200">
            {showPhoto && (
              <div 
                className={`flex-shrink-0 relative overflow-hidden bg-slate-50 border-2 shadow-sm ${radiusClass}`}
                style={{
                  width: photoSize.width,
                  height: photoSize.height,
                  borderColor: primaryColor
                }}
              >
                {cardData.photoUrl ? (
                  <img
                    src={cardData.photoUrl}
                    alt=""
                    className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-[8cqi] h-[8cqi] text-slate-300" />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-col flex-1 min-w-0 pt-[1cqi]">
              <h3
                className="font-black leading-[1.1] tracking-normal break-words whitespace-normal text-slate-900 mb-[2cqi]"
                style={{ 
                  wordBreak: 'break-word',
                  fontSize: template.fonts?.studentName?.size 
                    ? `${parseFloat(template.fonts.studentName.size.toString()) * 0.49}cqi` 
                    : (student.name.length > 25 ? '4cqi' : '4.8cqi'),
                  ...getStyle('studentName') 
                }}
              >
                {student.name}
              </h3>
              
              <div className="grid grid-cols-2 gap-x-[2cqi] gap-y-[2cqi]">
                <div className="flex flex-col">
                   <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "رقم الطالب" : "ID NO."}</span>
                   <span className="font-mono font-bold text-[3cqi] text-slate-800 leading-none">{student.id.substring(0, 10).toUpperCase()}</span>
                </div>
                {template.elements?.className !== false && (
                <div className="flex flex-col">
                   <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "الصف" : "GRADE"}</span>
                   <span className="font-bold text-[3cqi] leading-none truncate" style={{ color: primaryColor }}>{cardData.className || "-"}</span>
                </div>
                )}
                {template.elements?.issueDate && (
                <div className="flex flex-col">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "العام الدراسي" : "YEAR"}</span>
                  <span className="font-mono font-bold text-[3cqi] text-slate-800 leading-none">{cardData.issueDate ? cardData.issueDate.substring(0,4) + "-" + (parseInt(cardData.issueDate.substring(0,4))+1) : "-"}</span>
                </div>
                )}
                {template.elements?.expiryDate && (
                <div className="flex flex-col">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "تاريخ الانتهاء" : "EXPIRES"}</span>
                  <span className="font-mono font-bold text-[3cqi] text-slate-800 leading-none">{cardData.expiryDate || cardData.validUntil || "-"}</span>
                </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-row w-full flex-1 min-h-0 gap-[3cqi]">
              {/* Secondary Details Section */}
              <div className="flex flex-1 flex-col justify-start gap-[1.5cqi]">
                {template.elements?.guardianName && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-[1.5cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "ولي الأمر" : "GUARDIAN"}</span>
                    <span className="font-bold text-[2.6cqi] text-slate-800 truncate pl-[2cqi] rtl:pr-[2cqi] rtl:pl-0 max-w-[60%]">{cardData.guardianName || student.guardianName || "-"}</span>
                  </div>
                )}
                
                {template.elements?.parentPhone !== false && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-[1.5cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "هاتف ولي الأمر" : "PARENT TEL"}</span>
                    <span className="font-mono font-bold text-[2.6cqi] text-slate-800">{student.parentPhone || "-"}</span>
                  </div>
                )}

                {template.elements?.driverPhone && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-[1.5cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "السائق" : "DRIVER"}</span>
                    <span className="font-bold text-[2.4cqi] text-slate-800 truncate pl-[2cqi] rtl:pr-[2cqi] rtl:pl-0 max-w-[65%] text-end">
                      {cardData.driverName ? `${cardData.driverName} - ${cardData.driverPhone}` : cardData.driverPhone}
                    </span>
                  </div>
                )}
                
                {template.elements?.schoolPhone && (
                  <div className="flex items-center justify-between border-b border-slate-100 pb-[1.5cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "هاتف المدرسة" : "SCHOOL TEL"}</span>
                    <span className="font-mono font-bold text-[2.6cqi] text-slate-800">{cardData.schoolPhone || "-"}</span>
                  </div>
                )}
              </div>

              {/* QR Code Container */}
              {showQr && (
                <div className="w-[18cqi] flex flex-col items-center justify-end pb-[1cqi] shrink-0">
                  <div className="bg-white p-[1cqi] rounded-md shadow-sm border border-slate-200">
                    <QRCodeSection
                      studentId={student.id}
                      customValue={`${window.location.origin}/verify/${student.id}`}
                      parentPhone={student.parentPhone || cardData.parentPhone || "-"}
                      parentEmail={student.parentEmail || cardData.parentEmail || "-"}
                      address={cardData.residenceAddress || student.address || "-"}
                      studentName={student.name}
                      qrSize="16cqi" 
                    />
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Footer (Barcode) */}
        {template.elements?.barcode !== false && (
          <div className="w-full flex flex-col items-center justify-center px-[4cqi] py-[1.5cqi] shrink-0 border-t-2 bg-slate-50 mt-auto" style={{ borderColor: primaryColor }}>
            <div className="styled-corporate-barcode w-full flex justify-center">
              <style>{`.styled-corporate-barcode svg { height: 8cqi !important; width: 100% !important; max-width: 75% !important; }`}</style>
              <Barcode
                value={student.id.substring(0, 9).toUpperCase()}
                width={1.5}
                height={24}
                displayValue={true}
                fontSize={10}
                margin={0}
                font={template.fonts?.barcodeInfo?.family || undefined}
                background="transparent"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isGlass) {
    return (
      <div 
        className={`relative z-10 flex flex-col h-full w-full bg-white/40 backdrop-blur-[6px] border border-white/30 overflow-hidden text-slate-900 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]`}
      >
        {/* Background Gradients to enhance glass effect */}
        <div className="absolute -top-[20%] -left-[20%] w-[70%] h-[50%] blur-[80px] rounded-full opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundColor: primaryColor }} />
        <div className="absolute -bottom-[20%] -right-[20%] w-[70%] h-[50%] blur-[80px] rounded-full opacity-40 mix-blend-multiply pointer-events-none" style={{ backgroundColor: secondaryColor !== '#ffffff' ? secondaryColor : '#e2e8f0' }} />

        {/* Header - Subtle Glass */}
        {template.elements?.schoolLogo !== false && (
          <div className="w-full flex items-center justify-between px-[5cqi] py-[4cqi] shrink-0 relative z-10 border-b border-white/40 bg-white/30 backdrop-blur-sm shadow-[0_2px_10px_rgb(0,0,0,0.02)] gap-[3cqi]">
             {cardData.schoolLogo ? (
               <div className="w-[11cqi] h-[11cqi] shrink-0 bg-white/80 rounded-[2cqi] shadow-sm border border-white/60 flex items-center justify-center p-[1cqi] backdrop-blur-md">
                 <img src={cardData.schoolLogo} alt="" className="w-full h-full object-contain drop-shadow-sm" />
               </div>
             ) : (
               <div className="w-[11cqi] h-[11cqi] shrink-0 bg-white/80 rounded-[2cqi] shadow-sm border border-white/60 flex items-center justify-center backdrop-blur-md">
                 <GraduationCap className="w-[5.5cqi] h-[5.5cqi]" style={{ color: primaryColor }} />
               </div>
             )}
             <div className="flex flex-col flex-1 truncate text-end rtl:text-start">
               <h2 className="font-bold text-[3.8cqi] leading-tight truncate tracking-tight text-slate-800 drop-shadow-sm" style={getStyle('schoolName')}>
                 {cardData.schoolName || "School Name"}
               </h2>
               <span className="text-[2cqi] uppercase tracking-widest font-bold mt-[0.5cqi] opacity-80" style={{ color: primaryColor, textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                 {isRtl ? "بطاقة مدرسية" : "STUDENT ID"}
               </span>
             </div>
          </div>
        )}

        {/* Body Content */}
        <div className="flex flex-col flex-1 relative z-10 p-[5cqi] min-h-0">
          
          {/* Identity Core */}
          <div className="flex justify-between items-start gap-[4cqi] mb-[4cqi]">
            <div className="flex flex-col flex-1 min-w-0">
              <h3
                className="font-black leading-[1.2] tracking-normal break-words whitespace-normal text-slate-900 drop-shadow-sm"
                style={{ 
                  wordBreak: 'break-word',
                  fontSize: template.fonts?.studentName?.size 
                    ? `${parseFloat(template.fonts.studentName.size.toString()) * 0.49}cqi` 
                    : (student.name.length > 25 ? '4.5cqi' : '5.5cqi'),
                  ...getStyle('studentName') 
                }}
              >
                {student.name}
              </h3>
              
              <div className="flex flex-wrap gap-[1.5cqi] mt-[1.5cqi]">
                <span className="font-mono bg-white/70 backdrop-blur-md px-[2cqi] py-[0.8cqi] rounded-md font-bold text-[2.8cqi] text-slate-700 border border-white/60 shadow-sm leading-none flex items-center justify-center">
                  {student.id.substring(0, 10).toUpperCase()}
                </span>
                {template.elements?.className !== false && (
                  <span 
                    className="bg-primary/10 px-[2cqi] py-[0.8cqi] rounded-md font-bold text-[2.8cqi] border shadow-sm leading-none flex items-center justify-center whitespace-nowrap"
                    style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40`, color: primaryColor }}
                  >
                    {cardData.className}
                  </span>
                )}
              </div>
            </div>

            {showPhoto && (
              <div 
                className={`flex-shrink-0 relative overflow-hidden bg-white/60 backdrop-blur-md shadow-lg border-[2px] ${radiusClass}`}
                style={{
                  width: photoSize.width,
                  height: photoSize.height,
                  borderColor: 'rgba(255,255,255,0.8)'
                }}
              >
                {cardData.photoUrl ? (
                  <img
                    src={cardData.photoUrl}
                    alt=""
                    className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-[8cqi] h-[8cqi] opacity-30 drop-shadow-sm" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Details Section */}
          <div className="flex-1 min-h-0 bg-white/40 backdrop-blur-sm rounded-[2.5cqi] border border-white/60 shadow-[0_4px_16px_rgb(0,0,0,0.03)] p-[3.5cqi] flex flex-col gap-[2.5cqi] overflow-hidden" style={getStyle('contactInfo')}>
              <div className="grid grid-cols-2 gap-x-[3cqi] gap-y-[2.5cqi]">
                {template.elements?.examNumber && (
                <div className="flex flex-col">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500 mb-[0.2cqi] drop-shadow-sm">{isRtl ? "الرقم الامتحاني" : "EXAM NO."}</span>
                  <span className="font-mono font-bold text-[2.8cqi] text-slate-800 drop-shadow-sm truncate">{cardData.examNumber || student.examNumber || "-"}</span>
                </div>
                )}
                
                {template.elements?.issueDate && (
                <div className="flex flex-col">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500 mb-[0.2cqi] drop-shadow-sm">{isRtl ? "الإصدار" : "ISSUED"}</span>
                  <span className="font-mono font-bold text-[2.8cqi] text-slate-800 drop-shadow-sm truncate">{cardData.issueDate || "-"}</span>
                </div>
                )}

                {template.elements?.expiryDate && (
                <div className="flex flex-col">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500 mb-[0.2cqi] drop-shadow-sm">{isRtl ? "الانتهاء" : "EXPIRES"}</span>
                  <span className="font-mono font-bold text-[2.8cqi] text-slate-800 drop-shadow-sm truncate">{cardData.expiryDate || cardData.validUntil || "-"}</span>
                </div>
                )}
              </div>

              <div className="flex flex-col mt-auto gap-[1.5cqi]">
                {template.elements?.guardianName && (
                  <div className="flex items-center justify-between border-b border-white/50 pb-[1.5cqi] last:border-0 last:pb-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-wider text-slate-500 drop-shadow-sm">{isRtl ? "ولي الأمر" : "GUARDIAN"}</span>
                    <span className="font-bold text-[2.6cqi] text-slate-800 drop-shadow-sm truncate max-w-[45cqi] text-end">{cardData.guardianName || student.guardianName || "-"}</span>
                  </div>
                )}
                {template.elements?.parentPhone !== false && (
                  <div className="flex items-center justify-between border-b border-white/50 pb-[1.5cqi] last:border-0 last:pb-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-wider text-slate-500 drop-shadow-sm">{isRtl ? "هاتف ولي الأمر" : "GUAR. TEL"}</span>
                    <span className="font-mono font-bold text-[2.6cqi] text-slate-800 drop-shadow-sm">{student.parentPhone || "-"}</span>
                  </div>
                )}
                {template.elements?.driverPhone && (
                  <div className="flex items-center justify-between border-b border-white/50 pb-[1.5cqi] last:border-0 last:pb-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-wider text-slate-500 drop-shadow-sm">{isRtl ? "السائق" : "DRIVER"}</span>
                    <span className="font-bold text-[2.6cqi] text-slate-800 drop-shadow-sm truncate max-w-[45cqi] text-end">
                      {cardData.driverName ? `${cardData.driverName} - ${cardData.driverPhone}` : cardData.driverPhone}
                    </span>
                  </div>
                )}
              </div>
          </div>
        </div>

        {/* Footer (QR & Barcode) */}
        {(showQr || template.elements?.barcode !== false) && (
          <div className="w-full bg-white/30 backdrop-blur-md border-t border-white/40 flex items-center justify-between px-[5cqi] py-[3cqi] shrink-0 gap-[3cqi] shadow-[0_-4px_10px_rgb(0,0,0,0.02)] relative z-10">
            {template.elements?.barcode !== false ? (
              <div className="bg-white/80 backdrop-blur-md rounded-[1cqi] px-[1cqi] py-[0.5cqi] styled-barcode flex-1 max-w-[60%] shadow-sm border border-white/60">
                <style>{`.styled-barcode svg { height: 8cqi !important; width: 100% !important; max-width: 100% !important; }`}</style>
                <Barcode
                  value={student.id.substring(0, 9).toUpperCase()}
                  width={1.2}
                  height={22}
                  displayValue={true}
                  fontSize={10}
                  margin={0}
                  font={template.fonts?.barcodeInfo?.family || undefined}
                  background="transparent"
                />
              </div>
            ) : <div />}
            
            {showQr && (
              <div className="bg-white/90 backdrop-blur-md p-[1.2cqi] rounded-[1.5cqi] shadow-sm shrink-0 border border-white/60">
                <QRCodeSection
                  studentId={student.id}
                  customValue={`${window.location.origin}/verify/${student.id}`}
                  parentPhone={student.parentPhone || cardData.parentPhone || "-"}
                  parentEmail={student.parentEmail || cardData.parentEmail || "-"}
                  address={cardData.residenceAddress || student.address || "-"}
                  studentName={student.name}
                  qrSize="11cqi" 
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (isGradient) {
    return (
      <div 
        className={`relative z-10 flex flex-col h-full w-full justify-between bg-white overflow-hidden text-slate-900 shadow-inner`}
      >
        <div className="absolute inset-0 opacity-15" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor !== '#ffffff' ? secondaryColor : primaryColor})` }} />
        
        {/* Top Header */}
        <div className="w-full relative z-10 flex flex-col pt-[4cqi] px-[4cqi] pb-[2cqi] shrink-0" style={{ background: `linear-gradient(to right, ${primaryColor}10, transparent)` }}>
          <div className="flex items-center gap-[3cqi] w-full">
             {cardData.schoolLogo && (
               <div className="w-[12cqi] h-[12cqi] shrink-0 bg-white/80 p-[0.5cqi] rounded-full shadow-sm border border-white backdrop-blur-sm">
                 <img src={cardData.schoolLogo} alt="" className="w-full h-full object-contain" />
               </div>
             )}
             <div className="flex flex-col flex-1 truncate pb-[1cqi]">
               <h2 className="font-extrabold text-[3.8cqi] uppercase tracking-wide leading-tight truncate text-slate-900" style={getStyle('schoolName')}>
                 {cardData.schoolName || "School Name"}
               </h2>
               <span className="text-[2.2cqi] font-bold uppercase tracking-widest opacity-80" style={{ color: primaryColor }}>
                 {isRtl ? "بطاقة مدرسية" : "STUDENT ID"}
               </span>
             </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 flex flex-col w-full relative z-10 px-[4cqi] pt-[1cqi] flex-nowrap min-h-0 overflow-hidden" style={getStyle('contactInfo')}>
          
          {/* Unified Identity Section */}
          <div className="flex items-start gap-[4cqi] w-full bg-white/60 backdrop-blur-md rounded-[3cqi] p-[3cqi] shadow-sm border border-white/50 mb-[3cqi]">
            {showPhoto && (
              <div 
                className={`flex-shrink-0 relative overflow-hidden bg-white shadow-md border-[2px] ${radiusClass}`}
                style={{
                  width: photoSize.width,
                  height: photoSize.height,
                  borderColor: primaryColor
                }}
              >
                {cardData.photoUrl ? (
                  <img
                    src={cardData.photoUrl}
                    alt=""
                    className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-[8cqi] h-[8cqi] text-slate-300" />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-col flex-1 min-w-0 justify-center h-full pt-[0.5cqi]">
              <h3
                className="font-black leading-[1.1] tracking-tight break-words whitespace-normal text-slate-900 drop-shadow-sm mb-[2cqi]"
                style={{ 
                  wordBreak: 'break-word',
                  fontSize: template.fonts?.studentName?.size 
                    ? `${parseFloat(template.fonts.studentName.size.toString()) * 0.49}cqi` 
                    : (student.name.length > 25 ? '4cqi' : '4.8cqi'),
                  ...getStyle('studentName') 
                }}
              >
                {student.name}
              </h3>
              
              <div className="grid grid-cols-2 gap-x-[2cqi] gap-y-[1.5cqi]">
                <div className="flex flex-col bg-white/50 rounded-[1.5cqi] p-[1.5cqi] border border-white/40 shadow-sm">
                   <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "رقم الطالب" : "ID NO."}</span>
                   <span className="font-mono font-bold text-[3cqi] text-slate-800 leading-none truncate">{student.id.substring(0, 10).toUpperCase()}</span>
                </div>
                {template.elements?.className !== false && (
                <div className="flex flex-col bg-white/50 rounded-[1.5cqi] p-[1.5cqi] border border-white/40 shadow-sm">
                   <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "الصف" : "GRADE"}</span>
                   <span className="font-bold text-[3cqi] leading-none truncate" style={{ color: primaryColor }}>{cardData.className || "-"}</span>
                </div>
                )}
                {template.elements?.issueDate && (
                <div className="flex flex-col bg-white/50 rounded-[1.5cqi] p-[1.5cqi] border border-white/40 shadow-sm">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "العام الدراسي" : "YEAR"}</span>
                  <span className="font-mono font-bold text-[3cqi] text-slate-800 leading-none truncate">{cardData.issueDate ? cardData.issueDate.substring(0,4) + "-" + (parseInt(cardData.issueDate.substring(0,4))+1) : "-"}</span>
                </div>
                )}
                {template.elements?.expiryDate && (
                <div className="flex flex-col bg-white/50 rounded-[1.5cqi] p-[1.5cqi] border border-white/40 shadow-sm">
                  <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "الانتهاء" : "EXPIRES"}</span>
                  <span className="font-mono font-bold text-[3cqi] text-slate-800 leading-none truncate">{cardData.expiryDate || cardData.validUntil || "-"}</span>
                </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-row w-full flex-1 min-h-0 gap-[3cqi]">
              {/* Secondary Details Section */}
              <div className="flex flex-1 flex-col justify-start gap-[1.5cqi]">
                {template.elements?.guardianName && (
                  <div className="flex items-center justify-between border-b border-white/40 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "ولي الأمر" : "GUARDIAN"}</span>
                    <span className="font-bold text-[2.4cqi] text-slate-800 truncate pl-[2cqi] rtl:pr-[2cqi] rtl:pl-0 max-w-[60%] text-end">{cardData.guardianName || student.guardianName || "-"}</span>
                  </div>
                )}
                
                {template.elements?.parentPhone !== false && (
                  <div className="flex items-center justify-between border-b border-white/40 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "هاتف ولي الأمر" : "PARENT TEL"}</span>
                    <span className="font-mono font-bold text-[2.4cqi] text-slate-800">{student.parentPhone || "-"}</span>
                  </div>
                )}

                {template.elements?.driverPhone && (
                  <div className="flex items-center justify-between border-b border-white/40 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "السائق" : "DRIVER"}</span>
                    <span className="font-bold text-[2.4cqi] text-slate-800 truncate pl-[2cqi] rtl:pr-[2cqi] rtl:pl-0 max-w-[65%] text-end">
                      {cardData.driverName ? `${cardData.driverName} - ${cardData.driverPhone}` : cardData.driverPhone}
                    </span>
                  </div>
                )}
                
                {template.elements?.schoolPhone && (
                  <div className="flex items-center justify-between border-b border-white/40 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-500">{isRtl ? "هاتف المدرسة" : "SCHOOL TEL"}</span>
                    <span className="font-mono font-bold text-[2.4cqi] text-slate-800">{cardData.schoolPhone || "-"}</span>
                  </div>
                )}
              </div>

              {/* QR Code Container */}
              {showQr && (
                <div className="w-[18cqi] flex flex-col items-center justify-end pb-[1cqi] shrink-0 border-l border-white/40 pl-[3cqi]  rtl:border-l-0 rtl:pl-0 rtl:border-r rtl:pr-[3cqi]">
                  <div className="bg-white/80 backdrop-blur-sm p-[1cqi] rounded-[2cqi] shadow-sm border border-white">
                    <QRCodeSection
                      studentId={student.id}
                      customValue={`${window.location.origin}/verify/${student.id}`}
                      parentPhone={student.parentPhone || cardData.parentPhone || "-"}
                      parentEmail={student.parentEmail || cardData.parentEmail || "-"}
                      address={cardData.residenceAddress || student.address || "-"}
                      studentName={student.name}
                      qrSize="16cqi" 
                    />
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Footer (Barcode) */}
        {template.elements?.barcode !== false && (
          <div className="w-full relative z-10 flex flex-col items-center justify-center px-[4cqi] py-[2.5cqi] shrink-0 bg-white/40 backdrop-blur-sm mt-[2cqi] border-t border-white/50">
            <div className="styled-gradient-barcode w-full flex justify-center">
              <style>{`.styled-gradient-barcode svg { height: 8cqi !important; width: 100% !important; max-width: 80% !important; }`}</style>
              <Barcode
                value={student.id.substring(0, 9).toUpperCase()}
                width={1.5}
                height={24}
                displayValue={true}
                fontSize={10}
                margin={0}
                font={template.fonts?.barcodeInfo?.family || undefined}
                background="transparent"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isDark) {
    return (
      <div 
        className={`relative z-10 flex flex-col h-full w-full justify-between bg-slate-900 overflow-hidden text-slate-100 shadow-2xl`}
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-full h-[60%] blur-[100px] opacity-20 bg-gradient-to-br from-indigo-500 to-purple-600 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[80%] h-[50%] blur-[80px] opacity-10 pointer-events-none" style={{ backgroundColor: primaryColor }} />

        {/* Top Header */}
        <div className="w-full relative z-10 flex flex-col pt-[4cqi] px-[4cqi] pb-[2cqi] shrink-0 border-b border-white/10" style={{ background: 'linear-gradient(to right, rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.4))' }}>
          <div className="flex items-center gap-[3cqi] w-full">
             {cardData.schoolLogo && (
               <div className="w-[12cqi] h-[12cqi] shrink-0 bg-white p-[0.5cqi] rounded-[2cqi] shadow-[0_0_15px_rgba(255,255,255,0.05)] border border-white/20">
                 <img src={cardData.schoolLogo} alt="" className="w-full h-full object-contain" />
               </div>
             )}
             <div className="flex flex-col flex-1 truncate pb-[1cqi]">
               <h2 className="font-extrabold text-[3.6cqi] uppercase tracking-wider leading-tight truncate text-slate-100" style={getStyle('schoolName')}>
                 {cardData.schoolName || "School Name"}
               </h2>
               <span className="text-[2.2cqi] font-bold uppercase tracking-widest opacity-80" style={{ color: primaryColor }}>
                 {isRtl ? "بطاقة مدرسية" : "STUDENT ID"}
               </span>
             </div>
          </div>
        </div>

        {/* Main Section */}
        <div className="flex-1 flex flex-col w-full relative z-10 px-[4cqi] pt-[3cqi] flex-nowrap min-h-0 overflow-hidden" style={getStyle('contactInfo')}>
          
          {/* Identity Section */}
          <div className="flex items-center gap-[3.5cqi] w-full bg-white/5 backdrop-blur-md rounded-[2.5cqi] p-[2.5cqi] shadow-lg border border-white/10 mb-[3cqi]">
            {showPhoto && (
              <div 
                className={`flex-shrink-0 relative overflow-hidden bg-slate-800 shadow-2xl border-[1.5px] ${radiusClass}`}
                style={{
                  width: photoSize.width,
                  height: photoSize.height,
                  borderColor: primaryColor
                }}
              >
                {cardData.photoUrl ? (
                  <img
                    src={cardData.photoUrl}
                    alt=""
                    className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-[8cqi] h-[8cqi] text-slate-600" />
                  </div>
                )}
              </div>
            )}
            
            <div className="flex flex-col flex-1 min-w-0 justify-center h-full">
              <h3
                className="font-black leading-[1.1] tracking-tight break-words whitespace-normal text-slate-50 drop-shadow-md mb-[2cqi]"
                style={{ 
                  wordBreak: 'break-word',
                  fontSize: template.fonts?.studentName?.size 
                    ? `${parseFloat(template.fonts.studentName.size.toString()) * 0.49}cqi` 
                    : (student.name.length > 25 ? '4cqi' : '4.8cqi'),
                  ...getStyle('studentName') 
                }}
              >
                {student.name}
              </h3>
              
              <div className="flex flex-wrap gap-[2cqi]">
                <div className="flex flex-col">
                   <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "رقم الطالب" : "ID NO."}</span>
                   <span className="font-mono font-bold text-[3cqi] text-slate-200 leading-none truncate">{student.id.substring(0, 10).toUpperCase()}</span>
                </div>
                {template.elements?.className !== false && (
                <div className="flex flex-col border-l border-white/20 pl-[2cqi] rtl:border-l-0 rtl:border-r rtl:pl-0 rtl:pr-[2cqi]">
                   <span className="text-[1.8cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "الصف" : "GRADE"}</span>
                   <span className="font-bold text-[3cqi] leading-none truncate" style={{ color: primaryColor }}>{cardData.className || "-"}</span>
                </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-row w-full flex-1 min-h-0 gap-[3cqi]">
              {/* Secondary Details Section */}
              <div className="flex flex-1 flex-col justify-start gap-[1.5cqi]">
                {template.elements?.guardianName && (
                  <div className="flex items-center justify-between border-b border-white/10 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "ولي الأمر" : "GUARDIAN"}</span>
                    <span className="font-bold text-[2.4cqi] text-slate-200 truncate pl-[2cqi] rtl:pr-[2cqi] rtl:pl-0 max-w-[65%] text-end">{cardData.guardianName || student.guardianName || "-"}</span>
                  </div>
                )}
                
                {template.elements?.parentPhone !== false && (
                  <div className="flex items-center justify-between border-b border-white/10 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "هاتف" : "PHONE"}</span>
                    <span className="font-mono font-bold text-[2.4cqi] text-slate-200">{student.parentPhone || "-"}</span>
                  </div>
                )}

                {template.elements?.driverPhone && (
                  <div className="flex items-center justify-between border-b border-white/10 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "السائق" : "DRIVER"}</span>
                    <span className="font-bold text-[2.4cqi] text-slate-200 truncate pl-[2cqi] rtl:pr-[2cqi] rtl:pl-0 max-w-[65%] text-end">
                      {cardData.driverName ? `${cardData.driverName} - ${cardData.driverPhone}` : cardData.driverPhone}
                    </span>
                  </div>
                )}
                
                {template.elements?.issueDate && (
                  <div className="flex items-center justify-between border-b border-white/10 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "الإصدار" : "ISSUED"}</span>
                    <span className="font-mono font-bold text-[2.4cqi] text-slate-200">{cardData.issueDate || "-"}</span>
                  </div>
                )}
                {template.elements?.expiryDate && (
                  <div className="flex items-center justify-between border-b border-white/10 pb-[1.2cqi] last:border-0">
                    <span className="text-[2cqi] font-bold uppercase tracking-widest text-slate-400">{isRtl ? "الانتهاء" : "EXPIRES"}</span>
                    <span className="font-mono font-bold text-[2.4cqi] text-slate-200">{cardData.expiryDate || cardData.validUntil || "-"}</span>
                  </div>
                )}
              </div>

              {/* QR Code Container */}
              {showQr && (
                <div className="w-[18cqi] flex flex-col items-center justify-end pb-[1cqi] shrink-0 border-l border-white/10 pl-[3cqi] rtl:border-l-0 rtl:pl-0 rtl:border-r rtl:pr-[3cqi]">
                  <div className="bg-white p-[1.5cqi] rounded-[1.5cqi] shadow-[0_0_15px_rgba(255,255,255,0.1)] border border-white/20">
                    <QRCodeSection
                      studentId={student.id}
                      customValue={`${window.location.origin}/verify/${student.id}`}
                      parentPhone={student.parentPhone || cardData.parentPhone || "-"}
                      parentEmail={student.parentEmail || cardData.parentEmail || "-"}
                      address={cardData.residenceAddress || student.address || "-"}
                      studentName={student.name}
                      qrSize="15.5cqi" 
                    />
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* Footer (Barcode) */}
        {template.elements?.barcode !== false && (
          <div className="w-full relative z-10 flex flex-col items-center justify-center px-[4cqi] py-[2cqi] shrink-0 bg-slate-950/60 mt-[1cqi] border-t border-white/10 backdrop-blur-md">
            <div className="styled-dark-barcode w-full flex justify-center bg-white/95 py-[0.5cqi] rounded-[1.5cqi] shadow-inner">
              <style>{`.styled-dark-barcode svg { height: 7cqi !important; width: 100% !important; max-width: 80% !important; }`}</style>
              <Barcode
                value={student.id.substring(0, 9).toUpperCase()}
                width={1.5}
                height={20}
                displayValue={true}
                fontSize={10}
                margin={0}
                font={template.fonts?.barcodeInfo?.family || undefined}
                background="transparent"
                lineColor="#000000"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`relative z-10 flex flex-col h-full w-full justify-between ${bgClasses} overflow-hidden`}
    >
      {/* Premium Watermark */}
      {cardData.schoolLogo && (
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.03] pointer-events-none mix-blend-multiply dark:mix-blend-screen scale-[1.5]">
          <img src={cardData.schoolLogo} alt="" className="w-2/3 h-2/3 object-contain" />
        </div>
      )}

      {/* Premium Header */}
      {template.elements?.schoolLogo !== false && (
        <div
          className="w-full flex items-center px-[3cqi] shadow-sm relative shrink-0 border-b"
          style={{
            background: isDark ? "#1e293b" : headerGradient,
            height: isSmallCard ? "22cqi" : (isExecutive ? "30cqi" : "26cqi"),
            borderColor: isDark ? "#334155" : "transparent",
            borderBottomRightRadius: "4cqi",
            borderBottomLeftRadius: "4cqi",
          }}
        >
          <div className="relative z-10 w-full flex items-center justify-between gap-[2cqi] overflow-hidden">
            {/* Left - Logo */}
            <div
              className="w-[14cqi] h-[14cqi] rounded-full flex items-center justify-center shrink-0 border bg-white shadow-sm overflow-hidden"
              style={{ borderColor: "rgba(255,255,255,0.2)" }}
            >
              {cardData.schoolLogo ? (
                <img
                  src={cardData.schoolLogo}
                  alt="Logo"
                  className="w-full h-full object-contain p-[1cqi]"
                />
              ) : (
                <GraduationCap
                  className="w-[6cqi] h-[6cqi]"
                  style={{ color: isDark ? secondaryColor : primaryColor }}
                />
              )}
            </div>

            {/* Center - Text */}
            <div className="flex-1 flex flex-col items-center justify-center overflow-hidden h-full">
              <h2
                className="font-extrabold text-[4cqi] leading-tight tracking-tight uppercase truncate w-full text-center"
                style={{ color: secondaryColor, ...getStyle('schoolName') }}
              >
                {cardData.schoolName || "School Name"}
              </h2>
              <div className="mt-[1cqi]">
                <span
                  className="text-[2.5cqi] px-[2.5cqi] py-[1cqi] rounded-full font-extrabold tracking-widest uppercase shadow-md border"
                  style={{
                    color: isDark ? primaryColor : primaryColor,
                    background: isExecutive 
                      ? 'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)' 
                      : secondaryColor,
                    borderColor: isExecutive ? 'rgba(255, 215, 0, 0.3)' : 'transparent',
                    textShadow: isExecutive ? '0 1px 1px rgba(255,255,255,0.8)' : undefined,
                    ...getStyle('cardTitle')
                  }}
                >
                  {isRtl ? "بطاقة هوية طالب" : "STUDENT ID CARD"}
                </span>
              </div>
            </div>

            {/* Right - Academic Year */}
            <div
              className="w-[14cqi] h-[14cqi] rounded flex flex-col items-center justify-center shrink-0 shadow-sm"
              style={{
                backgroundColor: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                backdropFilter: "blur(4px)",
              }}
            >
              <span
                className="text-[2cqi] font-bold uppercase opacity-90 tracking-wider"
                style={{ color: secondaryColor }}
              >
                {isRtl ? "عام" : "YEAR"}
              </span>
              <span
                className="text-[3.25cqi] font-black leading-none mt-[0.5cqi]"
                style={{ color: secondaryColor }}
              >
                {new Date().getFullYear()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full flex flex-col items-center px-[4cqi] pt-[1.5cqi] min-h-0 overflow-hidden relative">
        {/* Photo Area */}
        {showPhoto && (
          <div className="relative shrink flex flex-col items-center justify-center min-h-[15cqi] mb-[0.5cqi]">
            <div className={`relative flex items-center justify-center`}
                 style={{
                   width: photoSize.width,
                   height: photoSize.height,
                   maxHeight: "50%",
                 }}
            >
              <div
                className={`absolute inset-0 ${blurRadiusClass} opacity-40 blur-[2px]`}
                style={{ padding: '0.5cqi', background: `linear-gradient(to top right, ${primaryColor}, rgba(253, 230, 138, 0.5))` }}
              />
              <div
                className={`relative w-full h-full ${radiusClass} overflow-hidden shadow-2xl z-10 flex items-center justify-center`}
                style={{
                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",
                  border: isExecutive ? `1.5px solid rgba(255, 215, 0, 0.4)` : `2px solid ${photoSettings.borderColor || (isDark ? '#334155' : '#e2e8f0')}`,
                }}
              >
                {cardData.photoUrl ? (
                  <img
                    src={cardData.photoUrl}
                    alt=""
                    className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <ImageIcon className="w-[12cqi] h-[12cqi] opacity-20" />
                )}
              </div>
              {/* Subtle inner shadow overlay */}
              <div className={`absolute inset-0 z-20 ${radiusClass} shadow-[inset_0_0_10px_rgba(0,0,0,0.1)] pointer-events-none`} />
            </div>
          </div>
        )}

        {/* Student Name & Class */}
        <div 
          className="text-center mt-[0.5cqi] w-full shrink-0 px-[1.5cqi] flex flex-col items-center"
          style={{ containerType: 'inline-size' }}
        >
          <h3
            className="font-black leading-tight text-center tracking-wide"
            style={{ 
              color: isDark ? "white" : textColor, 
              fontSize: template.fonts?.studentName?.size ? `${parseFloat(template.fonts.studentName.size.toString()) * 0.49}cqi` : `5.5cqi`,
              wordBreak: 'break-word',
              textShadow: '0 2px 4px rgba(0,0,0,0.05)',
              ...getStyle('studentName') 
            }}
          >
            {student.name}
          </h3>
          {template.elements?.className !== false && (
            <p
              className="text-[3.5cqi] font-bold mt-[1.5cqi] leading-none px-[2.5cqi] py-[1.2cqi] rounded-full inline-block uppercase tracking-widest shadow-sm border"
              style={{
                color: isDark ? "#cbd5e1" : primaryColor,
                backgroundColor: isDark ? "#1e293b" : "white",
                borderColor: isDark ? "#334155" : `${primaryColor}30`,
              }}
            >
              {cardData.className}
            </p>
          )}
        </div>

        {/* Dynamic Fields Section */}
        <div
          className="w-full flex-1 flex flex-col justify-start mt-[1cqi] gap-[0.75cqi] text-[3.8cqi] shrink min-h-0 overflow-hidden"
          style={{ color: isDark ? "#cbd5e1" : textColor, ...getStyle('contactInfo') }}
        >
          {/* Group 1: Student Primary Identifiers */ }
          <div className="grid grid-cols-2 gap-[2cqi]">
            <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/30 p-[1.5cqi] rounded-[1.5cqi] border border-slate-100 dark:border-slate-800/50 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-[0.75cqi] bg-[#0B2345] rounded-l-[1.5cqi]"></div>
              <span className="opacity-60 font-semibold text-[2.8cqi] tracking-wider mb-[0.25cqi] pl-[1.5cqi] rtl:pl-0 rtl:pr-[1.5cqi]">
                {isRtl ? "رقم الطالب" : "ID NUMBER"}
              </span>
              <span className="font-mono font-bold tracking-widest truncate pl-[1.5cqi] rtl:pl-0 rtl:pr-[1.5cqi]">
                {student.id.substring(0, 8).toUpperCase()}
              </span>
            </div>
            {template.elements?.examNumber && (
              <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/30 p-[1.5cqi] rounded-[1.5cqi] border border-slate-100 dark:border-slate-800/50 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-[0.75cqi] bg-amber-500 rounded-l-[1.5cqi]"></div>
                <span className="opacity-60 font-semibold text-[2.8cqi] tracking-wider mb-[0.25cqi] pl-[1.5cqi] rtl:pl-0 rtl:pr-[1.5cqi]">
                  {isRtl ? "الرقم الامتحاني" : "EXAM NUMBER"}
                </span>
                <span className="font-mono font-bold tracking-widest truncate pl-[1.5cqi] rtl:pl-0 rtl:pr-[1.5cqi]">
                  {cardData.examNumber || student.examNumber || "-"}
                </span>
              </div>
            )}
          </div>

          {/* Issue & Expiry Dates */}
          {(template.elements?.issueDate || template.elements?.expiryDate) && (
            <div className={`grid ${template.elements?.issueDate && template.elements?.expiryDate ? 'grid-cols-2' : 'grid-cols-1'} gap-[2cqi] mt-[0.5cqi]`}>
              {template.elements?.issueDate && (
                 <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/30 p-[1.25cqi] rounded-[1.5cqi] border border-slate-100 dark:border-slate-800/50">
                    <span className="opacity-60 font-semibold text-[2.6cqi] tracking-wider mb-[0.2cqi]">
                      {isRtl ? "تاريخ الإصدار" : "ISSUE DATE"}
                    </span>
                    <span className="font-mono font-bold text-[3cqi]">
                      {cardData.issueDate || "-"}
                    </span>
                 </div>
              )}
              {template.elements?.expiryDate && (
                 <div className="flex flex-col bg-slate-50/50 dark:bg-slate-800/30 p-[1.25cqi] rounded-[1.5cqi] border border-slate-100 dark:border-slate-800/50">
                    <span className="opacity-60 font-semibold text-[2.6cqi] tracking-wider mb-[0.2cqi]">
                      {isRtl ? "تاريخ الانتهاء" : "EXPIRY DATE"}
                    </span>
                    <span className="font-mono font-bold text-[3cqi]">
                      {cardData.expiryDate || cardData.validUntil || "-"}
                    </span>
                 </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-[0.75cqi] bg-slate-50/30 dark:bg-slate-800/20 p-[1.5cqi] rounded-[2cqi] mt-[0.5cqi]">
            {/* Guardian Info */}
            {template.elements?.guardianName && (
              <div className="flex justify-between items-center pb-[0.5cqi] border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                <span className="opacity-60 font-semibold text-[3cqi] tracking-wider flex items-center gap-[1cqi]">
                   <span className="w-[1cqi] h-[1cqi] rounded-full bg-slate-300 dark:bg-slate-600"></span>
                  {isRtl ? "ولي الأمر:" : "GUARDIAN:"}
                </span>
                <span className="font-bold truncate max-w-[46cqi] text-[3.2cqi]">
                  {cardData.guardianName || student.guardianName || "-"}
                </span>
              </div>
            )}
            {template.elements?.parentPhone !== false && (
              <div className="flex justify-between items-center pb-[0.5cqi] border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                <span className="opacity-60 font-semibold flex items-center gap-[1cqi] text-[3cqi] tracking-wider">
                  <Phone className="w-[3cqi] h-[3cqi]" />{" "}
                  {isRtl ? "هاتف ولي الأمر:" : "GUARDIAN MSG:"}
                </span>
                <span className="font-mono font-bold text-[3.2cqi]">
                  {student.parentPhone || "-"}
                </span>
              </div>
            )}

            {/* Driver Info */}
            {template.elements?.driverName && (
              <div className="flex justify-between items-center pb-[0.5cqi] border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                <span className="opacity-60 font-semibold flex items-center gap-[1cqi] text-[3cqi] tracking-wider">
                  <Car className="w-[3cqi] h-[3cqi]" /> {isRtl ? "السائق:" : "DRIVER:"}
                </span>
                <span className="font-bold truncate max-w-[46cqi] text-[3.2cqi]">
                  {cardData.driverName || "-"}
                </span>
              </div>
            )}
            {template.elements?.driverPhone && (
              <div className="flex justify-between items-center pb-[0.5cqi] border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                <span className="opacity-60 font-semibold flex items-center gap-[1cqi] text-[3cqi] tracking-wider">
                  <Phone className="w-[3cqi] h-[3cqi]" /> {isRtl ? "هاتف السائق:" : "DRIVER MSG:"}
                </span>
                <span className="font-mono font-bold text-[3.2cqi]">
                  {cardData.driverPhone || "-"}
                </span>
              </div>
            )}

            {/* School Contact Data */}
            {template.elements?.schoolPhone && (
              <div className="flex justify-between items-center pb-[0.5cqi] border-b border-slate-200/50 dark:border-slate-700/50 last:border-0 last:pb-0">
                <span className="opacity-60 font-semibold flex items-center gap-[1cqi] text-[3cqi] tracking-wider">
                  <MapPin className="w-[3cqi] h-[3cqi]" /> {isRtl ? "هاتف المدرسة:" : "SCHOOL TELL:"}
                </span>
                <span className="font-mono font-bold text-[3.2cqi]">
                  {cardData.schoolPhone || "-"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security / QR Section */}
      <div className="w-full flex justify-between items-end px-[4cqi] pb-[2cqi] pt-[0.5cqi] shrink-0 z-20">
        {template.elements?.barcode && (
          <div
            className={`p-[0.5cqi] rounded-lg shrink-0 ${isDark ? "bg-white opacity-95" : "bg-transparent"} flex flex-col items-center styled-barcode`}
            style={getStyle('barcodeInfo')}
          >
            <style>{`.styled-barcode svg { height: 8cqi !important; width: auto !important; max-width: 35cqi !important; }`}</style>
            <Barcode
              value={student.id.substring(0, 9).toUpperCase()}
              width={1}
              height={18}
              displayValue={true}
              fontSize={10}
              margin={0}
              font={template.fonts?.barcodeInfo?.family || undefined}
              background="transparent"
            />
          </div>
        )}
        {showQr && (
          <div
            className={`p-[1cqi] rounded-xl ${isDark ? "bg-white" : "bg-white/80"} shadow-sm`}
            style={getStyle('qrInfo')}
          >
            <QRCodeSection
              studentId={student.id}
              customValue={`${window.location.origin}/verify/${student.id}`}
              parentPhone={student.parentPhone || cardData.parentPhone || "-"}
              parentEmail={student.parentEmail || cardData.parentEmail || "-"}
              address={cardData.residenceAddress || student.address || "-"}
              studentName={student.name}
              qrSize="16cqi" // Size handles scaling gracefully via svg in QRCodeSection
            />
          </div>
        )}
      </div>

    </div>
  );
};
