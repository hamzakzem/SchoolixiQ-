import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { BookOpen, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { isRedactedCredentialValue } from '../../lib/userProfile';
import {
  dedupeSchoolSubjects,
  listTeachersUsingSubject,
  SCHOOL_SUBJECTS_COLLECTION,
  subjectNameExists,
  type SchoolSubjectOption,
} from '../../lib/schoolSubjects';

export default function SchoolSubjectsManagement() {
  const { profile } = useAuth();
  const [subjects, setSubjects] = useState<SchoolSubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SchoolSubjectOption | null>(null);
  const [subjectName, setSubjectName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<SchoolSubjectOption | null>(null);

  useEffect(() => {
    if (!profile?.schoolId) {
      setSubjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const q = query(
        collection(db, SCHOOL_SUBJECTS_COLLECTION),
        where('schoolId', '==', profile.schoolId),
        limit(200),
      );
      const unsub = onSnapshot(
        q,
        (snap) => {
          setSubjects(dedupeSchoolSubjects(snap.docs, profile.schoolId));
          setLoading(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'SchoolSubjectsManagement:subjects');
          setSubjects([]);
          setLoading(false);
        },
      );
      return () => unsub();
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'SchoolSubjectsManagement:subjects');
      setLoading(false);
    }
  }, [profile?.schoolId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingSubject(null);
    setSubjectName('');
  };

  const openAdd = () => {
    setEditingSubject(null);
    setSubjectName('');
    setShowForm(true);
  };

  const openEdit = (subject: SchoolSubjectOption) => {
    setEditingSubject(subject);
    setSubjectName(subject.name);
    setShowForm(true);
  };

  const fetchSchoolTeachers = async () => {
    if (!profile?.schoolId) return [];
    const q = query(
      collection(db, 'users'),
      where('schoolId', '==', profile.schoolId),
      where('role', '==', 'teacher'),
      limit(200),
    );
    const snap = await getDocs(q);
    return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
  };

  const syncTeachersAfterRename = async (
    subjectId: string,
    newName: string,
    oldName: string,
  ) => {
    const teachers = await fetchSchoolTeachers();
    const assigned = listTeachersUsingSubject(teachers, subjectId, oldName);
    await Promise.all(
      assigned.map((teacher) =>
        updateDoc(doc(db, 'users', teacher.id), {
          subjectId,
          subjectName: newName,
          subject: newName,
          updatedAt: serverTimestamp(),
        }),
      ),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;

    const trimmed = subjectName.trim();
    if (!trimmed) {
      toast.error('يرجى إدخال اسم المادة');
      return;
    }
    if (isRedactedCredentialValue(trimmed)) {
      toast.error('اسم المادة غير صالح');
      return;
    }
    if (subjectNameExists(subjects, trimmed, editingSubject?.id)) {
      toast.error('هذه المادة موجودة بالفعل في قائمة المواد المعتمدة');
      return;
    }

    setSaving(true);
    const path = SCHOOL_SUBJECTS_COLLECTION;
    try {
      if (editingSubject) {
        const oldName = editingSubject.name;
        await updateDoc(doc(db, path, editingSubject.id), {
          name: trimmed,
          schoolId: profile.schoolId,
          updatedAt: serverTimestamp(),
        });
        if (oldName !== trimmed) {
          await syncTeachersAfterRename(editingSubject.id, trimmed, oldName);
        }
        toast.success('تم تحديث المادة بنجاح');
      } else {
        await addDoc(collection(db, path), {
          name: trimmed,
          schoolId: profile.schoolId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        toast.success('تمت إضافة المادة بنجاح');
      }
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
      toast.error('فشل في حفظ المادة');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete || !profile?.schoolId) return;

    setSaving(true);
    const path = `${SCHOOL_SUBJECTS_COLLECTION}/${confirmDelete.id}`;
    try {
      const teachers = await fetchSchoolTeachers();
      const assigned = listTeachersUsingSubject(
        teachers,
        confirmDelete.id,
        confirmDelete.name,
      );
      if (assigned.length > 0) {
        const names = assigned.map((t) => t.name).join('، ');
        toast.error(
          `لا يمكن حذف المادة لأنها مخصصة للمعلمين: ${names}. غيّر مادة المعلمين أولاً.`,
          { duration: 8000 },
        );
        setConfirmDelete(null);
        return;
      }

      await deleteDoc(doc(db, SCHOOL_SUBJECTS_COLLECTION, confirmDelete.id));
      toast.success('تم حذف المادة بنجاح');
      setConfirmDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
      toast.error('فشل في حذف المادة');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
            <BookOpen className="text-emerald-500" size={24} />
            المواد الدراسية المعتمدة
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            المصدر الرسمي لمواد المدرسة — تُزامَن تلقائياً مع اختيار مادة المعلم في إدارة الموظفين
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-bold hover:bg-slate-800 dark:hover:bg-emerald-700 transition-all text-sm"
        >
          <Plus size={16} />
          إضافة مادة
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400 font-bold py-6 text-center">جاري تحميل المواد...</p>
      ) : subjects.length === 0 ? (
        <p className="text-sm text-amber-700 font-bold py-6 px-4 rounded-2xl border border-amber-100 bg-amber-50 text-center">
          لا توجد مواد معتمدة بعد. أضف المواد الدراسية الرسمية للمدرسة من هنا.
        </p>
      ) : (
        <div className="space-y-2">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30"
            >
              <span className="font-bold text-slate-800 dark:text-slate-200">{subject.name}</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEdit(subject)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-blue-600 transition-colors"
                  title="تعديل"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(subject)}
                  className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-rose-600 transition-colors"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSave}
            className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4 overflow-hidden"
          >
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              {editingSubject ? 'تعديل اسم المادة' : 'اسم المادة الجديدة'}
            </label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white outline-none focus:border-emerald-500"
              placeholder="مثال: الرياضيات"
              autoFocus
              required
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 disabled:opacity-50"
              >
                <Save size={16} />
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold"
              >
                <X size={16} />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
          >
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700">
              <h4 className="font-bold text-slate-900 dark:text-white mb-2">تأكيد حذف المادة</h4>
              <p className="text-sm text-slate-500 mb-6">
                هل تريد حذف مادة «{confirmDelete.name}»؟ لن يُسمح بالحذف إذا كانت مخصصة لمعلمين.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 disabled:opacity-50"
                >
                  {saving ? 'جاري الحذف...' : 'حذف'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 rounded-xl font-bold"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
