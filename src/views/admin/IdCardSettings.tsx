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
import IdCardCustomizer from "../../components/admin/idcards/IdCardCustomizer";
import { IdCardTemplate } from "../../types/idCardTemplate";
import { DEFAULT_ID_CARD_TEMPLATE } from "../../lib/idCardPresets";
import { mergeIdCardTemplate } from "../../lib/idCardTemplateUtils";

export default function IdCardSettings() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const isRtl = language === "ar";

  const [template, setTemplate] = useState<IdCardTemplate>(DEFAULT_ID_CARD_TEMPLATE);
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
          setTemplate(mergeIdCardTemplate(docSnap.data() as IdCardTemplate));
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
      await setDoc(
        doc(db, "schools", profile.schoolId, "settings", "idCardTemplate"),
        template,
      );
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

  const mockStudent = {
    id: "STU-2024-001",
    name: isRtl ? "محمد علي حسن" : "Mohammed Ali Hasan",
    parentPhone: "07712345678",
    parentEmail: "parent@example.com",
    address: isRtl ? "بغداد، المنصور" : "Baghdad, Mansour",
  };

  const mockCardData = {
    schoolName: isRtl ? "مدرسة الأوائل الأهلية" : "Al-Awael School",
    photoUrl:
      "https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=200&auto=format&fit=crop",
    bloodType: "O+",
    transportInfo: isRtl ? "الخط الأول" : "Bus 1",
    driverPhone: "07800000000",
    carNumber: "أ 12345",
    driverName: isRtl ? "أحمد السائق" : "Ahmed Driver",
    guardianName: isRtl ? "محمد علي" : "Mohammed Ali",
    schoolPhone: "07901234567",
    issueDate: "2023-09-01",
    validUntil: "2024-07-01",
    expiryDate: "2024-07-01",
    className: isRtl ? "الخامس الإعدادي - أ" : "5th Grade - A",
    residenceAddress: isRtl ? "بغداد، المنصور" : "Baghdad, Mansour",
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500 font-bold animate-pulse">
        {isRtl ? "جاري تحميل الاستوديو..." : "Loading studio..."}
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <IdCardCustomizer
        template={template}
        setTemplate={setTemplate}
        isRtl={isRtl}
        isSaving={isSaving}
        onSave={handleSave}
        mockStudent={mockStudent}
        mockCardData={mockCardData}
      />
    </div>
  );
}
