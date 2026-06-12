import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, updateDoc, doc, deleteDoc, setDoc, runTransaction, increment, arrayUnion, arrayRemove, getDoc, limit, startAfter, orderBy } from 'firebase/firestore';
import { useAuth } from '../../lib/AuthContext';
import { Search, Plus, UserPlus, Filter, MoreVertical, GraduationCap, Copy, Check, Trash2, AlertTriangle, X, Users, ArrowRightLeft, Upload, Edit2, User, Hash, Phone, Mail, Key, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { modalPanelProps } from '../../lib/motion';
import { handleFirestoreError, OperationType } from '../../lib/firestore-errors';
import { uploadStudentPhoto } from '../../lib/imageUtils';

import { adminCreateUser, adminDeleteUser } from '../../lib/adminApi';

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
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
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
    let isMounted = true;
    if (isMounted) fetchStudents();
    return () => { isMounted = false; };
  }, [profile]);

  const closeAddModal = () => {
    setShowAddModal(false);
    setEditingStudent(null);
    setPendingStudentId(null);
  };

  const openAddStudentModal = () => {
    setEditingStudent(null);
    setPendingStudentId(doc(collection(db, 'students')).id);
    setNewStudent({
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
      photoUrl: '',
    });
    setShowAddModal(true);
  };

  const resolvePhotoUploadStudentId = (): string | null => {
    if (editingStudent?.id) return editingStudent.id;
    if (pendingStudentId) return pendingStudentId;
    const draftId = doc(collection(db, 'students')).id;
    setPendingStudentId(draftId);
    return draftId;
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-student-menu]')) return;
      setActiveMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('?? ??? ?????');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteStudent = async (id: string) => {
    const isSuperAdmin = profile?.role === 'superadmin';
    if (!profile || (!profile.schoolId && !isSuperAdmin)) return;
    if (profile.role !== 'admin' && !isSuperAdmin) {
      toast.error('??? ???? ?? ???? ??????');
      return;
    }

    setIsDeleting(id);
    const loadingToast = toast.loading('???? ??? ??? ??????...');
    try {
      const studentRef = doc(db, 'students', id);

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', id);

        // All reads before any writes (Firestore transaction requirement).
        const studentSnap = await transaction.get(studentRef);
        const userSnap = await transaction.get(userRef);

        if (!studentSnap.exists()) {
          throw new Error('??? ?????? ??? ?????');
        }

        const studentData = studentSnap.data() || {};
        const studentSchoolId = String(studentData.schoolId || '');
        if (!isSuperAdmin && studentSchoolId !== profile.schoolId) {
          throw new Error('??? ????? ???? ???? ?? ????? ????');
        }
        if (!studentSchoolId) {
          throw new Error('??? ?????? ?? ????? ??? ???? ???????');
        }

        const schoolRef = doc(db, 'schools', studentSchoolId);
        const schoolSnap = await transaction.get(schoolRef);
        if (!schoolSnap.exists()) {
          throw new Error('??? ??????? ??? ?????');
        }

        const shouldDeleteLinkedUser =
          userSnap.exists() &&
          (isSuperAdmin ||
            (userSnap.data() || {}).schoolId === profile.schoolId);

        transaction.delete(studentRef);
        if (shouldDeleteLinkedUser) {
          transaction.delete(userRef);
        }
        transaction.update(schoolRef, {
          studentCount: increment(-1),
        });
      });

      setStudents((prev) => prev.filter((s) => s.id !== id));
      setConfirmDeleteId(null);
      toast.dismiss(loadingToast);
      toast.success('?? ??? ?????? ??????? ?? ??????');
    } catch (error: unknown) {
      toast.dismiss(loadingToast);
      console.error('Delete student error:', error);
      handleFirestoreError(error, OperationType.DELETE, `students/${id}`);
      const message = error instanceof Error ? error.message : '??? ?? ??? ??????';
      toast.error(message);
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
        toast.error('??? ?? ????? ?????? ?????? ??????');
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
      
      toast.success('?? ????? ????? ?????');
      setParentToUnlink(null);
    } catch (error) {
      console.error('Error unlinking parent:', error);
      toast.error('??? ?? ????? ?????');
    } finally {
      setIsLoadingParents(false);
    }
  };

  const handleLinkParent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.schoolId || !showLinkParentModal) return;
    if (parentPassword && parentPassword.length < 6) {
      toast.error('???? ???? ??? ?? ???? 6 ???? ??? ?????');
      return;
    }

    setIsLinking(true);
    try {
      const emailLower = parentEmail.toLowerCase().trim();
      
      // Always use Admin API to ensure Auth and Firestore are in sync
      const result = await adminCreateUser({
        email: emailLower,
        password: parentPassword || undefined, 
        displayName: parentName || '??? ??? ????',
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

      toast.success('?? ??? ??? ????? ?????? ???????? ?????');
      setShowLinkParentModal(null);
      setParentEmail('');
      setParentName('');
      setParentPhone('');
      setParentPassword('');
    } catch (error: any) {
      console.error('Link parent error:', error);
      toast.error(error.message || '??? ??? ??? ?????');
    } finally {
      setIsLinking(false);
    }
  };

  const handleDeleteParentAccount = async () => {
    if (!parentToDelete || !profile?.schoolId) return;
    setIsLoadingParents(true);
    const loadingToast = toast.loading('???? ??? ???? ??? ????? ???????...');
    
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
      toast.success('?? ??? ???? ??? ????? ??????? ?? ??????');
      
      // Update local state if the modal is open
      setLinkedParents(prev => prev.filter(p => p.id !== parentToDelete.id));
      setParentToDelete(null);
    } catch (error: any) {
      toast.dismiss(loadingToast);
      console.error('Delete parent account error:', error);
      toast.error(error.message || '??? ??? ??????');
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
      toast.success('?? ??? ?????? ?????');
      setShowMoveModal(null);
      setTargetClassId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `students/${showMoveModal.id}`);
      toast.error('??? ??? ??????');
    } finally {
      setIsMoving(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('ADD_STUDENT_SUBMIT_STARTED');
    if (!profile?.schoolId) return;
    if (!newStudent.name.trim()) {
      toast.error('???? ????? ??? ??????');
      return;
    }
    if (!newStudent.registrationNumber.trim()) {
      toast.error('???? ????? ??? ????? ???????');
      return;
    }
    if (!newStudent.classId) {
      toast.error('???? ?????? ????');
      return;
    }
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
              displayName: '??? ??? ????',
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
        
        setStudents((prev) =>
          prev.map((s) =>
            s.id === editingStudent.id
              ? {
                  ...s,
                  name: newStudent.name,
                  registrationNumber: newStudent.registrationNumber,
                  classId: newStudent.classId,
                  parentPhone: newStudent.parentPhone || '',
                  driverPhone: newStudent.driverPhone || '',
                  parentEmail: newStudent.parentEmail?.toLowerCase() || '',
                  address: newStudent.address || '',
                  photoUrl: newStudent.photoUrl || '',
                }
              : s,
          ),
        );
        toast.success('?? ????? ?????? ?????? ?????');
      } else {
        const studentId = pendingStudentId || doc(collection(db, 'students')).id;
        
        // Atomic transaction for adding student and incrementing count
        console.log('ADD_STUDENT_TRANSACTION_START');
        await runTransaction(db, async (transaction) => {
          const schoolRef = doc(db, 'schools', profile.schoolId!);
          const schoolSnap = await transaction.get(schoolRef);
          
          if (!schoolSnap.exists()) throw new Error('??????? ??? ??????');
          
          const schoolData = schoolSnap.data();
          const currentCount = schoolData.studentCount || 0;
          
          // Get package details to check limit
          const planId = schoolData.planId || 'basic';
          const planSnap = await transaction.get(doc(db, 'packages', planId));
          const maxStudents = planSnap.exists() ? (planSnap.data().maxStudents || 500) : 500;
          
          if (currentCount >= maxStudents) {
            throw new Error(`??? ???? ???? ?????? ?????? ??????? ?? ?? ????? ??????? (${maxStudents} ????). ???? ??????? ?????? ??????.`);
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
              displayName: '??? ??? ????',
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
            toast.error('?? ????? ?????? ???? ??? ????? ???? ??? ????? ????????. ???? ?????? ??????.');
          }
        }
        
        await fetchStudents();
        toast.success('??? ????? ?????? ?????');
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
      console.log('ADD_STUDENT_SUCCESS');
      closeAddModal();
    } catch (error: any) {
      console.log('ADD_STUDENT_ERROR', error);
      console.error('Error adding student:', error);
      toast.error(error.message || '??? ??? ????? ????????');
      handleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.WRITE, isEditing ? `students/${editingStudent.id}` : 'students');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.schoolId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('???? ?????? ??? ???? ???? (JPG ?? PNG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('??? ?????? ??? ?? ?? ?????? 5 ????????');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      const studentId = resolvePhotoUploadStudentId();
      if (!studentId) {
        toast.error('???? ????? ???? ??????. ???? ??????? ????? ??? ????');
        return;
      }
      const url = await uploadStudentPhoto(file, profile.schoolId, studentId);
      setNewStudent((prev) => ({ ...prev, photoUrl: url }));
      toast.success('?? ??? ?????? ?????');
    } catch (error) {
      console.error('Error uploading student photo:', error);
      const code = error instanceof Error ? error.message : '';
      if (code === 'INVALID_IMAGE_TYPE') {
        toast.error('???? ?????? ??? ???? ???? (JPG ?? PNG)');
      } else if (code === 'FILE_TOO_LARGE') {
        toast.error('??? ?????? ??? ?? ?? ?????? 5 ????????');
      } else if (code === 'INVALID_FILE_TYPE') {
        toast.error('??? ????? ??? ?????. ?????? JPG ?? PNG');
      } else if (code === 'STORAGE_UNAUTHORIZED') {
        toast.error('??????? ??? ????? ??? ?????? ??? ??????. ???? ??? ????? Firebase Storage ?? ????? ????????');
      } else if (code === 'INVALID_STUDENT_ID') {
        toast.error('???? ??? ????? ????? ?????? ????? ?? ??? ??????');
      } else {
        toast.error('??? ??? ??????. ???? ?? ??????? ??????????');
      }
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const [viewMode, setViewMode] = useState<'table' | 'cards'>(window.innerWidth < 768 ? 'cards' : 'table');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredStudents = students.filter(student => 
    (student.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (student.registrationNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-slate-900 font-display">????? ??????</h1>
          <p className="text-slate-500 text-xs md:text-sm mt-1">????? ?????? ???????? ?????? ?? ???? ???????</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
               type="text" 
               placeholder="??? ?? ????..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
               className="pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none w-full lg:w-80 transition-all font-medium text-sm md:text-base"
            />
          </div>
          <div className="flex gap-2">
            {!isViewOnly && (
              <button
                onClick={openAddStudentModal}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 md:px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold shadow-lg active:scale-95 whitespace-nowrap text-sm"
              >
                <Plus size={20} />
                <span>???? ????</span>
              </button>
            )}
            <button
              onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
              className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:bg-slate-50 transition-all shadow-sm md:hidden"
            >
              {viewMode === 'table' ? <Users size={20} /> : <Filter size={20} />}
            </button>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-200 ${viewMode === 'cards' ? 'overflow-visible' : 'overflow-hidden'}`}>
        <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <span className="text-[10px] md:text-xs font-extrabold text-slate-400 uppercase tracking-[0.2em]">???????: {filteredStudents.length}</span>
          <div className="hidden md:flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button 
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              ????
            </button>
            <button 
              onClick={() => setViewMode('cards')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
            >
              ??????
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto overflow-y-hidden custom-scrollbar">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] border-b border-slate-200">
                  <th className="px-8 py-5">??? ??????</th>
                  <th className="px-8 py-5">??? ????? (?????)</th>
                  <th className="px-8 py-5">????</th>
                  <th className="px-8 py-5">?????? ???????</th>
                  <th className="px-8 py-5 text-center">?????????</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map(student => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-slate-900 transition-colors shadow-sm overflow-hidden shrink-0">
                           {student.photoUrl ? <img src={student.photoUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <GraduationCap size={20} />}
                        </div>
                        <div className="min-w-0">
                          <span className="font-bold text-slate-900 block font-display leading-none truncate">{student.name}</span>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block whitespace-nowrap">???: {new Date(student.createdAt?.seconds * 1000).toLocaleDateString('ar-IQ')}</span>
                            {student.parentIds?.length > 0 && (
                              <button 
                                onClick={() => setShowLinkedParentsModal(student)}
                                className="text-[9px] bg-slate-900 text-white px-2 py-0.5 rounded-md font-bold hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                              >
                                <Users size={10} />
                                {student.parentIds.length} ????
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-2 group/copy">
                        <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                          {student.registrationNumber}
                        </span>
                        <button 
                          onClick={() => handleCopy(student.registrationNumber, student.id)}
                          className={`p-2 rounded-lg transition-all ${copiedId === student.id ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-slate-400 hover:text-slate-900 border border-slate-200 opacity-0 group-hover/copy:opacity-100 shadow-sm'}`}
                        >
                          {copiedId === student.id ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="px-4 py-1.5 bg-slate-900 text-white rounded-full text-[10px] font-bold tracking-widest shadow-lg whitespace-nowrap">
                        {classes.find(c => c.id === student.classId)?.name || '??? ????'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`font-bold text-base ${(student.tuitionBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-600'} font-display`}>
                        {(student.tuitionBalance || 0).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">?.?</span>
                      </span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <div className="flex justify-center gap-2 relative">
                        {!isViewOnly && (
                          <button 
                             onClick={() => {
                               setShowLinkParentModal(student);
                               setParentEmail(student.parentEmail || '');
                               setParentName(student.parentName || '');
                               setParentPhone(student.parentPhone || '');
                               setParentPassword(student.parentPassword || '');
                             }}
                             className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                             title="??? ???? ???"
                          >
                            <UserPlus size={18} />
                          </button>
                        )}
                        <div className="relative" data-student-menu>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenu(activeMenu === student.id ? null : student.id);
                            }}
                            className={`${activeMenu === student.id ? 'bg-slate-900 text-white shadow-lg' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-900'} p-2.5 rounded-xl transition-all active:scale-95`}
                          >
                            <MoreVertical size={18} />
                          </button>
                          
                          <AnimatePresence>
                            {activeMenu === student.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[70] overflow-hidden backdrop-blur-xl bg-white/95"
                              >
                                <div className="p-2.5">
                                    <button
                                      onClick={() => { setShowLinkedParentsModal(student); setActiveMenu(null); }}
                                      className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                                    >
                                      <Users size={16} className="text-slate-400" />
                                      ??? ???????? ????????
                                    </button>
                                    {!isViewOnly && (
                                      <>
                                        <button
                                          onClick={() => {
                                            setShowLinkParentModal(student);
                                            setParentEmail(student.parentEmail || '');
                                            setParentName(student.parentName || '');
                                            setParentPhone(student.parentPhone || '');
                                            setParentPassword(student.parentPassword || '');
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                                        >
                                          <UserPlus size={16} className="text-slate-400" />
                                          ??? ???? ??? ????
                                        </button>
                                        <button
                                          onClick={() => {
                                            setShowMoveModal(student);
                                            setTargetClassId(student.classId || '');
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                                        >
                                          <ArrowRightLeft size={16} className="text-slate-400" />
                                          ??? ??? ???
                                        </button>
                                        <button
                                          onClick={() => {
                                            setPendingStudentId(null);
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
                                              email: '',
                                              password: ''
                                            });
                                            setShowAddModal(true);
                                            setActiveMenu(null);
                                          }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                                        >
                                          <GraduationCap size={16} className="text-slate-400" />
                                          ????? ????????
                                        </button>
                                        <div className="h-px bg-slate-100 my-2 mx-2" />
                                        <button
                                          onClick={() => { setConfirmDeleteId(student.id); setActiveMenu(null); }}
                                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        >
                                          <Trash2 size={16} className="text-red-400" />
                                          ??? ??????
                                        </button>
                                      </>
                                    )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Card View / Responsive Grid */}
        {viewMode === 'cards' && (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 bg-slate-50">
            {filteredStudents.map(student => (
              <div key={student.id} className="p-4 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col gap-4 relative group overflow-visible">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                    {student.photoUrl ? <img src={student.photoUrl || undefined} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <GraduationCap size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-900 truncate font-display">{student.name}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{classes.find(c => c.id === student.classId)?.name || '??? ????'}</p>
                  </div>
                  <div className="relative shrink-0" data-student-menu>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(activeMenu === student.id ? null : student.id);
                      }}
                      className={`p-2 rounded-xl shadow-sm border transition-all active:scale-95 ${
                        activeMenu === student.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'text-slate-400 bg-white border-slate-200'
                      }`}
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">??? ?????</span>
                    <span className="text-[10px] font-mono font-bold text-slate-600">{student.registrationNumber}</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">?????? ??????</span>
                    <span className={`text-[10px] font-black ${(student.tuitionBalance || 0) > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {(student.tuitionBalance || 0).toLocaleString()} ?.?
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowLinkedParentsModal(student)}
                    className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <Users size={12} />
                    <span>???????? ({student.parentIds?.length || 0})</span>
                  </button>
                  {!isViewOnly && (
                    <button 
                      onClick={() => setShowLinkParentModal(student)}
                      className="w-10 h-10 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl flex items-center justify-center"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>

                <AnimatePresence>
                  {activeMenu === student.id && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -8 }}
                      onClick={(e) => e.stopPropagation()}
                      data-student-menu
                      className="absolute left-0 top-12 z-[70] w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                    >
                      <div className="p-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setShowLinkedParentsModal(student);
                            setActiveMenu(null);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                        >
                          <Users size={16} className="text-slate-400" />
                          ??? ???????? ????????
                        </button>
                        {!isViewOnly && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setShowLinkParentModal(student);
                                setParentEmail(student.parentEmail || '');
                                setParentName(student.parentName || '');
                                setParentPhone(student.parentPhone || '');
                                setParentPassword(student.parentPassword || '');
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-all"
                            >
                              <UserPlus size={16} className="text-slate-400" />
                              ??? ???? ??? ????
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPendingStudentId(null);
                                setEditingStudent(student);
                                setNewStudent({
                                  name: student.name,
                                  registrationNumber: student.registrationNumber,
                                  classId: student.classId || '',
                                  parentPhone: student.parentPhone || '',
                                  driverPhone: student.driverPhone || '',
                                  parentEmail: student.parentEmail || '',
                                  address: student.address || '',
                                  parentPassword: student.parentPassword || '',
                                  photoUrl: student.photoUrl || '',
                                  email: '',
                                  password: '',
                                });
                                setShowAddModal(true);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                            >
                              <GraduationCap size={16} className="text-slate-400" />
                              ????? ????????
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowMoveModal(student);
                                setTargetClassId(student.classId || '');
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
                            >
                              <ArrowRightLeft size={16} className="text-slate-400" />
                              ??? ??? ???
                            </button>
                            <div className="h-px bg-slate-100 my-2 mx-2" />
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(student.id);
                                setActiveMenu(null);
                              }}
                              className="w-full flex items-center gap-3 px-4 py-3 text-right text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} className="text-red-400" />
                              ??? ??????
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                  <p className="text-slate-800 font-bold text-base md:text-lg mb-1">?? ???? ?????</p>
                  <p className="text-slate-400 text-xs md:text-sm italic">??? ????? ?????? ???? ?? ??? ???? ????</p>
                </div>
                {!isViewOnly && (
                  <button onClick={openAddStudentModal} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all text-sm">??? ????</button>
                )}
             </div>
          </div>
        )}
        
        {hasMore && (
          <div className="flex justify-center p-4 md:p-6 border-t border-slate-100">
            <button
              onClick={() => fetchStudents(true)}
              disabled={isLoadingMore}
              className="w-full md:w-auto px-10 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-2xl transition-all disabled:opacity-50 text-xs md:text-sm shadow-sm"
            >
              {isLoadingMore ? '???? ???????...' : '????? ??????'}
            </button>
          </div>
        )}
      </div>


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
                  <h2 className="text-2xl font-bold text-slate-900 font-display">???????? ????????</h2>
                  <p className="text-slate-500 text-xs mt-1">?????? ?????? ????? ????? ???? ??????? {showLinkedParentsModal.name}</p>
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
                    <p className="text-sm text-slate-400 font-bold">???? ????? ????????...</p>
                  </div>
                ) : linkedParents.length > 0 ? (
                  linkedParents.map(parent => (
                    <div key={parent.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm transition-all hover:bg-white group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-200 group-hover:border-slate-900 transition-colors">
                          <Users size={18} />
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900 text-sm">{parent.name || '??? ???'}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{parent.email}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => setParentToUnlink({ parentId: parent.id, parentName: parent.name || parent.email })}
                          className="p-2 text-slate-300 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-all"
                          title="????? ????? ???"
                        >
                          <ArrowRightLeft size={16} />
                        </button>
                        <button 
                          onClick={() => setParentToDelete({ id: parent.id, name: parent.name || '??? ???', email: parent.email })}
                          className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="??? ?????? ???????"
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
                    <p className="text-sm text-slate-400 font-bold italic">?? ???? ?????? ?????? ???? ??????</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button 
                  onClick={() => setShowLinkedParentsModal(null)}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  ????? ???????
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
                      <h3 className="text-xl font-bold text-slate-900 mb-2">????? ????? ?????</h3>
                      <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                        ?? ??? ????? ?? ????? ?? ????? ??? ?????? <span className="font-bold text-slate-900">({parentToUnlink.parentName})</span> ???? ???????
                      </p>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => setParentToUnlink(null)}
                          className="flex-1 py-3 bg-slate-100 text-slate-500 font-bold rounded-xl hover:bg-slate-200 transition-all"
                        >
                          ?????
                        </button>
                        <button 
                          onClick={handleUnlinkParent}
                          disabled={isLoadingParents}
                          className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50"
                        >
                          {isLoadingParents ? '???? ???????...' : '????? ?????'}
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
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">??? ?????? ????????</h3>
                      <p className="text-slate-500 text-sm mb-2 leading-relaxed px-4">
                        ???? ??? ???? <span className="font-bold text-slate-900">{parentToDelete.name}</span> ??????? ?? ?????? (Auth & Firestore).
                      </p>
                      <p className="text-red-500 text-[11px] font-bold mb-8 px-4 py-2 bg-red-50 rounded-lg inline-block border border-red-100 mx-4">
                        ?????: ???? ????? ??? ????? ?? ???? ?????? ????????? ?? ?? ??? ???????.
                      </p>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => setParentToDelete(null)}
                          className="flex-1 py-4 bg-slate-100 text-slate-500 font-bold rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                        >
                          ?????
                        </button>
                        <button 
                          onClick={handleDeleteParentAccount}
                          disabled={isLoadingParents}
                          className="flex-1 py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/20 active:scale-95 disabled:opacity-50"
                        >
                          {isLoadingParents ? '???? ?????...' : '??? ?????'}
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
               <h2 className="text-2xl font-bold mb-2 text-slate-900 font-display">??? ?????? ??? ???</h2>
               <p className="text-slate-500 text-xs mb-8 italic">???? ??? ?????? {showMoveModal.name} ??? ???? ??????? ?????? ???????.</p>
               
               <form onSubmit={handleMoveStudent} className="space-y-6">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">???? ???? ??????</label>
                   <select
                     required
                     value={targetClassId}
                     onChange={e => setTargetClassId(e.target.value)}
                     className="w-full px-6 py-4 rounded-2xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-bold appearance-none"
                   >
                     <option value="">???? ????...</option>
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
                     {isMoving ? '???? ?????...' : '????? ?????'}
                   </button>
                   <button
                     type="button"
                     onClick={() => setShowMoveModal(null)}
                     className="px-6 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95"
                   >
                     ?????
                   </button>
                 </div>
               </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {showAddModal && (
            <div
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md pointer-events-auto"
              onClick={(e) => {
                if (e.target === e.currentTarget) closeAddModal();
              }}
            >
              <motion.div
                {...modalPanelProps()}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-xl shadow-2xl relative border border-slate-200 dark:border-slate-800 max-h-[min(90vh,calc(100dvh-2rem))] flex flex-col overflow-hidden text-right pointer-events-auto"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 dark:bg-slate-800/40 rounded-full -translate-y-32 translate-x-32 shadow-inner pointer-events-none" />
                <div className="relative z-10 flex flex-col flex-1 min-h-0 px-6 md:px-10 pt-6 md:pt-8 pointer-events-auto">
                  <div className="flex items-center justify-between mb-2 shrink-0">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
                      <GraduationCap className="text-[#0B2345] dark:text-[#D4A64A]" size={28} />
                      <span>{editingStudent ? '????? ?????? ??????' : '????? ???? ????'}</span>
                    </h2>
                    <button
                      type="button"
                      onClick={closeAddModal}
                      className="p-1 px-2.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all touch-manipulation"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mb-4 leading-relaxed italic text-right shrink-0">
                    ???? ?????? ?? ??? ???????? ??????? ??? ???? ??????? ????? ?? ??????? ??????? ????????.
                  </p>

                  <form
                    noValidate
                    onSubmit={handleAdd}
                    className="flex flex-col flex-1 min-h-0 pointer-events-auto"
                  >
                    <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-6 pb-4 custom-scrollbar">

                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800/60">
                     <div className="flex-1 space-y-2">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">?????? ??????? (???????)</label>
                       <div className="flex items-center gap-4">
                         <div className="w-14 h-14 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                           {newStudent.photoUrl ? (
                             <img src={newStudent.photoUrl || undefined} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                           ) : (
                             <GraduationCap size={22} className="text-slate-400" />
                           )}
                         </div>
                         <div className="flex-1 relative">
                           <input
                             type="file"
                             accept="image/*"
                             onChange={handlePhotoUpload}
                             className="hidden"
                             id="student-photo-upload"
                           />
                           <label
                             htmlFor="student-photo-upload"
                             className="cursor-pointer flex items-center justify-center gap-1.5 w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 border-dashed rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-[#0B2345] dark:hover:text-white transition-all font-bold text-xs"
                           >
                             <Upload size={14} />
                             {isUploadingPhoto ? '???? ?????...' : '??? ????'}
                           </label>
                         </div>
                       </div>
                     </div>
                     <div className="flex-1 space-y-2">
                       <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">?? ???? ??????</label>
                       <input
                         type="text"
                         dir="ltr"
                         value={newStudent.photoUrl}
                         onChange={e => setNewStudent({...newStudent, photoUrl: e.target.value})}
                         className="w-full px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:bg-slate-50 dark:focus:bg-slate-700 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-mono text-slate-900 dark:text-white text-left"
                         placeholder="https://..."
                       />
                     </div>
                   </div>

                               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">????? ?????? ??????</label>
                        <div className="relative">
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            required
                            type="text"
                            value={newStudent.name}
                            onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-bold text-slate-900 dark:text-white"
                            placeholder="????? ??????? ??????..."
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">??? ????? ???????</label>
                        <div className="relative">
                          <Hash className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            required
                            type="text"
                            value={newStudent.registrationNumber}
                            onChange={e => setNewStudent({...newStudent, registrationNumber: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-mono font-bold text-slate-900 dark:text-white text-left"
                            placeholder="2024/001"
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">?????? ??? ?????</label>
                        <div className="relative">
                          <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            value={newStudent.parentPhone}
                            onChange={e => setNewStudent({...newStudent, parentPhone: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-bold text-slate-900 dark:text-white"
                            placeholder="07XXXXXXXXX"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">??? ?????? (??????? - ???????)</label>
                        <div className="relative">
                          <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            value={newStudent.driverPhone}
                            onChange={e => setNewStudent({...newStudent, driverPhone: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-bold text-slate-900 dark:text-white"
                            placeholder="07XXXXXXXXX"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">????? ??? ????? (??????)</label>
                        <div className="relative">
                          <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="email"
                            value={newStudent.parentEmail || ''}
                            onChange={e => setNewStudent({...newStudent, parentEmail: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-mono text-slate-900 dark:text-white text-left"
                            placeholder="parent@school.com"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">???? ???? ???? ?????</label>
                        <div className="relative">
                          <Key className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            value={newStudent.parentPassword || ''}
                            onChange={e => setNewStudent({...newStudent, parentPassword: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-mono text-slate-900 dark:text-white"
                            placeholder="P@ssw0rd123"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">???? ??????</label>
                        <div className="relative">
                          <GraduationCap className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <select
                            required
                            value={newStudent.classId}
                            onChange={e => setNewStudent({...newStudent, classId: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-bold text-slate-900 dark:text-white appearance-none"
                          >
                            <option value="">???? ?????? ????????...</option>
                            {classes.map(c => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-right">
                        <label className="block text-xs font-bold text-slate-600 dark:text-slate-300">????? ?????</label>
                        <div className="relative">
                          <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            type="text"
                            value={newStudent.address}
                            onChange={e => setNewStudent({...newStudent, address: e.target.value})}
                            className="w-full pr-11 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-[#0B2345]/10 dark:focus:ring-[#D4A64A]/10 focus:border-[#0B2345] dark:focus:border-[#D4A64A] outline-none transition-all font-bold text-slate-900 dark:text-white"
                            placeholder="???????? - ?????? - ????"
                          />
                        </div>
                      </div>
                    </div>

                    </div>

                    <div className="relative z-50 shrink-0 pointer-events-auto bg-white dark:bg-slate-900 pt-4 pb-6 md:pb-8 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                      <button
                        type="submit"
                        className="flex-1 px-8 py-3.5 bg-[#0B2345] text-white rounded-xl font-bold hover:bg-[#071830] transition-all shadow-xl active:scale-95 text-sm md:text-base border border-transparent touch-manipulation"
                      >
                        {editingStudent ? '??? ?????????' : '????? ?????? ?????'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          console.log('ADD_STUDENT_CANCEL_CLICKED');
                          closeAddModal();
                        }}
                        className="px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 text-sm md:text-base touch-manipulation"
                      >
                        ????? ?????
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body,
      )}

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
                 <h2 className="text-2xl font-bold mb-1 text-slate-900 font-display">??? ???? ??? ???</h2>
                 <p className="text-slate-500 text-xs mb-8 leading-relaxed">???? ?????? ?????????? ???? ??? ?????? {showLinkParentModal.name}. ?????? ??? ????? ?? ???? ??????? ?????????? ??? ??????? ???? ??????.</p>
                 
                 <form onSubmit={handleLinkParent} className="space-y-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">??? ??? ?????</label>
                      <input
                        required
                        type="text"
                        value={parentName}
                        onChange={e => setParentName(e.target.value)}
                        className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-bold text-slate-900 text-right"
                        placeholder="????? ?????? ???? ?????..."
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">?????? ?????????? ???? ?????</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">??? ??????</label>
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
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">???? ????</label>
                        <input
                          required
                          type="text"
                          value={parentPassword}
                          onChange={e => setParentPassword(e.target.value)}
                          className="w-full px-5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-slate-100 focus:border-slate-900 outline-none transition-all font-mono"
                          placeholder="???? ????..."
                        />
                      </div>
                    </div>
 
                    <div className="flex gap-4 pt-4">
                      <button
                        disabled={isLinking}
                        type="submit"
                        className="flex-1 px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                      >
                        {isLinking ? '???? ?????...' : '????? ????? ?????'}
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
                        ?????
                      </button>
                    </div>
                 </form>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-right"
              dir="rtl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-6 mx-auto md:mx-0">
                <AlertTriangle size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 font-display">????? ??? ??????</h2>
              <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                ?? ??? ????? ?? ??? ??? ?????? <span className="font-bold text-slate-900 dark:text-white">{students.find(s => s.id === confirmDeleteId)?.name}</span> ???????? 
                <span className="block mt-2 text-red-500 font-bold text-xs">??? ??????? ????? ???? ???? ???????? ???????? ??? ???? ??????? ???.</span>
              </p>
              
              <div className="flex flex-col-reverse md:flex-row-reverse gap-4">
                <button
                  disabled={!!isDeleting}
                  onClick={() => handleDeleteStudent(confirmDeleteId)}
                  className="flex-1 px-6 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-600/20 active:scale-95 disabled:opacity-50"
                >
                  {isDeleting ? '???? ?????...' : '???? ???? ?????'}
                </button>
                <button
                  disabled={!!isDeleting}
                  onClick={() => setConfirmDeleteId(null)}
                  className="px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95"
                >
                  ?????
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
