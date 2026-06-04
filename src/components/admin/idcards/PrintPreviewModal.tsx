import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Printer, Settings2, Users, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import StudentGridPrint from "./StudentGridPrint";
import { IdCardTemplate } from "../../../types/idCardTemplate";
import { printElement } from "../../../lib/printUtils";
import { toast } from "react-hot-toast";
import { mergeIdCardTemplate } from "../../../lib/idCardTemplateUtils";

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: any[];
  idCards: Record<string, any>;
  isRtl: boolean;
  template: IdCardTemplate;
  title: string;
  onAfterPrint?: (printedCount: number) => void;
}

export default function PrintPreviewModal({
  isOpen,
  onClose,
  students,
  idCards,
  isRtl,
  template,
  title,
  onAfterPrint
}: PrintPreviewModalProps) {
  const [layoutMode, setLayoutMode] = useState<"a4" | "pvc">("a4");
  const [printSides, setPrintSides] = useState<"front" | "back" | "both">("front");
  const [previewSide, setPreviewSide] = useState<"front" | "back" | "both">("front");
  const [copies, setCopies] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(100);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set(students.map(s => s.id)));
  const [isConfirmingPrint, setIsConfirmingPrint] = useState<boolean>(false);
  
  const printContentRef = useRef<HTMLDivElement>(null);
  const resolvedTemplate = mergeIdCardTemplate(template);
  const printableStudents = students.filter(
    (s) => selectedStudents.has(s.id) && idCards[s.id],
  );

  useEffect(() => {
    const ids = students.filter((s) => idCards[s.id]).map((s) => s.id);
    setSelectedStudents(new Set(ids));
  }, [students, idCards]);

  useEffect(() => {
    setPreviewSide(printSides);
  }, [printSides]);

  const handlePrint = () => {
    if (printableStudents.length === 0) {
      toast.error(
        isRtl ? "لم يتم تحديد طلاب لديهم هوية صادرة" : "No students with issued cards selected.",
      );
      return;
    }

    if (!printContentRef.current) return;

    const success = printElement(printContentRef.current, title);
    if (!success) {
      toast.error(
        isRtl
          ? "تعذر فتح نافذة الطباعة. اسمح بالنوافذ المنبثقة أو جرّب متصفحاً آخر."
          : "Could not open print dialog. Allow popups or try another browser.",
      );
      return;
    }
    setIsConfirmingPrint(true);
  };

  const toggleStudent = (id: string) => {
    const newSet = new Set(selectedStudents);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedStudents(newSet);
  };

  const selectAll = () => setSelectedStudents(new Set(students.map(s => s.id)));
  const deselectAll = () => setSelectedStudents(new Set());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-7xl h-[90vh] shadow-2xl relative flex flex-col md:flex-row overflow-hidden border border-slate-200 dark:border-slate-800"
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors z-20"
        >
          <X size={24} />
        </button>

        {/* Sidebar Settings */}
        <div className="w-full md:w-[380px] bg-slate-50 dark:bg-slate-800/50 p-6 md:p-8 flex flex-col h-full border-r border-slate-200 dark:border-slate-800 overflow-y-auto custom-scrollbar">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#e8eef5] dark:bg-indigo-900/50 text-[#0B2345] dark:text-indigo-400 font-bold rounded-2xl flex items-center justify-center text-xl">
              <Printer size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white">
                {isRtl ? "إعدادات الطباعة" : "Print Settings"}
              </h2>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                {isRtl ? "معاينة وتخصيص الطباعة" : "Preview & Customize Print"}
              </p>
            </div>
          </div>

          <div className="space-y-6 flex-1">
            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                <Settings2 size={16} />
                {isRtl ? "نظام الورق" : "Paper Layout"}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLayoutMode("a4")}
                  className={`p-3 rounded-2xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-2 ${layoutMode === "a4" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"}`}
                >
                  <span className="text-lg">📄</span>
                  <span>{isRtl ? "ورق A4 متعدد" : "A4 Sheet"}</span>
                </button>
                <button
                  onClick={() => setLayoutMode("pvc")}
                  className={`p-3 rounded-2xl border-2 font-bold transition-all flex flex-col items-center justify-center gap-2 ${layoutMode === "pvc" ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600"}`}
                >
                  <span className="text-lg">🪪</span>
                  <span>{isRtl ? "طابعة PVC" : "PVC Printer"}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{isRtl ? "جوانب الطباعة" : "Print Sides"}</label>
              <select
                value={printSides}
                onChange={(e) => setPrintSides(e.target.value as "front" | "back" | "both")}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
              >
                <option value="front">{isRtl ? "الأمام فقط" : "Front Side Only"}</option>
                <option value="back">{isRtl ? "الخلف فقط" : "Back Side Only"}</option>
                <option value="both">{isRtl ? "الأمام والخلف (وجهين)" : "Both Sides (Front & Back)"}</option>
              </select>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">{isRtl ? "عدد النسخ للطالب" : "Copies per Student"}</label>
              <input
                type="number"
                min="1"
                max="10"
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            {students.length > 1 && (
              <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                    <Users size={16} />
                    {isRtl ? "تحديد الطلاب" : "Select Students"}
                  </label>
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs font-bold text-[#0B2345] hover:text-indigo-700 dark:text-indigo-400">All</button>
                    <button onClick={deselectAll} className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400">None</button>
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {students
                    .filter((student) => idCards[student.id])
                    .map((student) => (
                    <label key={student.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-xl cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedStudents.has(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="w-4 h-4 rounded text-[#0B2345] focus:ring-indigo-600"
                      />
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{student.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 space-y-4">
             <div className="flex justify-between text-sm font-medium text-slate-500 dark:text-slate-400">
               <span>{isRtl ? "إجمالي البطاقات" : "Total Cards to Print"}:</span>
               <span className="font-bold text-[#0B2345] dark:text-indigo-400 text-lg">{printableStudents.length * copies * (printSides === 'both' ? 2 : 1)}</span>
             </div>
            <button
              onClick={() => handlePrint()}
              disabled={printableStudents.length === 0}
              className="w-full bg-[#0B2345] text-white font-bold py-4 rounded-xl hover:bg-indigo-700 transition-colors shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Printer size={20} />
              {isRtl ? "طـبـاعـة الآن" : "Print Now"}
            </button>
          </div>
        </div>

        {/* Preview Area */}
        <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-4 md:p-8 flex flex-col items-center overflow-auto custom-scrollbar relative">
          {/* Zoom Controls */}
          <div className="sticky top-0 z-10 flex gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-2 rounded-xl mb-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <button onClick={() => setZoom(Math.max(25, zoom - 25))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Zoom Out">
              <ZoomOut size={18} className="text-slate-600 dark:text-slate-300" />
            </button>
            <div className="flex items-center justify-center w-16 font-mono font-bold text-sm text-slate-700 dark:text-slate-300">
              {zoom}%
            </div>
            <button onClick={() => setZoom(Math.min(200, zoom + 25))} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Zoom In">
              <ZoomIn size={18} className="text-slate-600 dark:text-slate-300" />
            </button>
            <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
            <button onClick={() => setZoom(100)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors" title="Reset Zoom">
              <Maximize size={18} className="text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="transform origin-top transition-transform duration-200 bg-white p-[10mm] shadow-2xl" style={{ minWidth: layoutMode === 'a4' ? '210mm' : 'auto', transform: `scale(${zoom / 100})` }}>
            {/* Visual Preview Mode Tabs */}
            {printSides === "both" && (
              <div className="flex justify-center mb-6 border-b border-slate-200 dark:border-slate-800 pb-2 gap-4 print:hidden">
                <button
                  onClick={() => setPreviewSide("both")}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${previewSide === "both" ? "bg-[#e8eef5] dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  {isRtl ? "عرض الكل" : "Show Both"}
                </button>
                <button
                  onClick={() => setPreviewSide("front")}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${previewSide === "front" ? "bg-[#e8eef5] dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  {isRtl ? "الواجهة الأمامية" : "Front Preview"}
                </button>
                <button
                  onClick={() => setPreviewSide("back")}
                  className={`px-4 py-2 rounded-xl font-bold transition-all ${previewSide === "back" ? "bg-[#e8eef5] dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                  {isRtl ? "الواجهة الخلفية" : "Back Preview"}
                </button>
              </div>
            )}

            {/* Visual Preview (Non-Printable) */}
             <StudentGridPrint
                students={printableStudents}
                idCards={idCards}
                isRtl={isRtl}
                template={resolvedTemplate}
                printSides={previewSide}
                copies={copies}
                layoutMode={layoutMode}
              />
          </div>
        </div>
      </motion.div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmingPrint && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-[#e8eef5] dark:bg-indigo-900/50 text-[#0B2345] dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Printer size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold font-display text-slate-900 dark:text-white mb-2">
                    {isRtl ? "هل تمت الطباعة بنجاح؟" : "Did the document print successfully?"}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    {isRtl
                      ? "الرجاء تأكيد إذا تم طباعة المستند بشكل صحيح من الطابعة الخاصة بك. في حال الإلغاء لن يتم تسجيل العملية."
                      : "Please confirm if your document finished printing from your system printer. If you cancelled, do not confirm."}
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button
                    onClick={() => setIsConfirmingPrint(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold py-3 px-4 rounded-xl transition-colors"
                  >
                    {isRtl ? "لم يتم الطباعة (إلغاء)" : "No, it failed or I cancelled"}
                  </button>
                  <button
                    onClick={() => {
                      setIsConfirmingPrint(false);
                      onAfterPrint?.(printableStudents.length * copies);
                      onClose();
                    }}
                    className="flex-1 bg-[#0B2345] hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    {isRtl ? "نعم، تمت الطباعة بنجاح" : "Yes, Printed Successfully"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden Print Pipeline */}
      <div style={{ display: 'none' }}>
        <div ref={printContentRef}>
          <StudentGridPrint
            students={printableStudents}
            idCards={idCards}
            isRtl={isRtl}
            template={resolvedTemplate}
            printSides={printSides}
            copies={copies}
            layoutMode={layoutMode}
          />
        </div>
      </div>

    </div>
  );
}
