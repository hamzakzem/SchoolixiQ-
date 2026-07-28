import React, { useEffect, useMemo, useState } from 'react';
import { Bot, Plus, RefreshCw, Save, Trash2, Upload } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  type AssistantAnswer,
  type AssistantCatalog,
  type AssistantCategory,
  type AssistantFlow,
  type SmartAssistantScope,
} from '../../lib/smartAssistantEngine';
import {
  closeAssistantTicket,
  deleteAnswer,
  deleteCategory,
  deleteFlow,
  loadAssistantAnalytics,
  loadAssistantTickets,
  loadAssistantSettings,
  saveAssistantSettings,
  DEFAULT_ASSISTANT_SETTINGS,
  seedAssistantCatalogIfEmpty,
  subscribeAssistantCatalog,
  upsertAnswer,
  upsertCategory,
  upsertFlow,
  type AssistantAnalytics,
  type AssistantUiSettings,
} from '../../lib/smartAssistantStore';
import type { AssistantTicket } from '../../lib/smartAssistantEngine';

const SCOPES: SmartAssistantScope[] = [
  'landing',
  'superadmin',
  'platform_assistant',
  'school_admin',
  'teacher',
  'parent',
  'guard',
  'distributor',
];

const SECTION_SCOPES: SmartAssistantScope[] = [
  'landing',
  'school_admin',
  'parent',
  'teacher',
  'distributor',
];

