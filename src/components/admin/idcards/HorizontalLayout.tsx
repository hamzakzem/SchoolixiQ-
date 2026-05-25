import React from "react";
import QRCodeSection from "./QRCodeSection";
import Barcode from "react-barcode";
import { IdCardTemplate } from "../../../types/idCardTemplate";

interface LayoutProps {
  student: any;
  cardData: any;
  isRtl: boolean;
  template: IdCardTemplate;
}

export const HorizontalLayout = ({
  student,
  cardData,
  isRtl,
  template,
}: LayoutProps) => {
  const primaryColor = template.colors?.primary || "#4f46e5";
  const secondaryColor = template.colors?.secondary || "#ffffff";
  const textColor = template.colors?.text || "#1e293b";
  const borderColor = template.colors?.border || "#e2e8f0";

  const showPhoto = template.elements?.studentPhoto !== false;
  const photoSettings = template.photoSettings || {};
  const photoShape = photoSettings.shape || template.elements?.photoShape || "square"; // Rounded Square Style explicitly preferred
  const fitMode = photoSettings.fitMode || "cover";
  
  const showQr = template.elements?.qrCode !== false;
  const showBarcode = template.elements?.barcode !== false;

  const bgStyle = template.background?.type === "solid" && template.background.imageUrl
    ? { backgroundImage: `url(${template.background.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  const getStyle = (elementKey: keyof Omit<IdCardTemplate['fonts'], 'family'|'size'|'weight'|'customFonts'>) => {
    const fSettings = template.fonts?.[elementKey];
    if (!fSettings) return {};
    
    const style: React.CSSProperties = {};
    if (fSettings.family) style.fontFamily = `'${fSettings.family}', sans-serif`;
    if (fSettings.weight && fSettings.weight !== 'normal') style.fontWeight = fSettings.weight as any;
    if (fSettings.size) style.fontSize = `${parseFloat(fSettings.size.toString()) * 0.49 * 0.8}cqi`; // Adjust scale slightly for horizontal if needed
    if (fSettings.letterSpacing) style.letterSpacing = `${parseFloat(fSettings.letterSpacing.toString()) * 0.49}cqi`;
    if (fSettings.lineHeight) style.lineHeight = fSettings.lineHeight;

    return style;
  };

  const getRadiusClass = () => {
    switch (photoShape) {
       case 'circle': return 'rounded-full';
       case 'square': return 'rounded-sm';
       case 'portrait': return 'rounded-md';
       case 'rounded': return 'rounded-[2.5cqi]';
       default: return 'rounded-[1.5cqi]';
    }
  };
  const radiusClass = getRadiusClass();

  return (
    <div className="w-full h-full flex flex-col relative z-10" style={bgStyle}>
      {/* HEADER (15%) */}
      <div 
        className="h-[15%] w-full flex items-center justify-between px-[4cqi] shrink-0"
        style={{
          backgroundColor: primaryColor,
          color: template.colors?.headerText || secondaryColor,
        }}
      >
        <div className="flex items-center gap-[2cqi] h-full flex-1">
          {template.elements?.schoolLogo && cardData.schoolLogo && (
            <img
              src={cardData.schoolLogo}
              alt="School Logo"
              className="h-[75%] object-contain"
              referrerPolicy="no-referrer"
            />
          )}
          <h2
            className="font-bold flex-1 truncate"
            style={{ ...getStyle('schoolName'), fontSize: template.fonts?.schoolName?.size ? getStyle('schoolName').fontSize : '4.5cqi' }}
          >
            {cardData.schoolName}
          </h2>
        </div>
        <div className="shrink-0 flex items-center h-full">
          <span 
            className="font-bold uppercase tracking-widest bg-white/20 px-[2cqi] py-[0.5cqi] rounded-full"
            style={{ fontSize: '3.5cqi' }}
          >
            {isRtl ? "هوية طالب" : "STUDENT ID"}
          </span>
        </div>
      </div>

      {/* BODY (65%) */}
      <div className="h-[65%] w-full flex shrink-0 border-b" style={{ borderColor, color: textColor }}>
        {/* RIGHT SECTION (22%) - Photo */}
        <div className="w-[22%] h-full flex flex-col items-center justify-center border-e" style={{ borderColor }}>
           {showPhoto && (
             <div className="relative flex flex-col items-center w-full px-[1.5cqi]">
               <div 
                 className={`w-full aspect-[4/5] ${radiusClass} overflow-hidden shadow-md flex items-center justify-center`}
                 style={{
                   backgroundColor: "#f8fafc",
                   border: `2px solid ${photoSettings.borderColor || borderColor}`,
                   maxHeight: "95%",
                   maxWidth: "100%"
                 }}
               >
                 {cardData.photoUrl ? (
                   <img
                     src={cardData.photoUrl}
                     alt="Student"
                     className={`w-full h-full object-${fitMode === 'smart' ? 'cover' : fitMode}`}
                     referrerPolicy="no-referrer"
                   />
                 ) : (
                   <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                      <span className="text-[2.5cqi]">{isRtl ? "الصورة" : "PHOTO"}</span>
                   </div>
                 )}
               </div>
             </div>
           )}
        </div>

        {/* CENTER SECTION (60%) - Main Info */}
        <div className="w-[60%] h-full flex flex-col justify-center px-[3cqi] py-[1cqi] gap-[0.8cqi]">
           {/* Section 0 - Student Name */}
           <div className="flex flex-col mb-[0.2cqi] min-h-[4cqi] justify-center">
             <h3 
               className="font-bold whitespace-normal leading-[1.3] text-start" 
               style={{ 
                 ...getStyle('studentName'), 
                 wordBreak: 'break-word',
                 fontSize: template.fonts?.studentName?.size 
                   ? getStyle('studentName').fontSize 
                   : (student.name.length > 25 ? '3.5cqi' : student.name.length > 18 ? '4cqi' : '4.6cqi')
               }}
             >
               {student.name}
             </h3>
           </div>

           {/* Section 1 */}
           <div className="flex flex-col gap-[0.1cqi]">
             <span className="opacity-60 font-medium text-[1.8cqi] tracking-wider uppercase">
               {isRtl ? "رقم الطالب" : "ID NUMBER"}
             </span>
             <span className="font-bold text-[2.8cqi] font-mono tracking-widest break-all leading-tight">
               {student.id.substring(0, 10).toUpperCase()}
             </span>
           </div>

           {/* Section 2 */}
           <div className="grid grid-cols-2 gap-[1.5cqi]">
             {template.elements?.grade && (
               <div className="flex flex-col gap-[0.1cqi]">
                 <span className="opacity-60 font-medium text-[1.8cqi] tracking-wider uppercase">
                   {isRtl ? "الصف" : "GRADE"}
                 </span>
                 <span className="font-bold text-[2.5cqi] truncate" style={getStyle('contactInfo')}>
                   {cardData.className || "-"}
                 </span>
               </div>
             )}
              {template.elements?.issueDate && (
               <div className="flex flex-col gap-[0.1cqi]">
                 <span className="opacity-60 font-medium text-[1.8cqi] tracking-wider uppercase">
                   {isRtl ? "السنة الدراسية" : "YEAR"}
                 </span>
                 <span className="font-bold text-[2.5cqi] font-mono truncate" style={getStyle('contactInfo')}>
                   {cardData.issueDate ? cardData.issueDate.substring(0,4) + "-" + (parseInt(cardData.issueDate.substring(0,4))+1) : "-"}
                 </span>
               </div>
             )}
           </div>

           {/* Section 3 */}
           {(template.elements?.guardianName || template.elements?.driverName) && (
             <div className="grid grid-cols-2 gap-[1.5cqi] pt-[0.5cqi] mt-[0.2cqi] border-t" style={{ borderColor }}>
               {template.elements?.guardianName && (
                 <div className="flex flex-col gap-[0.1cqi]">
                   <span className="opacity-60 font-medium text-[1.8cqi] tracking-wider uppercase">
                     {isRtl ? "ولي الأمر" : "PARENT"}
                   </span>
                   <span className="font-bold text-[2.4cqi] truncate" style={getStyle('contactInfo')}>
                     {cardData.guardianName || student.guardianName || "-"}
                   </span>
                 </div>
               )}
               {template.elements?.driverName && (
                  <div className="flex flex-col gap-[0.1cqi]">
                   <span className="opacity-60 font-medium text-[1.8cqi] tracking-wider uppercase">
                     {isRtl ? "السائق" : "DRIVER"}
                   </span>
                   <span className="font-bold text-[2.4cqi] truncate" style={getStyle('contactInfo')}>
                     {cardData.driverName || "-"}
                   </span>
                 </div>
               )}
             </div>
           )}
        </div>

        {/* LEFT SECTION (18%) - Contact & QR */}
        <div className="w-[18%] h-full flex flex-col justify-center items-center px-[1.5cqi] border-s" style={{ borderColor }}>
           <div className="flex-1 w-full flex flex-col justify-center gap-[1cqi] py-[1cqi]">
             {template.elements?.schoolPhone && (
               <div className="flex flex-col items-center text-center gap-[0.1cqi]">
                 <span className="opacity-60 font-medium text-[1.6cqi] tracking-wider uppercase">
                   {isRtl ? "المدرسة" : "SCHOOL"}
                 </span>
                 <span className="font-bold text-[2.2cqi] font-mono" style={getStyle('contactInfo')}>
                   {cardData.schoolPhone || "-"}
                 </span>
               </div>
             )}
             {template.elements?.parentPhone !== false && (
               <div className="flex flex-col items-center text-center gap-[0.1cqi]">
                 <span className="opacity-60 font-medium text-[1.6cqi] tracking-wider uppercase">
                   {isRtl ? "ولي الأمر" : "PARENT"}
                 </span>
                 <span className="font-bold text-[2.2cqi] font-mono" style={getStyle('contactInfo')}>
                   {student.parentPhone || cardData.parentPhone || "-"}
                 </span>
               </div>
             )}
             {template.elements?.driverPhone && (
               <div className="flex flex-col items-center text-center gap-[0.1cqi]">
                 <span className="opacity-60 font-medium text-[1.6cqi] tracking-wider uppercase">
                   {isRtl ? "السائق" : "DRIVER"}
                 </span>
                 <span className="font-bold text-[2.2cqi] font-mono" style={getStyle('contactInfo')}>
                   {cardData.driverPhone || "-"}
                 </span>
               </div>
             )}
           </div>

           {showQr && (
             <div className="mb-[1.5cqi]">
               <div className="p-[0.5cqi] bg-white rounded-md shadow-sm border mx-auto w-fit" style={{ borderColor }}>
                 <QRCodeSection
                  studentId={student.id}
                  customValue={`${window.location.origin}/verify/${student.id}`}
                  parentPhone={student.parentPhone || cardData.parentPhone || "-"}
                  parentEmail={student.parentEmail || cardData.parentEmail || "-"}
                  address={cardData.residenceAddress || student.address || "-"}
                  studentName={student.name}
                  qrSize="8cqi" // Properly sized for the 18% col
                />
               </div>
             </div>
           )}
        </div>
      </div>

      {/* FOOTER (20%) */}
      <div 
        className="h-[20%] w-full flex flex-col items-center justify-center px-[4cqi] shrink-0"
        style={{
          backgroundColor: `${primaryColor}10`, // 10% opacity
        }}
      >
        {showBarcode && (
          <div className="w-full flex flex-col items-center justify-center">
            <style>{`.styled-horizontal-barcode svg { height: 10cqi !important; width: 100% !important; max-width: 60cqi !important; }`}</style>
            <div className="styled-horizontal-barcode opacity-80 mix-blend-multiply">
              <Barcode
                value={student.id.substring(0, 10).toUpperCase()}
                width={2}
                height={20}
                displayValue={false}
                margin={0}
                background="transparent"
              />
            </div>
            <span className="font-mono font-bold text-[3cqi] tracking-[0.5em] mt-[0.5cqi] opacity-80" style={{ color: textColor }}>
              {student.id.substring(0, 10).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
