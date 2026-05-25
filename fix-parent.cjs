const fs = require('fs');

let content = fs.readFileSync('src/views/ParentDashboard.tsx', 'utf8');

const targetStart = '  useEffect(() => {\n    if (!selectedStudent?.id || !auth.currentUser || !profile?.uid) return;';
const targetEnd = '  }, [selectedStudent, profile?.uid]);';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd, startIndex) + targetEnd.length;

if (startIndex === -1 || endIndex === -1) {
  console.error('Target not found');
  process.exit(1);
}

const originalBlock = content.substring(startIndex, endIndex);

const newBlock = `  useEffect(() => {
    if (!selectedStudent?.id || !auth.currentUser || !profile?.uid) return;
    const isParentOrAdmin = [
      "parent",
      "admin",
      "superadmin",
      "staff",
      "teacher",
    ].includes(profile?.role || "");
    if (!isParentOrAdmin) return;

    let unsubs: (() => void)[] = [];

    try {
      setLoadingGrades(true);
      setMarketLoading(true);

      const currentClassId = selectedStudent.classId || selectedStudent.class;

      // 1. Grades
      const gradesQ = query(
        collection(db, "grades"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
        limit(50)
      );
      unsubs.push(onSnapshot(gradesQ, snap => {
        const allGrades = snap.docs.map((doc) => {
          const data = doc.data();
          const score = Number(data.score ?? 0);
          const maxScore = Number(data.maxScore || 100);
          return {
            id: doc.id,
            subject: data.subject,
            score, maxScore,
            percentage: maxScore > 0 ? Math.round((score / maxScore) * 100) : 0,
            term: data.term || "",
            createdAt: data.createdAt,
          };
        }).sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setStudentGrades(allGrades);
        setLoadingGrades(false);
      }));

      // 2. Attendance
      const attendanceQ = query(
        collection(db, "attendance"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("class", "==", currentClassId || "none"),
        limit(50)
      );
      unsubs.push(onSnapshot(attendanceQ, snap => {
        let absentCount = 0;
        let lateCount = 0;
        snap.docs.forEach((doc) => {
          const records = doc.data().records || {};
          if (records[selectedStudent.id] === "absent") absentCount++;
          if (records[selectedStudent.id] === "late") lateCount++;
        });
        setAttendanceSummary({ absent: absentCount, late: lateCount });
      }));

      // 3. Announcements
      const annQ = query(
        collection(db, "announcements"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("target", "in", ["all", "parents"]),
        limit(20)
      );
      const indQ = query(
        collection(db, "announcements"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("target", "==", "individual"),
        where("targetStudentId", "==", selectedStudent.id),
        limit(10)
      );
      
      let allAnnLatest: any[] = [];
      let allIndLatest: any[] = [];
      const updateAnn = () => {
        const allAnn = [...allAnnLatest, ...allIndLatest].sort((a: any, b: any) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setAnnouncements(Array.from(new Map(allAnn.map((item) => [item.id, item])).values()));
      };
      
      unsubs.push(onSnapshot(annQ, snap => {
        allAnnLatest = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateAnn();
      }));
      unsubs.push(onSnapshot(indQ, snap => {
        allIndLatest = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateAnn();
      }));

      // 4. Payments
      const paymentsQ = query(
        collection(db, "payments"),
        where("studentId", "==", selectedStudent.id),
      );
      unsubs.push(onSnapshot(paymentsQ, snap => {
        setPayments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      // 5. Installments
      const installmentsQ = query(
        collection(db, "installments"),
        where("studentId", "==", selectedStudent.id),
      );
      unsubs.push(onSnapshot(installmentsQ, snap => {
        setInstallments(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (a.dueDate?.seconds || 0) - (b.dueDate?.seconds || 0)) as any);
      }));

      // 6. Market
      const marketQ = query(
        collection(db, "marketplace"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("status", "==", "active"),
      );
      unsubs.push(onSnapshot(marketQ, snap => {
        setMarketItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
        setMarketLoading(false);
      }));

      // 7. Notifications
      const notificationsQ = query(
        collection(db, "notifications"),
        where("userId", "==", profile.uid),
        limit(50)
      );
      unsubs.push(onSnapshot(notificationsQ, snap => {
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      // 8. Homework
      if (currentClassId) {
        const hwQ = query(
          collection(db, "homework"),
          where("schoolId", "==", selectedStudent.schoolId),
          where("classId", "==", currentClassId),
          limit(30)
        );
        unsubs.push(onSnapshot(hwQ, snap => {
          setHomework(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            .filter((hw: any) => !(hw.hiddenFor || []).includes(profile?.uid))
            .sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
        }));
      }

      // 9. Reports
      const repQ = query(
        collection(db, "teacher_reports"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("target", "in", ["parents", "both"]),
        where("parentIds", "array-contains", profile.uid),
        limit(20)
      );
      unsubs.push(onSnapshot(repQ, snap => {
        setTeacherReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      const advRepQ = query(
        collection(db, "advanced_reports"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
        limit(20)
      );
      unsubs.push(onSnapshot(advRepQ, snap => {
         setAdvancedReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a: any, b: any) => (b.createdAt?.seconds||0) - (a.createdAt?.seconds||0)) as any);
      }));

      // 10. Id Cards
      const idCardsQ = query(
        collection(db, "id_cards"),
        where("schoolId", "==", selectedStudent.schoolId),
        where("studentId", "==", selectedStudent.id),
        where("parentIds", "array-contains", profile.uid),
        limit(1)
      );
      unsubs.push(onSnapshot(idCardsQ, snap => {
        const cardsObj: Record<string, any> = {};
        snap.docs.forEach((doc) => {
          cardsObj[doc.data().studentId] = { id: doc.id, ...doc.data() };
        });
        setIdCards(cardsObj);
      }));

      // Fetch template once
      getDoc(doc(db, "schools", selectedStudent.schoolId, "settings", "idCardTemplate"))
        .then(templateSnap => {
          if (templateSnap.exists()) {
            setIdCardTemplate(templateSnap.data() as any);
          } else {
            setIdCardTemplate(null);
          }
        })
        .catch(err => console.warn("Could not fetch idCardTemplate", err));

    } catch (error) {
      console.error("Error setting up ParentDashboard listeners:", error);
    }

    return () => unsubs.forEach(unsub => unsub());
  }, [selectedStudent, profile?.uid]);`;

content = content.replace(originalBlock, newBlock);
fs.writeFileSync('src/views/ParentDashboard.tsx', content);
console.log('Successfully replaced ParentDashboard.tsx');