function newId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export default function SmartAssistantAdminTab({ isRtl = true }: { isRtl?: boolean }) {
  const [catalog, setCatalog] = useState<AssistantCatalog | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'content' | 'tickets' | 'analytics' | 'settings'>('dashboard');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedFlowId, setSelectedFlowId] = useState<string>('');
  const [editingAnswer, setEditingAnswer] = useState<AssistantAnswer | null>(null);
  const [tickets, setTickets] = useState<AssistantTicket[]>([]);
  const [analytics, setAnalytics] = useState<AssistantAnalytics | null>(null);
  const [settings, setSettings] = useState<AssistantUiSettings>(DEFAULT_ASSISTANT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [newQuickLabel, setNewQuickLabel] = useState('');

  useEffect(() => subscribeAssistantCatalog(setCatalog), []);

  useEffect(() => {
    void loadAssistantSettings().then(setSettings).catch(() => setSettings(DEFAULT_ASSISTANT_SETTINGS));
  }, []);

  useEffect(() => {
    if (tab === 'tickets' || tab === 'dashboard') {
      void loadAssistantTickets().then(setTickets).catch(() => setTickets([]));
    }
    if (tab === 'analytics' || tab === 'dashboard') {
      void loadAssistantAnalytics().then(setAnalytics).catch(() => setAnalytics(null));
    }
  }, [tab]);

  const flows = useMemo(
    () => (catalog?.flows || []).filter((f) => !selectedCategoryId || f.categoryId === selectedCategoryId),
    [catalog, selectedCategoryId],
  );
  const answers = useMemo(
    () => (catalog?.answers || []).filter((a) => !selectedFlowId || a.flowId === selectedFlowId),
    [catalog, selectedFlowId],
  );

  const seedNow = async () => {
    setBusy(true);
    try {
      const res = await seedAssistantCatalogIfEmpty();
      toast.success(res.seeded ? (isRtl ? 'تم زرع المحتوى الافتراضي' : 'Seeded') : (isRtl ? 'المحتوى موجود مسبقاً' : 'Already seeded'));
    } catch {
      toast.error(isRtl ? 'فشل الزرع — تحقق من صلاحيات السوبر أدمن' : 'Seed failed');
    } finally {
      setBusy(false);
    }
  };

  const addCategory = async () => {
    const row: AssistantCategory = {
      id: newId('cat'),
      titleAr: isRtl ? 'قسم جديد' : 'New category',
      emoji: '📁',
      order: (catalog?.categories.length || 0) + 1,
      scopes: ['landing'],
      active: true,
    };
    await upsertCategory(row);
    toast.success(isRtl ? 'أُضيف القسم' : 'Category added');
  };

  const addFlow = async () => {
    if (!selectedCategoryId) {
      toast.error(isRtl ? 'اختر قسماً أولاً' : 'Select a category');
      return;
    }
    const row: AssistantFlow = {
      id: newId('flow'),
      categoryId: selectedCategoryId,
      titleAr: isRtl ? 'موضوع جديد' : 'New topic',
      order: flows.length + 1,
      scopes: ['landing'],
      active: true,
    };
    await upsertFlow(row);
    setSelectedFlowId(row.id);
    toast.success(isRtl ? 'أُضيف الموضوع' : 'Flow added');
  };

  const addAnswer = async () => {
    if (!selectedFlowId || !selectedCategoryId) {
      toast.error(isRtl ? 'اختر قسماً وموضوعاً' : 'Select category + flow');
      return;
    }
    const row: AssistantAnswer = {
      id: newId('ans'),
      categoryId: selectedCategoryId,
      flowId: selectedFlowId,
      titleAr: isRtl ? 'سؤال جديد' : 'New question',
      bodyAr: isRtl ? 'اكتب الجواب هنا…' : 'Write the answer…',
      keywords: [],
      actions: [],
      priority: 50,
      order: answers.length + 1,
      scopes: ['landing'],
      active: true,
      mediaType: 'none',
    };
    await upsertAnswer(row);
    setEditingAnswer(row);
    toast.success(isRtl ? 'أُضيفت الإجابة' : 'Answer added');
  };

  const saveAnswer = async () => {
    if (!editingAnswer) return;
    setBusy(true);
    try {
      await upsertAnswer({
        ...editingAnswer,
        keywords: (editingAnswer.keywords || [])
          .map((k) => k.trim())
          .filter(Boolean),
      });
      toast.success(isRtl ? 'تم الحفظ' : 'Saved');
    } catch {
      toast.error(isRtl ? 'فشل الحفظ' : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    setBusy(true);
    try {
      await saveAssistantSettings(settings);
      toast.success(isRtl ? 'تم حفظ الإعدادات' : 'Settings saved');
    } catch {
      toast.error(isRtl ? 'فشل حفظ الإعدادات' : 'Settings save failed');
    } finally {
      setBusy(false);
    }
  };

  if (!catalog) {
    return <div className="p-6 text-sm font-bold text-slate-500">{isRtl ? 'جاري التحميل…' : 'Loading…'}</div>;
  }

  const openTickets = tickets.filter((t) => t.status === 'open').length;

  return (
    <div className="space-y-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="sx-section !mb-0">
        <div className="sx-section-bar">
          <div>
            <p className="sx-section-subtitle">Rule-Based Support</p>
            <h2 className="sx-section-title flex items-center gap-2">
              <Bot size={20} className="text-[#D4AF37]" />
              {isRtl ? 'إدارة المساعد الذكي' : 'Smart Assistant Management'}
            </h2>
          </div>
          <div className="sx-section-toolbar flex flex-wrap gap-2">
            <button type="button" className="sx-btn sx-btn-secondary !h-10 !min-h-10 !text-xs" onClick={() => void seedNow()} disabled={busy}>
              <Upload size={14} />
              {isRtl ? 'زرع المحتوى الافتراضي' : 'Seed defaults'}
            </button>
            {(
              [
                ['dashboard', isRtl ? 'لوحة' : 'Dashboard'],
                ['content', isRtl ? 'المحتوى' : 'Content'],
                ['tickets', isRtl ? 'التذاكر' : 'Tickets'],
                ['analytics', isRtl ? 'التقارير' : 'Analytics'],
                ['settings', isRtl ? 'إعدادات' : 'Settings'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`sx-btn !h-10 !min-h-10 !text-xs ${tab === id ? 'sx-btn-primary' : 'sx-btn-ghost'}`}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {tab === 'dashboard' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: isRtl ? 'أحداث البحث' : 'Search events', v: analytics?.keywordHits ?? '—' },
            { l: isRtl ? 'أكثر الأسئلة' : 'Top question', v: analytics?.topQueries?.[0]?.query || '—' },
            { l: isRtl ? 'غير محلولة' : 'Unresolved', v: analytics?.unresolved ?? '—' },
            { l: isRtl ? 'تذاكر مفتوحة' : 'Open tickets', v: openTickets },
          ].map((x) => (
            <div key={x.l} className="sx-kpi-card">
              <p className="sx-kpi-card__label">{x.l}</p>
              <p className="sx-kpi-card__value text-base truncate">{String(x.v)}</p>
            </div>
          ))}
        </div>
      ) : null}

      {tab === 'analytics' && analytics ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { l: isRtl ? 'إصابات كلمات' : 'Keyword hits', v: analytics.keywordHits },
            { l: isRtl ? 'غير محلولة' : 'Unresolved', v: analytics.unresolved },
            { l: isRtl ? 'محلولة' : 'Resolved', v: analytics.resolved },
            { l: isRtl ? 'تذاكر دعم' : 'Tickets', v: analytics.tickets },
          ].map((x) => (
            <div key={x.l} className="sx-kpi-card">
              <p className="sx-kpi-card__label">{x.l}</p>
              <p className="sx-kpi-card__value">{x.v}</p>
            </div>
          ))}
          <div className="sx-section col-span-2 lg:col-span-4">
            <h3 className="font-black mb-3">{isRtl ? 'أكثر الأسئلة بحثاً' : 'Top searches'}</h3>
            <ul className="space-y-2">
              {analytics.topQueries.length ? (
                analytics.topQueries.map((q) => (
                  <li key={q.query} className="flex justify-between text-sm border-b border-slate-100 py-2">
                    <span>{q.query}</span>
                    <span className="font-black text-[#D4AF37]">{q.count}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-slate-400">{isRtl ? 'لا بيانات بعد' : 'No data yet'}</li>
              )}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === 'tickets' ? (
        <div className="sx-section space-y-2">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-black">{isRtl ? 'تذاكر الدعم' : 'Support tickets'}</h3>
            <button type="button" className="sx-btn sx-btn-ghost !h-9 !min-h-9 !text-xs" onClick={() => void loadAssistantTickets().then(setTickets)}>
              <RefreshCw size={14} />
            </button>
          </div>
          {tickets.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 p-3 flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{t.question}</p>
                <p className="text-[11px] text-slate-500">
                  {t.role} · {t.scope} · {t.status}
                </p>
              </div>
              {t.status === 'open' && t.id ? (
                <button type="button" className="sx-btn sx-btn-secondary !h-9 !min-h-9 !text-xs" onClick={() => void closeAssistantTicket(t.id!).then(() => loadAssistantTickets().then(setTickets))}>
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
              ) : null}
            </div>
          ))}
          {!tickets.length ? <p className="text-sm text-slate-400">{isRtl ? 'لا تذاكر' : 'No tickets'}</p> : null}
        </div>
      ) : null}

      {tab === 'content' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="sx-section space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm">{isRtl ? 'الأقسام' : 'Categories'}</h3>
              <button type="button" className="sx-btn sx-btn-primary !h-9 !min-h-9 !px-3 !text-xs" onClick={() => void addCategory()}>
                <Plus size={14} />
              </button>
            </div>
            {catalog.categories
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryId(c.id);
                    setSelectedFlowId('');
                    setEditingAnswer(null);
                  }}
                  className={`w-full text-start rounded-xl border px-3 py-2 ${selectedCategoryId === c.id ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-slate-200'}`}
                >
                  <span className="me-1">{c.emoji}</span>
                  <span className="font-bold text-sm">{c.titleAr}</span>
                </button>
              ))}
          </div>

          <div className="sx-section space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm">{isRtl ? 'المواضيع' : 'Flows'}</h3>
              <button type="button" className="sx-btn sx-btn-primary !h-9 !min-h-9 !px-3 !text-xs" onClick={() => void addFlow()}>
                <Plus size={14} />
              </button>
            </div>
            {flows.map((f) => (
              <div key={f.id} className="flex gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFlowId(f.id);
                    setEditingAnswer(null);
                  }}
                  className={`flex-1 text-start rounded-xl border px-3 py-2 text-sm font-bold ${selectedFlowId === f.id ? 'border-[#D4AF37] bg-[#D4AF37]/10' : 'border-slate-200'}`}
                >
                  {f.titleAr}
                </button>
                <button type="button" className="p-2 text-rose-500" onClick={() => void deleteFlow(f.id)} aria-label="delete flow">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="pt-2 border-t space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-sm">{isRtl ? 'الإجابات' : 'Answers'}</h3>
                <button type="button" className="sx-btn sx-btn-primary !h-9 !min-h-9 !px-3 !text-xs" onClick={() => void addAnswer()}>
                  <Plus size={14} />
                </button>
              </div>
              {answers.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setEditingAnswer(a)}
                  className={`w-full text-start rounded-xl border px-3 py-2 text-sm ${editingAnswer?.id === a.id ? 'border-[#D4AF37]' : 'border-slate-200'}`}
                >
                  {a.titleAr}
                </button>
              ))}
            </div>
          </div>

          <div className="sx-section space-y-3">
            <h3 className="font-black text-sm">{isRtl ? 'تحرير الإجابة' : 'Edit answer'}</h3>
            {editingAnswer ? (
              <>
                <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'العنوان' : 'Title'}</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={editingAnswer.titleAr}
                  onChange={(e) => setEditingAnswer({ ...editingAnswer, titleAr: e.target.value })}
                />
                <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'الجواب' : 'Body'}</label>
                <textarea
                  className="w-full rounded-xl border px-3 py-2 text-sm min-h-[120px]"
                  value={editingAnswer.bodyAr}
                  onChange={(e) => setEditingAnswer({ ...editingAnswer, bodyAr: e.target.value })}
                />
                <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'كلمات مفتاحية (سطر لكل كلمة)' : 'Keywords (one per line)'}</label>
                <textarea
                  className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]"
                  value={(editingAnswer.keywords || []).join('\n')}
                  onChange={(e) =>
                    setEditingAnswer({
                      ...editingAnswer,
                      keywords: e.target.value.split('\n'),
                    })
                  }
                />
                <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'رابط صورة/GIF' : 'Media URL'}</label>
                <input
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={editingAnswer.mediaUrl || ''}
                  onChange={(e) =>
                    setEditingAnswer({
                      ...editingAnswer,
                      mediaUrl: e.target.value,
                      mediaType: e.target.value ? 'image' : 'none',
                    })
                  }
                />
                <label className="block text-[11px] font-bold text-slate-500">Scopes</label>
                <div className="flex flex-wrap gap-1">
                  {SCOPES.map((s) => {
                    const on = editingAnswer.scopes.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${on ? 'bg-[#D4AF37]/20 border-[#D4AF37]' : 'border-slate-200'}`}
                        onClick={() =>
                          setEditingAnswer({
                            ...editingAnswer,
                            scopes: on
                              ? editingAnswer.scopes.filter((x) => x !== s)
                              : [...editingAnswer.scopes, s],
                          })
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'الأولوية' : 'Priority'}</label>
                <input
                  type="number"
                  className="w-full rounded-xl border px-3 py-2 text-sm"
                  value={editingAnswer.priority}
                  onChange={(e) => setEditingAnswer({ ...editingAnswer, priority: Number(e.target.value) || 0 })}
                />
                <div className="flex gap-2">
                  <button type="button" className="sx-btn sx-btn-primary flex-1" disabled={busy} onClick={() => void saveAnswer()}>
                    <Save size={14} />
                    {isRtl ? 'حفظ' : 'Save'}
                  </button>
                  <button
                    type="button"
                    className="sx-btn sx-btn-danger"
                    onClick={() =>
                      void deleteAnswer(editingAnswer.id).then(() => {
                        setEditingAnswer(null);
                        toast.success(isRtl ? 'حُذفت' : 'Deleted');
                      })
                    }
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {selectedCategoryId ? (
                  <button
                    type="button"
                    className="text-[11px] text-rose-500 font-bold"
                    onClick={() =>
                      void deleteCategory(selectedCategoryId).then(() => {
                        setSelectedCategoryId('');
                        toast.success(isRtl ? 'حُذف القسم' : 'Category deleted');
                      })
                    }
                  >
                    {isRtl ? 'حذف القسم المحدد' : 'Delete selected category'}
                  </button>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-slate-400">{isRtl ? 'اختر إجابة للتحرير أو أضف واحدةً جديدة.' : 'Select or add an answer.'}</p>
            )}
          </div>
        </div>
      ) : null}

      {tab === 'settings' ? (
        <div className="sx-section space-y-4 max-w-2xl">
          <h3 className="font-black">{isRtl ? 'إعدادات المساعد' : 'Assistant settings'}</h3>
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'اسم المساعد (عربي)' : 'Name (AR)'}</label>
          <input className="w-full rounded-xl border px-3 py-2 text-sm" value={settings.nameAr} onChange={(e) => setSettings({ ...settings, nameAr: e.target.value })} />
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'اسم المساعد (إنجليزي)' : 'Name (EN)'}</label>
          <input className="w-full rounded-xl border px-3 py-2 text-sm" value={settings.nameEn} onChange={(e) => setSettings({ ...settings, nameEn: e.target.value })} />
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'رابط الشعار' : 'Logo URL'}</label>
          <input className="w-full rounded-xl border px-3 py-2 text-sm" value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} placeholder="https://…" />
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'رسالة البداية (عربي)' : 'Intro (AR)'}</label>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]" value={settings.introAr} onChange={(e) => setSettings({ ...settings, introAr: e.target.value })} />
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'رسالة البداية (إنجليزي)' : 'Intro (EN)'}</label>
          <textarea className="w-full rounded-xl border px-3 py-2 text-sm min-h-[80px]" value={settings.introEn} onChange={(e) => setSettings({ ...settings, introEn: e.target.value })} />
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'الأقسام الظاهرة' : 'Visible sections'}</label>
          <div className="flex flex-wrap gap-1">
            {SECTION_SCOPES.map((s) => {
              const on = settings.visibleSections.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  className={`text-[10px] font-bold px-2 py-1 rounded-full border ${on ? 'bg-[#D4AF37]/20 border-[#D4AF37]' : 'border-slate-200'}`}
                  onClick={() =>
                    setSettings({
                      ...settings,
                      visibleSections: on
                        ? settings.visibleSections.filter((x) => x !== s)
                        : [...settings.visibleSections, s],
                    })
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'صلاحيات العرض' : 'Visibility'}</label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['public', isRtl ? 'عام' : 'Public'],
                ['school_users', isRtl ? 'مستخدمو المدارس' : 'School users'],
                ['platform_only', isRtl ? 'المنصة فقط' : 'Platform only'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`sx-btn !h-10 !min-h-10 !text-xs ${settings.visibility === id ? 'sx-btn-primary' : 'sx-btn-secondary'}`}
                onClick={() => setSettings({ ...settings, visibility: id })}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="block text-[11px] font-bold text-slate-500">{isRtl ? 'أزرار سريعة' : 'Quick buttons'}</label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl border px-3 py-2 text-sm"
              value={newQuickLabel}
              onChange={(e) => setNewQuickLabel(e.target.value)}
              placeholder={isRtl ? 'نص الزر' : 'Button label'}
            />
            <button
              type="button"
              className="sx-btn sx-btn-secondary !h-10 !min-h-10 !text-xs"
              onClick={() => {
                if (!newQuickLabel.trim()) return;
                setSettings({
                  ...settings,
                  quickButtons: [
                    ...settings.quickButtons,
                    { id: newId('qb'), labelAr: newQuickLabel.trim(), answerId: editingAnswer?.id },
                  ],
                });
                setNewQuickLabel('');
              }}
            >
              <Plus size={14} />
            </button>
          </div>
          <ul className="space-y-1">
            {settings.quickButtons.map((qb) => (
              <li key={qb.id} className="flex justify-between text-sm border rounded-xl px-3 py-2">
                <span>{qb.labelAr}</span>
                <button
                  type="button"
                  className="text-rose-500"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      quickButtons: settings.quickButtons.filter((x) => x.id !== qb.id),
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="sx-btn sx-btn-primary" disabled={busy} onClick={() => void saveSettings()}>
            <Save size={14} />
            {isRtl ? 'حفظ الإعدادات' : 'Save settings'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
