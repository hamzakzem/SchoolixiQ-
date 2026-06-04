import { useMemo, useState } from 'react';
import {
  ChevronDown,
  Edit2,
  Plus,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react';
import StudentCard from '../admin/idcards/StudentCard';
import { IdCardTemplate } from '../../types/idCardTemplate';
import {
  MobileBtnPrimary,
  MobilePage,
  MobileSectionTitle,
} from './mobileUiKit';

type Props = {
  isRtl: boolean;
  classes: { id: string; name: string }[];
  selectedClassId: string;
  onClassChange: (id: string) => void;
  students: any[];
  selectedStudent: any | null;
  onSelectStudent: (s: any) => void;
  idCards: Record<string, any>;
  template: IdCardTemplate;
  canPrintBulk: boolean;
  onOpenSettings: () => void;
  onEditCard: () => void;
  onDeleteCard: () => void;
  onPrintSingle: () => void;
  onPrintBulk: () => void;
};

export default function IdCardsAppView({
  isRtl,
  classes,
  selectedClassId,
  onClassChange,
  students,
  selectedStudent,
  onSelectStudent,
  idCards,
  template,
  canPrintBulk,
  onOpenSettings,
  onEditCard,
  onDeleteCard,
  onPrintSingle,
  onPrintBulk,
}: Props) {
  const [q, setQ] = useState('');
  const [listOpen, setListOpen] = useState(false);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return students;
    return students.filter((s) =>
      (s.name || '').toLowerCase().includes(term),
    );
  }, [students, q]);

  const currentCard = selectedStudent ? idCards[selectedStudent.id] : null;
  const issued = students.filter((s) => idCards[s.id]).length;

  return (
    <MobilePage>
      <div className="flex items-center justify-between gap-2">
        <MobileSectionTitle
          title={isRtl ? 'هويات الطلاب' : 'Student ID cards'}
          icon={ShieldCheck}
          subtitle={
            isRtl
              ? `${issued} هوية صادرة في الصف`
              : `${issued} cards issued in class`
          }
        />
        <div className="flex gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#0B2345] flex items-center justify-center shadow-sm"
            aria-label={isRtl ? 'إعدادات القالب' : 'Template settings'}
          >
            <Settings2 size={18} />
          </button>
          <button
            type="button"
            disabled={!canPrintBulk}
            onClick={onPrintBulk}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-[#0B2345] flex items-center justify-center shadow-sm disabled:opacity-40"
          >
            <Users size={18} />
          </button>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-0.5">
          {isRtl ? 'الصف' : 'Class'}
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 custom-scrollbar">
          {classes.map((cls) => (
            <button
              key={cls.id}
              type="button"
              onClick={() => {
                onClassChange(cls.id);
                onSelectStudent(null);
              }}
              className={`shrink-0 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                selectedClassId === cls.id
                  ? 'bg-[#0B2345] text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600'
              }`}
            >
              {cls.name}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/95 rounded-2xl border border-slate-200/80 p-3 shadow-sm space-y-2">
        <button
          type="button"
          onClick={() => setListOpen(!listOpen)}
          className="w-full flex items-center justify-between gap-2 text-start"
        >
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase">
              {isRtl ? 'الطالب' : 'Student'}
            </p>
            <p className="text-sm font-black text-[#0B2345] truncate">
              {selectedStudent?.name ||
                (isRtl ? 'اختر طالباً' : 'Select a student')}
            </p>
          </div>
          <ChevronDown
            size={20}
            className={`text-slate-400 shrink-0 transition-transform ${listOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {listOpen ? (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <div className="relative">
              <Search
                size={16}
                className="absolute top-1/2 -translate-y-1/2 text-slate-400 start-3"
              />
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={isRtl ? 'بحث بالاسم...' : 'Search by name...'}
                className="w-full h-10 ps-9 pe-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-bold"
              />
            </div>
            <ul className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
              {filtered.map((s) => {
                const has = !!idCards[s.id];
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectStudent(s);
                        setListOpen(false);
                      }}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-start text-sm font-bold transition-colors ${
                        selectedStudent?.id === s.id
                          ? 'bg-[#0B2345]/10 text-[#0B2345]'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate">{s.name}</span>
                      {has ? (
                        <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </div>

      {selectedStudent ? (
        <div className="bg-white/95 rounded-2xl border border-slate-200/80 overflow-hidden shadow-sm">
          <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-100">
            <p className="text-xs font-black text-slate-800 truncate">
              {selectedStudent.name}
            </p>
            <div className="flex gap-1 shrink-0">
              {currentCard ? (
                <button
                  type="button"
                  onClick={onDeleteCard}
                  className="p-2 rounded-lg text-red-600 bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={onPrintSingle}
                disabled={!currentCard}
                className="p-2 rounded-lg text-[#0B2345] bg-slate-100 disabled:opacity-40"
              >
                <Printer size={16} />
              </button>
            </div>
          </div>
          <div className="p-4 flex justify-center min-h-[200px] items-center bg-slate-50/80">
            {currentCard ? (
              <div className="max-w-full overflow-x-auto">
                <StudentCard
                  student={selectedStudent}
                  cardData={currentCard}
                  isRtl={isRtl}
                  template={template}
                />
              </div>
            ) : (
              <div className="text-center py-6 px-4">
                <ShieldCheck size={40} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-500">
                  {isRtl ? 'لم تُصدر هوية بعد' : 'No card issued yet'}
                </p>
              </div>
            )}
          </div>
          <div className="p-3 flex gap-2 border-t border-slate-100">
            <MobileBtnPrimary className="flex-1" onClick={onEditCard}>
              {currentCard ? (
                <>
                  <Edit2 size={16} />
                  {isRtl ? 'تعديل' : 'Edit'}
                </>
              ) : (
                <>
                  <Plus size={16} />
                  {isRtl ? 'إصدار هوية' : 'Issue card'}
                </>
              )}
            </MobileBtnPrimary>
          </div>
        </div>
      ) : (
        <p className="text-center text-sm text-slate-500 font-bold py-8">
          {isRtl ? 'اختر صفاً ثم طالباً' : 'Pick a class, then a student'}
        </p>
      )}
    </MobilePage>
  );
}
