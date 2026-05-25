import React, { useState, useEffect } from "react";
import { useAuth } from "../../lib/AuthContext";
import { useLanguage } from "../../lib/LanguageContext";
import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  handleFirestoreError,
  OperationType,
} from "../../lib/firestore-errors";
import { toast } from "react-hot-toast";
import {
  Save,
  LayoutTemplate,
  Palette,
  Type,
  Maximize,
  Settings2,
  Image as ImageIcon,
  UploadCloud,
} from "lucide-react";
import IdCardFontSettings from "../../components/admin/idcards/FontSettings";
import StudentCard from "../../components/admin/idcards/StudentCard";
import { IdCardTemplate } from "../../types/idCardTemplate";
import {
  uploadImageToServer,
  compressImageToBase64,
} from "../../lib/imageUtils";

export default function IdCardSettings() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const isRtl = language === "ar";

  const [template, setTemplate] = useState<IdCardTemplate>({
    layout: "corporate",
    size: "pvc",
    customSize: { width: 54, height: 86 },
    colors: {
      primary: "#4f46e5",
      secondary: "#000000",
      background: "#ffffff",
      text: "#1e293b",
      border: "#e2e8f0",
    },
    fonts: {
      family: "Inter",
      size: "medium",
      weight: "normal",
    },
    elements: {
      schoolLogo: true,
      studentPhoto: true,
      qrCode: true,
      barcode: false,
      grade: true,
      className: true,
      examNumber: false,
      issueDate: false,
      expiryDate: true,
      signature: false,
      stamp: false,
      parentPhone: true,
      parentEmail: false,
      driverPhone: false,
      carNumber: false,
      guardianName: true,
      driverName: true,
      schoolPhone: true,
    },
    background: {
      type: "solid",
      imageUrl: "",
      watermarkText: "",
    },
    printSettings: {
      doubleSided: false,
      copies: 1,
      showCropMarks: false,
      quality: "high",
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!profile?.schoolId) return;
      try {
        const docRef = doc(
          db,
          "schools",
          profile.schoolId,
          "settings",
          "idCardTemplate",
        );
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setTemplate((prev) => ({ ...prev, ...docSnap.data() }));
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, "settings");
      } finally {
        setIsLoading(false);
      }
    };
    fetchTemplate();
  }, [profile]);

  const handleSave = async () => {
    if (!profile?.schoolId) return;
    setIsSaving(true);
    try {
      const docRef = doc(
        db,
        "schools",
        profile.schoolId,
        "settings",
        "idCardTemplate",
      );
      await setDoc(docRef, template);
      toast.success(
        isRtl ? "تم حفظ إعدادات الهوية بنجاح" : "Settings saved successfully",
      );
    } catch (error) {
      toast.error(isRtl ? "فشل الحفظ" : "Failed to save");
      handleFirestoreError(error, OperationType.UPDATE, "settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateElement = (
    key: keyof typeof template.elements,
    value: boolean,
  ) => {
    setTemplate((prev) => ({
      ...prev,
      elements: { ...prev.elements, [key]: value },
    }));
  };

  const updateColor = (key: keyof typeof template.colors, value: string) => {
    setTemplate((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value },
    }));
  };

  const mockStudent = {
    id: "STU-2024-001",
    name: isRtl ? "محمد علي حسن" : "Mohammed Ali Hasan",
    parentPhone: "07712345678",
    parentEmail: "parent@example.com",
    address: isRtl ? "بغداد، المنصور" : "Baghdad, Mansour",
  };

  const mockCardData = {
    schoolName: isRtl ? "مدرسة الاوائل الأهلية" : "Al-Awael School",
    photoUrl: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
    bloodType: "O+",
    transportInfo: isRtl
      ? "الخط الأول - منطقة المنصور"
      : "Bus 1 - Mansour Area",
    driverPhone: "07800000000",
    carNumber: "أ 12345",
    driverName: isRtl ? "أحمد السائق" : "Ahmed Driver",
    guardianName: isRtl ? "محمد علي" : "Mohammed Ali",
    schoolPhone: "07901234567",
    issueDate: "2023-09-01",
    validUntil: "2024-07-01",
    className: isRtl ? "الخامس الإعدادي - أ" : "5th Grade - A",
    residenceAddress: isRtl ? "بغداد، المنصور" : "Baghdad, Mansour",
  };

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div
      className="flex flex-col lg:flex-row gap-6 p-6 max-w-7xl mx-auto"
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Settings Form */}
      <div className="flex-1 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings2 size={24} className="text-indigo-600" />
              {isRtl ? "تخصيص الهوية المدرسية" : "ID Card Customization"}
            </h2>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-all shadow-lg flex items-center gap-2"
            >
              <Save size={18} />
              {isSaving ? "جاري الحفظ..." : "حفظ القالب"}
            </button>
          </div>

          <div className="space-y-8">
            {/* Template Selection */}
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <LayoutTemplate size={18} className="text-slate-500" />
                {isRtl ? "شكل الهوية والتصميم" : "Card Layout & Design"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[
                  {
                    id: "corporate",
                    name: isRtl ? "احترافي (Corporate)" : "Corporate",
                  },
                  { id: "glass", name: isRtl ? "زجاجي (Glass)" : "Glass Card" },
                  {
                    id: "minimal",
                    name: isRtl ? "تعليمي بسيط" : "Minimal Educational",
                  },
                  {
                    id: "executive",
                    name: isRtl ? "متقدم (Executive)" : "Executive School",
                  },
                  {
                    id: "dark",
                    name: isRtl ? "فاخر داكن (Luxury Dark)" : "Luxury Dark",
                  },
                  {
                    id: "gradient",
                    name: isRtl ? "عصري مع تدرج" : "Modern Gradient",
                  },
                  {
                    id: "horizontal",
                    name: isRtl ? "احترافي بالعرض (Horizontal)" : "Professional Horizontal",
                  },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() =>
                      setTemplate((prev) => ({ ...prev, layout: l.id as any }))
                    }
                    className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all ${
                      template.layout === l.id
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        : "border-slate-200 text-slate-600 hover:border-indigo-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600"
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Elements Toggle */}
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-slate-500" />
                {isRtl ? "العناصر المعروضة" : "Displayed Elements"}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(template.elements).filter(([k]) => k !== 'stamp' && k !== 'signature').map(([key, value]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={value as boolean}
                      onChange={(e) =>
                        updateElement(
                          key as keyof typeof template.elements,
                          e.target.checked,
                        )
                      }
                      className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 transition-all"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {isRtl
                        ? {
                            schoolLogo: "شعار المدرسة",
                            studentPhoto: "صورة الطالب",
                            qrCode: "رمز الاستجابة السريعة (QR)",
                            barcode: "الباركود",
                            grade: "الصف",
                            className: "الشعبة",
                            examNumber: "الرقم الامتحاني",
                            issueDate: "تاريخ الإصدار",
                            expiryDate: "تاريخ الانتهاء",
                            signature: "توقيع الإدارة",
                            stamp: "الختم",
                            parentPhone: "رقم ولي الأمر",
                            parentEmail: "إيميل ولي الأمر",
                            driverPhone: "رقم هاتف السائق",
                            carNumber: "رقم السيارة",
                            guardianName: "اسم ولي الأمر",
                            driverName: "اسم السائق",
                            schoolPhone: "رقم هاتف المدرسة",
                          }[key as string] || key
                        : {
                            schoolLogo: "School Logo",
                            studentPhoto: "Student Photo",
                            qrCode: "QR Code",
                            barcode: "Barcode",
                            grade: "Grade",
                            className: "Class",
                            examNumber: "Exam Number",
                            issueDate: "Issue Date",
                            expiryDate: "Expiry Date",
                            signature: "Signature",
                            stamp: "Stamp",
                            parentPhone: "Parent Phone",
                            parentEmail: "Parent Email",
                            driverPhone: "Driver Phone",
                            carNumber: "Car Number",
                            guardianName: "Guardian Name",
                            driverName: "Driver Name",
                            schoolPhone: "School Phone",
                          }[key as string] || key}
                    </span>
                  </label>
                ))}
              </div>
              
              {/* Photo Shape Special Toggle */}
              {template.elements.studentPhoto && (
                  <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-4">
                     <h4 className="font-bold text-sm text-indigo-800 dark:text-indigo-300">
                        {isRtl ? "إعدادات صورة الطالب المتقدمة" : "Advanced Student Photo Settings"}
                     </h4>
                     
                     <div>
                       <label className="text-xs font-bold text-slate-600 block mb-2">{isRtl ? "شكل الصورة" : "Photo Shape"}</label>
                       <div className="flex flex-wrap gap-4">
                          {[
                             { id: "rounded", label: isRtl ? "حواف ناعمة" : "Rounded" },
                             { id: "circle", label: isRtl ? "دائري" : "Circle" },
                             { id: "square", label: isRtl ? "مربع" : "Square" },
                             { id: "portrait", label: isRtl ? "عمودي" : "Portrait" },
                          ].map(shape => (
                             <label key={shape.id} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                   type="radio" 
                                   name="photoShape"
                                   checked={(template.photoSettings?.shape || template.elements.photoShape || 'rounded') === shape.id}
                                   onChange={() => setTemplate(p => ({ ...p, photoSettings: { ...p.photoSettings, shape: shape.id as any } }))}
                                   className="text-indigo-600 focus:ring-indigo-600"
                                />
                                <span className="text-sm font-medium">{shape.label}</span>
                             </label>
                          ))}
                       </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">{isRtl ? "عرض الصورة (%)" : "Width (%)"}</label>
                          <input 
                            type="range" min="20" max="80" 
                            value={template.photoSettings?.width || 40}
                            onChange={(e) => setTemplate(p => ({ ...p, photoSettings: { ...p.photoSettings, width: Number(e.target.value) } }))}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">{isRtl ? "ارتفاع الصورة (%)" : "Height (%)"}</label>
                          <input 
                            type="range" min="20" max="80" 
                            value={template.photoSettings?.height || 45}
                            onChange={(e) => setTemplate(p => ({ ...p, photoSettings: { ...p.photoSettings, height: Number(e.target.value) } }))}
                            className="w-full"
                          />
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">{isRtl ? "طريقة الاحتواء" : "Fit Mode"}</label>
                          <select 
                            value={template.photoSettings?.fitMode || 'cover'}
                            onChange={(e) => setTemplate(p => ({ ...p, photoSettings: { ...p.photoSettings, fitMode: e.target.value as any } }))}
                            className="w-full text-xs p-2 border rounded"
                          >
                             <option value="cover">{isRtl ? "تغطية (قص ذكي)" : "Cover (Smart Crop)"}</option>
                             <option value="contain">{isRtl ? "احتواء (منع القص)" : "Contain (No Crop)"}</option>
                             <option value="fill">{isRtl ? "ملء (تجاهل النسبة)" : "Fill (Stretch)"}</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 block mb-1">{isRtl ? "لون الإطار" : "Border Color"}</label>
                          <input 
                            type="color"
                            value={template.photoSettings?.borderColor || '#ffffff'}
                            onChange={(e) => setTemplate(p => ({ ...p, photoSettings: { ...p.photoSettings, borderColor: e.target.value } }))}
                            className="w-full h-8 cursor-pointer rounded border p-0"
                          />
                        </div>
                     </div>

                  </div>
              )}
            </div>

            {/* Colors */}
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Palette size={18} className="text-slate-500" />
                {isRtl ? "الألوان" : "Colors"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {Object.entries(template.colors).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-slate-500 capitalize">
                      {key}
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="color"
                        value={value}
                        onChange={(e) =>
                          updateColor(
                            key as keyof typeof template.colors,
                            e.target.value,
                          )
                        }
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) =>
                          updateColor(
                            key as keyof typeof template.colors,
                            e.target.value,
                          )
                        }
                        className="w-full text-xs p-1.5 border border-slate-200 rounded uppercase font-mono"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fonts */}
            <IdCardFontSettings template={template} setTemplate={setTemplate} isRtl={isRtl} />

            {/* Size */}
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Maximize size={18} className="text-slate-500" />
                {isRtl ? "أبعاد الهوية (ملم)" : "Card Dimensions (mm)"}
              </h3>
              <div className="flex gap-6 items-center">
                <select
                  value={template.size}
                  onChange={(e) =>
                    setTemplate((prev) => ({
                      ...prev,
                      size: e.target.value as any,
                    }))
                  }
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="pvc">
                    {isRtl ? "بطاقة PVC (54x86)" : "PVC Card (54x86)"}
                  </option>
                  <option value="pocket">
                    {isRtl ? "بطاقة جيب (60x90) ملم" : "Pocket Badge (60x90)"}
                  </option>
                  <option value="hanging">
                    {isRtl
                      ? "بطاقة تعليق (70x100) ملم"
                      : "Hanging Badge (70x100)"}
                  </option>
                  <option value="custom">
                    {isRtl ? "حجم مخصص" : "Custom Size"}
                  </option>
                </select>

                {template.size === "custom" && (
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        {isRtl ? "العرض:" : "Width:"}
                      </span>
                      <input
                        type="number"
                        value={template.customSize?.width}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            customSize: {
                              ...p.customSize!,
                              width: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-20 p-2 border border-slate-200 rounded-lg text-center font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">
                        {isRtl ? "الارتفاع:" : "Height:"}
                      </span>
                      <input
                        type="number"
                        value={template.customSize?.height}
                        onChange={(e) =>
                          setTemplate((p) => ({
                            ...p,
                            customSize: {
                              ...p.customSize!,
                              height: Number(e.target.value),
                            },
                          }))
                        }
                        className="w-20 p-2 border border-slate-200 rounded-lg text-center font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Watermark */}
            <div>
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-slate-500" />
                {isRtl ? "العلامة المائية (Watermark)" : "Watermark Settings"}
              </h3>
              <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                      {isRtl
                        ? "رفع صورة العلامة المائية"
                        : "Upload Watermark Image"}
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-300 rounded-lg p-2 cursor-pointer hover:bg-slate-50 transition-colors">
                        <UploadCloud size={16} className="text-indigo-600" />
                        <span className="text-sm font-medium">
                          {isRtl ? "اختر صورة..." : "Choose image..."}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                // Using generic profile.schoolId as path segment
                                const url = await uploadImageToServer(
                                  file,
                                  `watermarks/${profile?.schoolId || "default"}`,
                                );
                                setTemplate((p) => ({
                                  ...p,
                                  background: {
                                    ...p.background,
                                    imageUrl: url,
                                    type: "watermark",
                                  },
                                }));
                                toast.success(
                                  isRtl
                                    ? "تم الرفع بنجاح"
                                    : "Uploaded successfully",
                                );
                              } catch (err) {
                                toast.error(
                                  isRtl ? "فشل الرفع" : "Upload failed",
                                );
                              }
                            }
                          }}
                        />
                      </label>
                      {template.background.imageUrl && (
                        <button
                          onClick={() =>
                            setTemplate((p) => ({
                              ...p,
                              background: {
                                ...p.background,
                                imageUrl: "",
                                type: "solid",
                              },
                            }))
                          }
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                        >
                          {isRtl ? "إزالة" : "Remove"}
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-700 block mb-2">
                      {isRtl ? "الشفافية" : "Opacity"} (
                      {Math.round(
                        (template.background.watermarkOpacity ?? 0.1) * 100,
                      )}
                      %)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={template.background.watermarkOpacity ?? 0.1}
                      onChange={(e) =>
                        setTemplate((p) => ({
                          ...p,
                          background: {
                            ...p.background,
                            watermarkOpacity: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Preview Pane */}
      <div className="w-full lg:w-[350px] shrink-0 sticky top-6">
        <div className="bg-slate-100 dark:bg-slate-900 rounded-3xl p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 min-h-[400px] flex flex-col items-center justify-center relative shadow-inner">
          <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Live Preview
          </div>

          <div
            className="mt-8 transition-all duration-300"
            style={{ transformOrigin: "top center", transform: "scale(1)" }}
          >
            <StudentCard
              student={mockStudent}
              cardData={mockCardData}
              isRtl={isRtl}
              template={template}
            />
          </div>
        </div>
        <p className="text-center text-xs text-slate-400 mt-4 font-bold">
          {isRtl
            ? "ملاحظة: هذا التصميم هو معاينة حية للطالب، التغييرات تنعكس مباشرة أثناء الطباعة."
            : "Note: This is a live preview. Changes reflect directly during printing."}
        </p>
      </div>
    </div>
  );
}
