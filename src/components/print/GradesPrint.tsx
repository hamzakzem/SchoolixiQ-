import React, { forwardRef } from 'react';
import { GraduationCap } from 'lucide-react';

interface GradesPrintProps {
  profile: any;
  selectedYear: string;
  selectedTerm: string;
  printTarget: any | null; // if null, print all
  students: any[];
  subjects: string[];
  getStudentGrade: (studentId: string, subject: string) => any;
  notes?: string;
  gradeColumns: any;
}

const GradesPrint = forwardRef<HTMLDivElement, GradesPrintProps>(
  ({ profile, selectedYear, selectedTerm, printTarget, students, subjects, getStudentGrade, gradeColumns }, ref) => {
    const isIndividual = printTarget != null;

    return (
        <div ref={ref} className={`print-cert-wrapper bg-white text-black relative mx-auto ${isIndividual ? 'w-full max-w-[210mm] min-h-[297mm] p-[15mm]' : 'w-full max-w-[297mm] min-h-[210mm] p-[10mm]'}`} dir="rtl">
          <style dangerouslySetInnerHTML={{__html: `
            @media print {
              @page {
                size: A4 ${isIndividual ? 'portrait' : 'landscape'};
                margin: 0;
              }
              body {
                background: white;
                margin: 0;
                padding: 0;
              }
              .print-cert-wrapper {
                width: 100% !important;
                height: 100vh !important;
                max-width: none !important;
                min-height: 100vh !important;
                padding: ${isIndividual ? '15mm' : '10mm'} !important;
                margin: 0 !important;
                box-sizing: border-box !important;
                overflow: hidden !important;
              }
            }
          `}} />

          {/* Certificate Frames */}
          <div className="absolute border-[3pt] border-double border-slate-900 pointer-events-none" style={{ inset: isIndividual ? '10mm' : '8mm' }}></div>
          <div className="absolute border-[1pt] border-slate-900 pointer-events-none" style={{ inset: isIndividual ? '12mm' : '10mm' }}></div>
          
          <div className="relative z-10 flex flex-col h-full bg-white">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
              {profile?.schoolLogo && (
                 <img src={profile.schoolLogo} alt="Watermark" className="w-96 h-96 object-contain grayscale" />
              )}
            </div>

            {/* Institutional Header */}
            <div className={`flex justify-between items-start ${isIndividual ? 'mb-10 pb-6' : 'mb-6 pb-4'} border-b-2 border-black pt-4 px-4`}>
              <div className="text-right space-y-1.5 w-1/3">
                <p className="text-lg font-black text-slate-800">جمهورية العراق</p>
                <p className="text-base font-bold text-slate-700">وزارة التربية</p>
                <p className="text-base font-bold text-slate-700">{profile?.schoolName}</p>
                <p className="text-xs font-bold text-slate-600">المديرية العامة للتربية</p>
              </div>
              
              <div className="flex flex-col items-center w-1/3 mt-2 justify-center">
                <div className="w-24 h-24 flex items-center justify-center p-2 mb-2">
                  {profile?.schoolLogo ? (
                    <img src={profile.schoolLogo} alt="Logo" className="w-full h-full object-contain filter grayscale contrast-125" />
                  ) : (
                    <div className="w-20 h-20 border-2 border-slate-800 rounded-full flex flex-col items-center justify-center bg-slate-50 text-slate-800">
                      <GraduationCap size={32} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] font-black tracking-[0.2em] px-3 py-1 bg-slate-100 border border-slate-300 rounded text-slate-800">وثيقة رسمية</p>
              </div>

              <div className="text-left space-y-2 w-1/3 pl-4 mt-2">
                <p className="text-[11px] font-bold text-slate-700 flex justify-end gap-2"><span className="text-slate-500">الرقم:</span> <span className="font-mono tabular-nums">{Math.random().toString(36).substring(2, 8).toUpperCase()}</span></p>
                <p className="text-[11px] font-bold text-slate-700 flex justify-end gap-2"><span className="text-slate-500">التاريخ:</span> <span>{new Date().toLocaleDateString('ar-EG')}</span></p>
                <p className="text-[11px] font-bold text-slate-700 flex justify-end gap-2"><span className="text-slate-500">العام الدراسي:</span> <span>{selectedYear}</span></p>
                <p className="text-[11px] font-bold text-slate-700 flex justify-end gap-2"><span className="text-slate-500">الفصل:</span> <span>{selectedTerm}</span></p>
              </div>
            </div>

            {/* Title Section */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black text-slate-900 border-b-4 border-double border-slate-900 inline-block pb-2 px-12 mb-3">
                {isIndividual ? 'وثيقة درجات الطالب المدرسية' : 'سجل نتائج الطلاب الموحد'}
              </h1>
              <p className="text-[13px] font-bold text-slate-600">بناءً على السجلات الرسمية للمدرسة، ندرج أدناه نتائج التقييم الأكاديمي</p>
            </div>

            {/* Document Details Table */}
            <div className="mb-6 px-4">
              {isIndividual ? (
                <div className="border border-slate-400 p-4 bg-slate-50 shadow-sm flex justify-between items-center rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-500">اسم الطالب رباعياً:</span>
                    <span className="text-xl font-black text-slate-900">{printTarget.name}</span>
                  </div>
                </div>
              ) : (
                <div className="border-l-4 border-slate-800 p-3 bg-slate-100/80 rounded-r-lg">
                  <span className="text-sm font-bold text-slate-800 ml-2">ملاحظة القوائم:</span>
                  <span className="text-xs font-bold text-slate-600">هذا السجل يتضمن النتائج الكلية لجميع الطلاب ويعد وثيقة رسمية لا يجوز التلاعب بها.</span>
                </div>
              )}
            </div>

            {/* Grades Table */}
            <div className={`overflow-x-auto w-full px-4 ${isIndividual ? 'flex-1' : ''}`}>
              <table className="w-full border-collapse border-[1.5pt] border-slate-900 text-xs shadow-sm bg-white">
                <thead>
                  <tr className="bg-slate-100 text-slate-900">
                    {isIndividual ? (
                      <>
                        <th className="border-[1.5pt] border-slate-900 px-3 py-4 text-right w-1/4 font-black text-sm">المادة الدراسية</th>
                        <th className="border-[1.5pt] border-slate-900 px-2 py-4 text-center font-bold text-sm">الدرجة العظمى</th>
                        <th className="border-[1.5pt] border-slate-900 px-2 py-4 text-center font-black text-sm">الدرجة الحاصل عليها</th>
                        <th className="border-[1.5pt] border-slate-900 px-2 py-4 text-center font-bold text-sm">حالة المادة</th>
                        <th className="border-[1.5pt] border-slate-900 px-3 py-4 text-center w-1/4 font-bold">الملاحظات</th>
                      </>
                    ) : (
                      <>
                        <th rowSpan={1} className="border-[1.5pt] border-slate-900 px-1 py-3 text-center w-8 font-black">ت</th>
                        <th rowSpan={1} className="border-[1.5pt] border-slate-900 px-2 py-3 text-right w-48 font-black">اسم الطالب</th>
                        {subjects.map(subj => (
                          <th key={subj} colSpan={1} className="border-[1.5pt] border-slate-900 py-2 text-center text-xs font-bold w-24 overflow-hidden text-ellipsis max-w-[80px]" title={subj}>{subj}</th>
                        ))}
                        <th rowSpan={1} className="border-[1.5pt] border-slate-900 px-2 py-3 text-center w-24 font-black">النتيجة</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isIndividual ? (
                    subjects.map((subj, idx) => {
                      const data = getStudentGrade(printTarget.id, subj);
                      const isFailed = (data?.percentage || 0) < 50 && data?.score !== undefined;
                      const hasGrade = data?.score !== undefined;
                      
                      return (
                        <tr key={subj} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} transition-colors`}>
                          <td className="border-[1.5pt] border-slate-900 px-3 py-3.5 font-black text-right text-sm">{subj}</td>
                          <td className="border-[1.5pt] border-slate-900 px-2 text-center font-bold text-sm text-slate-500">{hasGrade ? data.maxScore : '-'}</td>
                          <td className={`border-[1.5pt] border-slate-900 px-2 text-center font-black text-lg ${isFailed ? 'text-rose-600' : 'text-slate-900'}`}>
                            {hasGrade ? data.score : '-'}
                          </td>
                          <td className={`border-[1.5pt] border-slate-900 px-2 text-center font-bold text-sm ${isFailed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {hasGrade ? (isFailed ? "مكمل" : "ناجح") : '-'}
                          </td>
                          <td className="border-[1.5pt] border-slate-900 px-2 text-center text-xs font-bold text-slate-500 bg-slate-50/30">
                             {/* متروك فارغ لاملائه يدوياً من قبل المدرسة */}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    students.map((student, idx) => {
                      let failedCount = 0;
                      const studentSubjectsData = subjects.map(subj => {
                        const data = getStudentGrade(student.id, subj);
                        if ((data?.percentage || 0) < 50 && data?.score !== undefined) {
                          failedCount++;
                        }
                        return data;
                      });
                      const isFailed = failedCount > 0;
                      
                      return (
                        <tr key={student.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                          <td className="border-[1.5pt] border-slate-900 px-1 py-2 text-center font-bold text-xs">{idx + 1}</td>
                          <td className="border-[1.5pt] border-slate-900 px-2 py-2 font-black text-right truncate max-w-[12rem] text-xs">{student.name}</td>
                          {studentSubjectsData.map((data, i) => {
                            const isSubjFailed = (data?.percentage || 0) < 50 && data?.score !== undefined;
                            const hasGrade = data?.score !== undefined;
                            return (
                              <td key={i} className={`border-[1.5pt] border-slate-900 text-center font-black text-sm py-2 ${isSubjFailed ? 'bg-rose-100 text-rose-800' : 'bg-white text-slate-900'}`}>
                                {hasGrade ? data.score : '-'}
                              </td>
                            );
                          })}
                          <td className="border-[1.5pt] border-slate-900 px-2 py-2 text-center bg-white">
                            {/* تُترك فارغة لاملائها يدوياً من قبل المدرسة */}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              
              {/* Optional overall stats if individual */}
              {isIndividual && (
                <div className="mt-4 flex justify-end relative z-10">
                   <div className="border-[1.5pt] border-slate-900 bg-slate-50/80 px-6 py-3 rounded text-center inline-block min-w-[150px]">
                     <span className="block text-xs font-bold text-slate-500 mb-1">نتيجة التقييم النهائي</span>
                     <span className="block text-lg font-black text-slate-900 mt-2 h-6 border-b border-dashed border-slate-400">
                     </span>
                   </div>
                </div>
              )}
            </div>

            {/* Footer Signatures */}
            <div className={`mt-auto ${isIndividual ? 'pt-12 pb-8' : 'pt-10 pb-6'} flex justify-between items-end px-12 relative w-full z-10`}>
              <div className="text-center z-10 w-48">
                <p className="font-bold mb-12 text-sm text-slate-800">{isIndividual ? 'توقيع ولي أمر الطالب' : 'توقيع لجنة التدقيق'}</p>
                <div className="border-b-[1.5pt] border-dotted border-slate-800 w-full mb-3"></div>
                <p className="text-xs font-bold text-slate-600">{isIndividual ? "ولي الأمر" : "لجنة التدقيق"}</p>
              </div>
              
              <div className="text-center z-10 w-48">
                <p className="font-bold mb-12 text-sm text-slate-800">الختم وإدارة المدرسة</p>
                <div className="border-b-[1.5pt] border-dotted border-slate-800 w-full mb-3"></div>
                <p className="text-xs font-bold text-slate-800 tracking-wider">مدير المدرسة</p>
              </div>
            </div>
            
            {/* Bottom Border Accent */}
            {isIndividual && (
               <div className="h-2 w-full bg-slate-900 absolute bottom-0 left-0"></div>
            )}
          </div>
        </div>
    );
  }
);

GradesPrint.displayName = 'GradesPrint';

export default GradesPrint;
