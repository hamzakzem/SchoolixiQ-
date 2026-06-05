import React, { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  CheckCircle,
  Clock,
  AlertTriangle,
  User,
  Calendar,
  XCircle,
  FileText,
} from "lucide-react";
import { useAuth } from "../lib/AuthContext";
import { useLanguage } from "../lib/LanguageContext";
import { toast } from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

export default function ScanHandler() {
  const [scannedStudentId, setScannedStudentId] = useState<string | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { profile, user } = useAuth();
  const { isRtl } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Check URL for scan parameter
    const scanId = searchParams.get("scan");

    if (
      scanId &&
      profile &&
      ["admin", "superadmin"].includes(
        profile.role,
      )
    ) {
      setScannedStudentId(scanId);
      // Clean up URL without reloading
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.delete("scan");
      setSearchParams(newSearchParams, { replace: true });
    }
  }, [profile, searchParams, setSearchParams]);

  useEffect(() => {
    if (scannedStudentId) {
      let isMounted = true;
      const fetchStudent = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, "students", scannedStudentId);
          const docSnap = await getDoc(docRef);
          if (isMounted) {
            if (
              docSnap.exists() &&
              docSnap.data().schoolId === profile?.schoolId
            ) {
              setStudent({ id: docSnap.id, ...docSnap.data() });
            } else {
              toast.error(
                isRtl
                  ? "الطالب غير موجود أو لا ينتمي لمدرستك"
                  : "Student not found or not in your school",
              );
              setScannedStudentId(null);
            }
          }
        } catch (error) {
          console.error(error);
          if (isMounted) {
            toast.error(isRtl ? "حدث خطأ" : "Error occurred");
            setScannedStudentId(null);
          }
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      fetchStudent();
      
      return () => {
        isMounted = false;
      };
    }
  }, [scannedStudentId, profile, isRtl]);

  const handleAttendance = async (status: "present" | "absent" | "late") => {
    if (!student || !profile || !student.classId) return;

    setLoading(true);
    try {
      const date = new Date().toISOString().split("T")[0];
      const classAttendanceId = `${student.classId}_${date}`;
      const attendanceRef = doc(db, "attendance", classAttendanceId);

      await setDoc(
        attendanceRef,
        {
          schoolId: profile.schoolId,
          classId: student.classId,
          date,
          [`records.${student.id}`]: status,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid,
        },
        { merge: true },
      );

      toast.success(
        isRtl ? "تم تسجيل الحضور بنجاح" : "Attendance recorded successfully",
      );
      setScannedStudentId(null);
      setStudent(null);
    } catch (error) {
      console.error(error);
      toast.error(isRtl ? "خطأ في تسجيل الحضور" : "Error recording attendance");
    } finally {
      setLoading(false);
    }
  };

  if (!scannedStudentId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl safe-area-bottom"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
            <h3 className="font-bold flex items-center gap-2">
              <User size={20} />
              {isRtl ? "بيانات الطالب" : "Student Data"}
            </h3>
            <button
              onClick={() => {
                setScannedStudentId(null);
                setStudent(null);
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              </div>
            ) : student ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="w-24 h-24 bg-indigo-100 text-indigo-600 rounded-full mx-auto flex items-center justify-center mb-4">
                    {student.imageUrl ? (
                      <img
                        src={student.imageUrl || undefined}
                        alt={student.name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User size={40} />
                    )}
                  </div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {student.name}
                  </h2>
                  <p className="text-slate-500">{student.id}</p>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold border-b pb-2 text-slate-700">
                    {isRtl ? "تسجيل الحضور" : "Record Attendance"}
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => handleAttendance("present")}
                      className="py-3 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded-xl flex flex-col items-center gap-1 font-bold text-sm transition-all active:scale-95"
                    >
                      <CheckCircle size={20} />
                      {isRtl ? "حاضر" : "Present"}
                    </button>
                    <button
                      onClick={() => handleAttendance("late")}
                      className="py-3 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded-xl flex flex-col items-center gap-1 font-bold text-sm transition-all active:scale-95"
                    >
                      <Clock size={20} />
                      {isRtl ? "متأخر" : "Late"}
                    </button>
                    <button
                      onClick={() => handleAttendance("absent")}
                      className="py-3 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-xl flex flex-col items-center gap-1 font-bold text-sm transition-all active:scale-95"
                    >
                      <XCircle size={20} />
                      {isRtl ? "غائب" : "Absent"}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-8 text-slate-500">
                {isRtl ? "لم يتم العثور على الطالب" : "Student not found"}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
