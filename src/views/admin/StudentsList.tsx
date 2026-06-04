import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, doc, deleteDoc, setDoc, runTransaction, increment, arrayUnion, arrayRemove, getDoc, limit, startAfter, orderBy } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Plus, UserPlus, GraduationCap, Copy, Check, Trash2, AlertTriangle, X, Users, ArrowRightLeft, Phone } from 'lucide-react';
import { StudentFormModal } from '../../components/admin/StudentFormModal';
import {
  PageHeader,
  SearchField,
  Panel,
  PanelToolbar,
  DataTable,
  DataTableElement,
  ViewToggle,
  Button,
  IconButton,
  ActionMenu,
  ActionMenuItem,
  StudentPrimaryActions,
} from '../../components/ui';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { uploadImageToServer } from '../../lib/imageUtils';

import { adminCreateUser, adminDeleteUser, adminDeleteStudent } from '../../lib/adminApi';
import { deleteStudentFirestore } from '../../lib/deleteStudentFirestore';
import { Modal } from '../../components/ui/Modal';

export default function StudentsList({ mode = 'edit' }: { mode?: 'view' | 'edit' }) {
  const { profile } = useAuth();
  const isViewOnly = mode === 'view';
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkParentModal, setShowLinkParentModal] = useState<any>(null);
  const [showLinkedParentsModal, setShowLinkedParentsModal] = useState<any>(null);
  const [linkedParents, setLinkedParents] = useState<any[]>([]);
  const [isLoadingParents, setIsLoadingParents] = useState(false);
  const [parentEmail, setParentEmail] = useState('');
  const [parentName, setParentName] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [parentToUnlink, setParentToUnlink] = useState<{parentId: string, parentName: string} | null>(null);
  const [parentToDelete, setParentToDelete] = useState<{id: string, name: string, email: string} | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [newStudent, setNewStudent] = useState({ 
    name: '', 
    registrationNumber: '', 
    classId: '', 
    email: '', 
    password: '',
    parentPhone: '',
    parentEmail: '',
    address: '',
    driverPhone: '',
    parentPassword: '',
    photoUrl: ''
  });
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showMoveModal, setShowMoveModal] = useState<any>(null);
  const [targetClassId, setTargetClassId] = useState('');
  const [isMoving, setIsMoving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const fetchStudents = async (isNextPage = false) => {
    if (!profile?.schoolId) return;
    if (isNextPage) setIsLoadingMore(true);

    try {
      let studentsQ = query(
        collection(db, 'students'), 
        where('schoolId', '==', profile.schoolId),
        orderBy('createdAt', 'desc'),
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        studentsQ = query(
          collection(db, 'students'), 
          where('schoolId', '==', profile.schoolId),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(studentsQ);
      
      if (!isNextPage) {
        const classesQ = query(
          collection(db, 'classes'), 
          where('schoolId', '==', profile.schoolId),
          limit(100)
        );
        const classesSnap = await getDocs(classesQ);
        setClasses(classesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }

      const newDocs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setStudents(prev => isNextPage ? [...prev, ...newDocs] : newDocs);

      if (snap.docs.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
        setLastDoc(snap.docs[snap.docs.length - 1]);
      }
    } catch (error) {
      console.error("Error fetching students data:", error);
    } finally {
      if (isNextPage) setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!profile?.schoolId) return;

    const classesQ = query(
      collection(db, 'classes'),
      where('schoolId', '==', profile.schoolId),
      limit(100),
    );
    const unsubClasses = onSnapshot(classesQ, (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const studentsQ = query(
      collection(db, 'students'),
      where('schoolId', '==', profile.schoolId),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE),
    );
    const unsubStudents = onSnapshot(
      studentsQ,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setStudents(docs);
        setHasMore(snap.docs.length >= PAGE_SIZE);
        if (snap.docs.length > 0) {
          setLastDoc(snap.docs[snap.docs.length - 1]);
        }
      },
      (error) => {
        console.error('Students listener error:', error);
        fetchStudents();
      },
    );

    return () => {
      unsubClasses();
      unsubStudents();
    };
  }, [profile?.schoolId]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('تم نسخ الرقم');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteStudent = async (id: string) => {
    if (!profile?.schoolId) return;
    setIsDeleting(id);
    const loadingToast = toast.loading('جاري حذف سجل الطالب...');
    try {
      try {
        const result = await adminDeleteStudent(id);
        if (!result.success) {
          throw new Error(result.message || 'فشل في حذف الطالب');
        }
        toast.dismiss(loadingToast);
        toast.success(result.message || 'تم حذف الطالب نهائياً من النظام');
      } catch (apiError: any) {
        console.warn('Admin API delete failed, trying Firestore:', apiError);
        await deleteStudentFirestore(id, profile.schoolId);
        toast.dismiss(loadingToast);
        toast.success('تم حذف الطالب من سجل المدرسة');
      }
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Delete student error:', error);
      toast.error(error.message || 'فشل في حذف الطالب');
    } finally {
      setIsDeleting(null);
    }
  };

  useEffect(() => {
    if (!showLinkedParentsModal) {
      setLinkedParents([]);
      return;
    }

    const fetchLinkedParents = async () => {
      setIsLoadingParents(true);
      try {
        const parentIds = showLinkedParentsModal.parentIds || [];
        if (parentIds.length === 0) {
          setLinkedParents([]);
          return;
        }

        // Fetch user docs for these IDs efficiently
        const parentsData: any[] = [];
        const promises = parentIds.map((id: string) => getDoc(doc(db, 'users', id)));
        const docs = await Promise.all(promises);
        
        docs.forEach(docSnap => {
          if (docSnap.exists()) {
            parentsData.push({ id: docSnap.id, ...docSnap.data() });
          }
        });
        
        setLinkedParents(parentsData);
      } catch (error) {
        console.error('Error fetching linked parents:', error);
        toast.error('فشل في تحميل بيانات أولياء الأمور');
      } finally {
        setIsLoadingParents(false);
      }
    };

    fetchLinkedParents();
  }, [showLinkedParentsModal]);

  const handleUnlinkParent = async () => {
    if (!showLinkedParentsModal || !parentToUnlink) return;
    setIsLoadingParents(true);

    try {
      const studentRef = doc(db, 'students', showLinkedParentsModal.id);
      const updatedParentIds = (showLinkedParentsModal.parentIds || []).filter((id: string) => id !== parentToUnlink.parentId);
      
      await updateDoc(studentRef, {
        parentIds: updatedParentIds
      });

      // Update local state
      setLinkedParents(prev => prev.filter(p => p.id !== parentToUnlink.parentId));
      setShowLinkedParentsModal((prev: any) => ({ ...prev, parentIds: updatedParentIds }));
      
      toast.success('تم إلغاء الربط بنجاح');
      setParentToUnlink(null);
    } catch (error) {
      console.error('Error unlinking parent:', error);
      toast.error('فشل في إلغاء الربط');
    } finally {
      setIsLoadingParents(false);
    }
  };

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !showLinkParentModal) return;
    if (parentPassword && parentPassword.length < 6) {
      toast.error('كلمة السر يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setIsLinking(true);
    try {
      const emailLower = parentEmail.toLowerCase().trim();
      
      // Always use Admin API to ensure Auth and Firestore are in sync
      const result = await adminCreateUser({
        email: emailLower,
        password: parentPassword || undefined, 
        displayName: parentName || 'ولي أمر طالب',
        role: 'parent',
        schoolId: profile.schoolId,
        additionalData: {
          phone: parentPhone || '',
          password: parentPassword || '', // Save readable password for reference as requested
          updatedAt: new Date().toISOString()
        }
      });
      
      const parentUid = result.uid;

      // 2. Link student to parent
      const studentRef = doc(db, 'students', showLinkParentModal.id);
      const currentParentIds = showLinkParentModal.parentIds || [];
      
      if (!currentParentIds.includes(parentUid)) {
        await updateDoc(studentRef, {
          parentIds: arrayUnion(parentUid),
          updatedAt: serverTimestamp()
        });
      }

      toast.success('تم ربط ولي الأمر وتحديث البيانات بنجاح');
      setShowLinkParentModal(null);
      setParentEmail('');
      setParentName('');
      setParentPhone('');
      setParentPassword('');
    } catch (error: any) {
      console.error('Link parent error:', error);
      toast.error(error.message || 'فشل ربط ولي الأمر');
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteParentAccount = async () => {
    if (!parentToDelete || !profile?.schoolId) return;
    setIsLoadingParents(true);
    const loadingToast = toast.loading('جاري حذف حساب ولي الأمر نهائياً...');
    
    try {
      // 1. Find all students linked to this parent in this school
      const studentsQ = query(
        collection(db, 'students'),
        where('schoolId', '==', profile.schoolId),
        where('parentIds', 'array-contains', parentToDelete.id)
      );
      const studentsSnap = await getDocs(studentsQ);
      
      // 2. Remove parent ID from all those students
      const unlinkPromises = studentsSnap.docs.map(studentDoc => 
        updateDoc(doc(db, 'students', studentDoc.id), {
          parentIds: arrayRemove(parentToDelete.id)
        })
      );
      await Promise.all(unlinkPromises);
      
      // 3. Delete from Firebase Auth (using Admin API)
      try {
        await adminDeleteUser(parentToDelete.id);
      } catch (authErr) {
        console.warn('Auth deletion failed or user not in Auth:', authErr);
        // Continue anyway if Firestore delete is needed
      }
      
      // 4. Delete user document from Firestore
      await deleteDoc(doc(db, 'users', parentToDelete.id));
      
      toast.dismiss(loadingToast);
      toast.success('تم حذف حساب ولي الأمر نهائياً من النظام');
      
      // Update local state if the modal is open
      setLinkedParents(prev => prev.filter(p => p.id !== parentToDelete.id));
      setParentToDelete(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Delete parent account error:', error);
      toast.error(error.message || 'فشل حذف الحساب');
    } finally {
      setIsLoadingParents(false);
    }
  };

  const handleMoveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !showMoveModal || !targetClassId) return;
    setIsMoving(true);
    try {
      await updateDoc(doc(db, 'students', showMoveModal.id), {
        classId: targetClassId,
        updatedAt: serverTimestamp(),
      });
      toast.success('تم نقل الطالب بنجاح');
      setShowMoveModal(null);
      setTargetClassId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${showMoveModal.id}`);
      toast.error('فشل نقل الطالب');
    } finally {
      setIsMoving(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId) return;
    const isEditing = !!editingStudent;

    try {
      if (isEditing) {
        await updateDoc(doc(db, 'students', editingStudent.id), {
          name: newStudent.name,
          registrationNumber: newStudent.registrationNumber,
          classId: newStudent.classId,
          parentPhone: newStudent.parentPhone || '',
          driverPhone: newStudent.driverPhone || '',
          parentEmail: newStudent.parentEmail?.toLowerCase() || '',
          address: newStudent.address || '',
          parentPassword: newStudent.parentPassword || '',
          photoUrl: newStudent.photoUrl || '',
          updatedAt: serverTimestamp(),
        });
        
        // Auto-create/link parent if email is provided and student is edited
        if (newStudent.parentEmail) {
          try {
            const emailLower = newStudent.parentEmail.toLowerCase().trim();
            const result = await adminCreateUser({
              email: emailLower,
              password: newStudent.parentPassword || undefined,
              displayName: 'ولي أمر طالب',
              role: 'parent',
              schoolId: profile.schoolId,
              additionalData: {
                phone: newStudent.parentPhone || '',
                password: newStudent.parentPassword || '',
                updatedAt: new Date().toISOString()
              }
            });
            
            // Link parent if not already linked
            const currentParentIds = editingStudent.parentIds || [];
            if (!currentParentIds.includes(result.uid)) {
              await updateDoc(doc(db, 'students', editingStudent.id), {
                parentIds: arrayUnion(result.uid)
              });
            }
          } catch (autoErr) {
            console.warn('Auto-parent creation (edit) failed:', autoErr);
          }
        }
        
        toast.success('تم تحديث بيانات الطالب بنجاح');
      } else {
        const studentId = doc(collection(db, 'students')).id;
        
        // Atomic transaction for adding student and incrementing count
        await runTransaction(db, async (transaction) => {
          const schoolRef = doc(db, 'schools', profile.schoolId!);
          const schoolSnap = await transaction.get(schoolRef);
          
          if (!schoolSnap.exists()) throw new Error('المدرسة غير موجودة');
          
          const schoolData = schoolSnap.data();
          const currentCount = schoolData.studentCount || 0;
          
          // Get package details to check limit
          const planId = schoolData.planId || 'basic';
          const planSnap = await transaction.get(doc(db, 'packages', planId));
          const maxStudents = planSnap.exists() ? (planSnap.data().maxStudents || 500) : 500;
          
          if (currentCount >= maxStudents) {
            throw new Error(`لقد وصلت للحد الأقصى للطلاب المسموح به في باقتك الحالية (${maxStudents} طالب). يرجى الترقية لإضافة المزيد.`);
          }

          const studentRef = doc(db, 'students', studentId);
          
          const studentData = {
            id: studentId,
            name: newStudent.name,
            registrationNumber: newStudent.registrationNumber,
            classId: newStudent.classId,
            parentPhone: newStudent.parentPhone || '',
            driverPhone: newStudent.driverPhone || '',
            parentEmail: newStudent.parentEmail?.toLowerCase() || '',
            address: newStudent.address || '',
            parentPassword: newStudent.parentPassword || '',
            photoUrl: newStudent.photoUrl || '',
            schoolId: profile.schoolId,
            tuitionBalance: 0,
            createdAt: serverTimestamp(),
            parentIds: []
          };

          transaction.set(studentRef, studentData);
          transaction.update(schoolRef, {
            studentCount: increment(1)
          });
        });
        
        // Auto-create/link parent if email is provided
        if (newStudent.parentEmail) {
          try {
            const emailLower = newStudent.parentEmail.toLowerCase().trim();
            const result = await adminCreateUser({
              email: emailLower,
              password: newStudent.parentPassword || undefined,
              displayName: 'ولي أمر طالب',
              role: 'parent',
              schoolId: profile.schoolId,
              additionalData: {
                phone: newStudent.parentPhone || '',
                password: newStudent.parentPassword || '',
                updatedAt: new Date().toISOString()
              }
            });
            
            // Link the newly created/found parent to the student
            await updateDoc(doc(db, 'students', studentId), {
              parentIds: arrayUnion(result.uid)
            });
          } catch (autoErr) {
            console.warn('Auto-parent creation failed:', autoErr);
            toast.error('تم إضافة الطالب ولكن فشل إنشاء حساب ولي الأمر تلقائياً. يرجى تجربته يدوياً.');
          }
        }
        
        toast.success('تمت إضافة الطالب بنجاح');
        await fetchStudents(false);
      }
      setNewStudent({ 
        name: '', 
        registrationNumber: '', 
        classId: '', 
        email: '', 
        password: '', 
        parentPhone: '',
        parentEmail: '',
        address: '',
        parentPassword: '',
        photoUrl: ''
      });
      setEditingStudent(null);
      setShowAddModal(false);
    } catch (error: any) {
      console.error('Error adding student:', error);
      toast.error(error.message || 'حدث خطأ أثناء المعالجة');
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.WRITE, isEditing ? `students/${editingStudent.id}` : 'students');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.schoolId) return;
    
    // Check file size (max 5MB just to be safe as we compress anyway)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const studentIdOrNew = editingStudent?.id || 'new';
      const url = await uploadImageToServer(file, `students/${studentIdOrNew}/photo_${Date.now()}`, 400, 400);
      setNewStudent(prev => ({ ...prev, photoUrl: url }));
      toast.success('تم رفع الصورة بنجاح');
    } catch (error) {
      console.error('Error preparing image:', error);
      toast.error('فشل رفع الصورة');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>(() =>
    typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'table' : 'cards'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const effectiveView: 'table' | 'cards' = isDesktop ? viewMode : 'cards';

  const filteredStudents = students.filter(student => 
    (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (student.registrationNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const closeMenu = () => setActiveMenu(null);

  const openEditStudent = (student: any) => {
    setEditingStudent(student);
    setNewStudent({
      name: student.name,
      registrationNumber: student.registrationNumber,
      classId: student.classId || '',
      parentPhone: student.parentPhone || '',
      driverPhone: student.driverPhone || '',
      parentEmail: student.parentEmail || '',
      parentPassword: student.parentPassword || '',
      photoUrl: student.photoUrl || '',
      address: student.address || '',
      email: '',
      password: '',
    });
    setShowAddModal(true);
    closeMenu();
  };

  const formatStudentDate = (student: any) => {
    if (!student.createdAt?.seconds) return '—';
    return new Date(student.createdAt.seconds * 1000).toLocaleDateString('ar-IQ');
  };

  const renderStudentMenuActions = (student: any) => (
    <>
      <ActionMenuItem onClick={() => { setShowLinkedParentsModal(student); closeMenu(); }}>
        <Users size={16} className="text-slate-400 shrink-0" />
        عرض الحسابات المربوطة
      </ActionMenuItem>
      {!isViewOnly && (
        <>
          <ActionMenuItem
            onClick={() => {
              setShowLinkParentModal(student);
              setParentEmail(student.parentEmail || '');
              setParentName(student.parentName || '');
              setParentPhone(student.parentPhone || '');
              setParentPassword(student.parentPassword || '');
              closeMenu();
            }}
            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700"
          >
            <UserPlus size={16} className="text-slate-400 shrink-0" />
            ربط بولي أمر جديد
          </ActionMenuItem>
          <ActionMenuItem
            onClick={() => {
              setShowMoveModal(student);
              setTargetClassId(student.classId || '');
              closeMenu();
            }}
          >
            <ArrowRightLeft size={16} className="text-slate-400 shrink-0" />
            نقل لصف آخر
          </ActionMenuItem>
          <ActionMenuItem
            onClick={() => {
              setConfirmDeleteId(student.id);
              closeMenu();
            }}
            className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
          >
            <Trash2 size={16} className="text-red-500 shrink-0" />
            حذف الطالب نهائياً
          </ActionMenuItem>
        </>
      )}
    </>
  );

  return (
    <div className="sq-page">
      <PageHeader
        title="إدارة الطلاب"
        description="قائمة الطلاب المسجلين رسمياً في نظام المدرسة"
        actions={
          <>
            <SearchField
              placeholder="بحث عن طالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              containerClassName="w-full lg:w-80"
            />
            <div className="flex gap-2 w-full sm:w-auto">
              {!isViewOnly && (
                <Button
                  size="lg"
                  className="flex-1 sm:flex-none"
                  onClick={() => {
                    setEditingStudent(null);
                    setNewStudent({
                      name: '',
                      classId: '',
                      parentEmail: '',
                      parentPhone: '',
                      address: '',
                      parentPassword: '',
                      photoUrl: '',
                      registrationNumber: '',
                      email: '',
                      password: '',
                      driverPhone: '',
                    });
                    setShowAddModal(true);
                  }}
                >
                  <Plus size={18} />
                  <span>طالب جديد</span>
                </Button>
              )}
              {isDesktop && (
                <ViewToggle
                  className="lg:hidden flex-1 justify-center"
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: 'table', label: 'جدول' },
                    { value: 'cards', label: 'بطاقات' },
                  ]}
                />
              )}
            </div>
          </>
        }
      />

      <Panel>
        <PanelToolbar>
          <span className="text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-[0.15em]">
            النتائج: {filteredStudents.length}
          </span>
          {isDesktop && (
            <ViewToggle
              className="hidden lg:inline-flex"
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'table', label: 'جدول' },
                { value: 'cards', label: 'بطاقات' },
              ]}
            />
          )}
        </PanelToolbar>

        <div className="sq-panel-body">
        {effectiveView === 'table' ? (
          <DataTable maxHeight="calc(100dvh - 14rem)" minHeight="min(50vh, 400px)">
            <DataTableElement>
              <thead>
                <tr>
                  <th>اسم الطالب</th>
                  <th>رقم الربط</th>
                  <th>الصف</th>
                  <th>ولي الأمر</th>
                  <th>الحالة المالية</th>
                  <th className="sq-table-sticky-actions text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} className="group">
                    <td>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-slate-900 transition-colors shadow-sm overflow-hidden shrink-0">
                           {student.photoUrl ? <img src={student.photoUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <GraduationCap size={20} />}
                        </div>
                        <div className="min-w-0">
                           <span className="font-bold text-slate-900 block font-display leading-none truncate">{student.name}</span>
                           <div className="flex flex-wrap items-center gap-2 mt-1">
                             <span className="text-[10px] text-slate-400 font-bold block whitespace-nowrap">تسجيل: {formatStudentDate(student)}</span>
                             {student.parentIds?.length > 0 && (
                               <button 
                                 onClick={() => setShowLinkedParentsModal(student)}
                                 className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded-md font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                               >
                                 <Users size={10} />
                                 {student.parentIds.length} حساب
                               </button>
                             )}
                           </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2 group/copy">
                        <span className="font-mono text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          {student.registrationNumber || '—'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(student.registrationNumber, student.id)}
                          className={`sq-icon-btn h-8 w-8 ${copiedId === student.id ? 'text-emerald-600 border-emerald-200' : 'opacity-70 md:opacity-0 md:group-hover/copy:opacity-100'}`}
                          aria-label="نسخ رقم الربط"
                        >
                          {copiedId === student.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td>
                      <span className="sq-badge sq-badge-primary">
                        {classes.find(c => c.id === student.classId)?.name || 'غير محدد'}
                      </span>
                    </td>
                    <td>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 space-y-0.5">
                        {student.parentPhone ? (
                          <span className="flex items-center gap-1"><Phone size={12} className="text-slate-400" />{student.parentPhone}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {student.parentEmail && (
                          <span className="block text-[10px] text-slate-500 truncate max-w-[140px]" title={student.parentEmail}>{student.parentEmail}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`font-bold text-sm md:text-base ${(student.tuitionBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {(student.tuitionBalance || 0).toLocaleString()}{' '}
                        <span className="text-[10px] font-normal text-slate-400">د.ع</span>
                      </span>
                    </td>
                    <td className="sq-table-sticky-actions">
                      <div className="flex justify-center items-center gap-1.5 flex-wrap">
                        {!isViewOnly && (
                          <>
                            <StudentPrimaryActions
                              onEdit={() => openEditStudent(student)}
                              onDelete={() => setConfirmDeleteId(student.id)}
                            />
                            <IconButton
                              tone="primary"
                              title="ربط بولي أمر"
                              onClick={() => {
                                setShowLinkParentModal(student);
                                setParentEmail(student.parentEmail || '');
                                setParentName(student.parentName || '');
                                setParentPhone(student.parentPhone || '');
                                setParentPassword(student.parentPassword || '');
                              }}
                            >
                              <UserPlus size={18} />
                            </IconButton>
                          </>
                        )}
                        <ActionMenu
                          menuId={student.id}
                          activeId={activeMenu}
                          onToggle={setActiveMenu}
                          align="end"
                        >
                          {renderStudentMenuActions(student)}
                        </ActionMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTableElement>
          </DataTable>
        ) : null}

        {effectiveView === 'cards' && (
          <div className="sq-student-card-grid">
            {filteredStudents.map(student => (
              <article key={student.id} className="sq-student-card">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <GraduationCap size={22} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base leading-snug">{student.name}</h3>
                    <p className="text-xs text-[#0B2345] dark:text-[#D4A64A] font-bold mt-0.5">
                      {classes.find(c => c.id === student.classId)?.name || 'غير محدد'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">تسجيل: {formatStudentDate(student)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-right">
                  <div className="sq-badge-muted flex flex-col items-start gap-1 p-3 rounded-xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase">رقم الربط</span>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 break-all">
                      {student.registrationNumber || '—'}
                    </span>
                  </div>
                  <div className="sq-badge-muted flex flex-col items-start gap-1 p-3 rounded-xl">
                    <span className="text-[9px] font-black text-slate-400 uppercase">الرصيد</span>
                    <span className={`text-xs font-black ${(student.tuitionBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {(student.tuitionBalance || 0).toLocaleString()} د.ع
                    </span>
                  </div>
                  <div className="sq-badge-muted flex flex-col items-start gap-1 p-3 rounded-xl col-span-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase">ولي الأمر</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 break-all">
                      {student.parentPhone || student.parentEmail || '—'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" fullWidth onClick={() => setShowLinkedParentsModal(student)}>
                    <Users size={14} />
                    الحسابات ({student.parentIds?.length || 0})
                  </Button>
                  <ActionMenu menuId={`card-${student.id}`} activeId={activeMenu} onToggle={setActiveMenu} align="end">
                    {renderStudentMenuActions(student)}
                  </ActionMenu>
                </div>

                {!isViewOnly && (
                  <StudentPrimaryActions
                    showLabels
                    onEdit={() => openEditStudent(student)}
                    onDelete={() => setConfirmDeleteId(student.id)}
                  />
                )}
              </article>
            ))}
          </div>
        )}

        {filteredStudents.length === 0 && (
          <div className="py-20 md:py-32 text-center px-4">
             <div className="flex flex-col items-center gap-4 md:gap-6">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] flex items-center justify-center text-slate-200 border border-slate-100 shadow-inner">
                   <UserPlus size={32} />
                </div>
                <div>
                  <p className="text-slate-800 font-bold text-base md:text-lg mb-1">لا يوجد نتائج</p>
                  <p className="text-slate-400 text-xs md:text-sm italic">جرب البحث بكلمات أخرى أو أضف طالب جديد</p>
                </div>
                {!isViewOnly && (
                  <Button
                    size="lg"
                    onClick={() => {
                      setEditingStudent(null);
                      setNewStudent({
                        name: '',
                        classId: '',
                        parentEmail: '',
                        parentPhone: '',
                        address: '',
                        parentPassword: '',
                        photoUrl: '',
                        registrationNumber: '',
                        email: '',
                        password: '',
                        driverPhone: '',
                      });
                      setShowAddModal(true);
                    }}
                  >
                    أضف طالب
                  </Button>
                )}
             </div>
          </div>
        )}
        
        {hasMore && (
          <div className="flex justify-center p-4 md:p-6 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="secondary"
              size="lg"
              className="w-full md:w-auto"
              onClick={() => fetchStudents(true)}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
            </Button>
          </div>
        )}
        </div>
      </Panel>


      <AnimatePresence>
        {showLinkedParentsModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }} 
              className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative border border-slate-200 overflow-hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 font-display">الحسابات المربوطة</h2>
                  <p className="text-slate-500 text-xs mt-1">أولياء الأمور الذين لديهم وصول لبيانات {showLinkedParentsModal.name}</p>
                </div>
                <button 
                  onClick={() => setShowLinkedParentsModal(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 text-right">
                {isLoadingParents ? (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-sm text-slate-400 font-bold">جاري تحميل البيانات...</p>
                  </div>
                ) : linkedParents.length > 0 ? (
                  linkedParents.map(parent => (
                    <div key={parent.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all hover:bg-white group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-slate-900 transition-colors">
                          <Users size={18} />
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 text-sm">{parent.name || 'ولي أمر'}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{parent.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setParentToUnlink({ parentId: parent.id, parentName: parent.name || parent.email })}
                          className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                          title="إلغاء الربط فقط"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                        <button 
                          onClick={() => setParentToDelete({ id: parent.id, name: parent.name || 'ولي أمر', email: parent.email })}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="حذف الحساب نهائياً"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200 shadow-sm">
                      <Users size={32} />
                    </div>
                    <p className="text-sm text-slate-400 font-bold italic">لا توجد حسابات مربوطة بهذا الطالب</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setShowLinkedParentsModal(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  إغلاق النافذة
                </button>
              </div>

              <AnimatePresence>
                {parentToUnlink && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center p-8 rounded-[2.5rem]">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="text-center"
                    >
                      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
                        <AlertTriangle size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-slate-900 mb-2">تأكيد إلغاء الربط</h3>
                      <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        هل أنت متأكد من رغبتك في إلغاء ربط الحساب <span className="font-bold text-slate-900">({parentToUnlink.parentName})</span> بهذا الطالب؟
                      </p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setParentToUnlink(null)}
                          className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
                        >
                          إلغاء
                        </button>
                        <button 
                          onClick={handleUnlinkParent}
                          disabled={isLoadingParents}
                          className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                        >
                          {isLoadingParents ? 'جاري التنفيذ...' : 'إلغاء الربط'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {parentToDelete && (
                  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 flex items-center justify-center p-8 rounded-[2.5rem]">
                    <motion.div 
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      className="text-center transition-all"
                    >
                      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
                        <AlertTriangle size={40} />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">حذف الحساب نهائياً؟</h3>
                      <p className="text-slate-500 text-sm mb-2 leading-relaxed px-4">
                        سيتم حذف حساب <span className="font-bold text-slate-900">{parentToDelete.name}</span> نهائياً من النظام (Auth & Firestore).
                      </p>
                      <p className="text-red-500 text-[11px] font-bold mb-8 px-4 py-2 bg-red-50 rounded-lg inline-block border border-red-100 mx-4">
                        تحذير: سيتم إلغاء ربط الولي من جميع الطلاب المرتبطين به في هذه المدرسة.
                      </p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setParentToDelete(null)}
                          className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                        >
                          إلغاء
                        </button>
                        <button 
                          onClick={handleDeleteParentAccount}
                          disabled={isLoadingParents}
                          className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {isLoadingParents ? 'جاري الحذف...' : 'حذف نهائي'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMoveModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.95, opacity: 0, y: 20 }} 
               className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative border border-slate-200"
             >
               <h2 className="text-2xl font-bold mb-2 text-slate-900 font-display">نقل الطالب لصف آخر</h2>
               <p className="text-slate-500 text-xs mb-8 italic">سيتم نقل الطالب {showMoveModal.name} إلى الصف الدراسي الجديد المختار.</p>
               
               <form onSubmit={handleMoveStudent} className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">اختر الصف الجديد</label>
                   <select
                     required
                     value={targetClassId}
                     onChange={e => setTargetClassId(e.target.value)}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-bold appearance-none"
                   >
                     <option value="">اختر الصف...</option>
                     {classes.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
                     ))}
                   </select>
                 </div>

                 <div className="flex gap-4 pt-4">
                   <button
                     disabled={isMoving}
                     type="submit"
                     className="flex-1 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                   >
                     {isMoving ? 'جاري النقل...' : 'تأكيد النقل'}
                   </button>
                   <button
                     type="button"
                     onClick={() => setShowMoveModal(null)}
                     className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                   >
                     إلغاء
                   </button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <StudentFormModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        isEdit={!!editingStudent}
        value={newStudent}
        onChange={(patch) => setNewStudent((prev) => ({ ...prev, ...patch }))}
        classes={classes}
        isUploadingPhoto={isUploadingPhoto}
        onPhotoUpload={handlePhotoUpload}
        onSubmit={handleAdd}
      />

      <AnimatePresence>
        {showLinkParentModal && (
          <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4 backdrop-blur-md">
             <motion.div 
               initial={{ scale: 0.95, opacity: 0, y: 20 }} 
               animate={{ scale: 1, opacity: 1, y: 0 }} 
               exit={{ scale: 0.95, opacity: 0, y: 20 }} 
               className="bg-white rounded-[2.5rem] w-full max-w-lg p-10 shadow-2xl relative border border-slate-200 overflow-hidden"
             >
               <div className="relative z-10">
                 <h2 className="text-2xl font-bold mb-1 text-slate-900 font-display">ربط حساب ولي أمر</h2>
                 <p className="text-slate-500 text-xs mb-8 leading-relaxed">أدخل البريد الإلكتروني لولي أمر الطالب {showLinkParentModal.name}. سيتمكن ولي الأمر من رؤية النتائج والتبليغات عند التسجيل بهذا البريد.</p>
                 
                 <form onSubmit={handleLinkParent} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">اسم ولي الأمر</label>
                      <input
                        required
                        type="text"
                        value={parentName}
                        onChange={e => setParentName(e.target.value)}
                        className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 text-right"
                        placeholder="الاسم الكامل لولي الأمر..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">البريد الإلكتروني لولي الأمر</label>
                      <input
                        required
                        type="email"
                        value={parentEmail}
                        onChange={e => setParentEmail(e.target.value)}
                        className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 text-left"
                        placeholder="parent@example.com"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">رقم الهاتف</label>
                        <input
                          required
                          type="text"
                          value={parentPhone}
                          onChange={e => setParentPhone(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-bold text-slate-900"
                          placeholder="07XXXXXXXXX"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">كلمة السر</label>
                        <input
                          required
                          type="text"
                          value={parentPassword}
                          onChange={e => setParentPassword(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-mono"
                          placeholder="كلمة السر..."
                        />
                      </div>
                    </div>
 
                    <div className="flex gap-4 pt-4">
                      <button
                        disabled={isLinking}
                        type="submit"
                        className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {isLinking ? 'جاري الربط...' : 'إتمام عملية الربط'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLinkParentModal(null);
                          setParentEmail('');
                          setParentName('');
                          setParentPhone('');
                          setParentPassword('');
                        }}
                        className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                      >
                        إلغاء
                      </button>
                    </div>
                  </form>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <Modal
        open={!!confirmDeleteId}
        onClose={() => {
          if (!isDeleting) setConfirmDeleteId(null);
        }}
        title="تأكيد حذف الطالب"
        description="لا يمكن التراجع عن هذا الإجراء"
        icon={
          <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/30 text-red-600 flex items-center justify-center">
            <AlertTriangle size={26} />
          </div>
        }
        maxWidthClass="max-w-md"
        footer={
          <div className="flex flex-col-reverse sm:flex-row-reverse gap-2 w-full">
            <Button
              variant="danger"
              size="lg"
              className="flex-1"
              disabled={!!isDeleting}
              onClick={() => confirmDeleteId && handleDeleteStudent(confirmDeleteId)}
            >
              {isDeleting ? 'جاري الحذف...' : 'نعم، احذف السجل'}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              className="flex-1"
              disabled={!!isDeleting}
              onClick={() => setConfirmDeleteId(null)}
            >
              إلغاء
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          هل أنت متأكد من حذف سجل الطالب{' '}
          <span className="font-bold text-slate-900 dark:text-white">
            {students.find((s) => s.id === confirmDeleteId)?.name}
          </span>{' '}
          نهائياً؟ سيتم حذف البيانات المرتبطة من النظام.
        </p>
      </Modal>
    </div>
  );
}