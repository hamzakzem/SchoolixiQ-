import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  ChevronUp,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  School,
  User,
  Wallet,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../lib/AuthContext";
import { useLanguage } from "../lib/LanguageContext";
import { signOutWithCleanup } from "../lib/authLogout";
import { fetchDistributorDashboard } from "../lib/distributorApi";
import { DashboardSmartAssistantHost } from "../components/smart-assistant/DashboardSmartAssistant";
import type {
  DistributorDashboardStats,
  DistributorMonthlyCommission,
  DistributorRecord,
  DistributorSchoolSummary,
} from "../types/distributor";
import {
  distributorConversationId,
  ensureDistributorSupportConversation,
  markDistributorMessagesRead,
  sendDistributorSupportMessage,
  subscribeDistributorSupportMessages,
  type DistributorSupportMessage,
} from "../lib/distributorSupportChat";
import SchoolixLogo from "../components/SchoolixLogo";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageToggle } from "../components/LanguageToggle";

type TabId = "home" | "schools" | "earnings" | "chat" | "profile" | "more";

const STATUS_LABELS: Record<string, string> = {
  pending: "معلّقة",
  earned: "مستحقة",
  paid: "مدفوعة",
  canceled: "ملغاة",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "sx-dist-badge--pending",
  earned: "sx-dist-badge--earned",
  paid: "sx-dist-badge--paid",
  canceled: "sx-dist-badge--canceled",
};

function formatIqd(amount: number) {
  return `${Number(amount || 0).toLocaleString("ar-IQ")} د.ع`;
}

function formatDate(value: unknown) {
  if (!value) return "—";
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toLocaleDateString("ar-IQ");
    } catch {
      return "—";
    }
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("ar-IQ");
  }
  return "—";
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="sx-dist-stat">
      <p className="sx-dist-stat__label">{label}</p>
      <p className="sx-dist-stat__value">{value}</p>
      {hint ? <p className="sx-dist-stat__hint">{hint}</p> : null}
    </div>
  );
}

export default function DistributorDashboard() {
  const { profile } = useAuth();
  const { isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [loading, setLoading] = useState(true);
  const [distributor, setDistributor] = useState<DistributorRecord | null>(null);
  const [stats, setStats] = useState<DistributorDashboardStats | null>(null);
  const [schools, setSchools] = useState<DistributorSchoolSummary[]>([]);
  const [commissions, setCommissions] = useState<DistributorMonthlyCommission[]>([]);
  const [expandedSchoolId, setExpandedSchoolId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [chatMessages, setChatMessages] = useState<DistributorSupportMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const distributorId = profile?.distributorId || "";

  const loadDashboard = useCallback(async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      const data = await fetchDistributorDashboard();
      setDistributor((data.distributor as DistributorRecord) || null);
      setStats((data.stats as DistributorDashboardStats) || null);
      setSchools((data.schools as DistributorSchoolSummary[]) || []);
      setCommissions((data.commissions as DistributorMonthlyCommission[]) || []);
      if (data.monthKey) setMonthFilter((prev) => prev || String(data.monthKey));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, [profile?.uid]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!distributorId || !profile?.uid) return;
    const conversationId = distributorConversationId(distributorId);
    void ensureDistributorSupportConversation({
      distributorId,
      distributorUserId: profile.uid,
      distributorName: profile.name || distributor?.name || "موزع",
    });
    const unsub = subscribeDistributorSupportMessages(
      conversationId,
      (rows) => {
        setChatMessages(rows);
        void markDistributorMessagesRead({
          conversationId,
          readerId: profile.uid,
          readerRole: "distributor",
        });
      },
      (err) => console.error("[distributor-chat]", err),
    );
    return () => unsub();
  }, [distributorId, profile?.uid, profile?.name, distributor?.name]);

  const monthOptions = useMemo(() => {
    const keys = new Set(commissions.map((c) => c.monthKey).filter(Boolean));
    return Array.from(keys).sort((a, b) => b.localeCompare(a));
  }, [commissions]);

  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (monthFilter && c.monthKey !== monthFilter) return false;
      if (statusFilter && c.status !== statusFilter) return false;
      if (schoolFilter && c.schoolId !== schoolFilter) return false;
      return true;
    });
  }, [commissions, monthFilter, statusFilter, schoolFilter]);

  const handleSendChat = async () => {
    if (!profile?.uid || !distributorId || !chatInput.trim()) return;
    setSendingChat(true);
    try {
      const conversationId = distributorConversationId(distributorId);
      await sendDistributorSupportMessage({
        conversationId,
        distributorId,
        senderId: profile.uid,
        senderRole: "distributor",
        senderName: profile.name,
        text: chatInput,
      });
      setChatInput("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "فشل إرسال الرسالة");
    } finally {
      setSendingChat(false);
    }
  };

  const handleLogout = () => {
    void signOutWithCleanup();
  };

  const navItems: { id: TabId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
    { id: "home", label: isRtl ? "الرئيسية" : "Home", icon: Home },
    { id: "schools", label: isRtl ? "المدارس" : "Schools", icon: School },
    { id: "earnings", label: isRtl ? "الأرباح" : "Earnings", icon: Wallet },
    { id: "chat", label: isRtl ? "المحادثة" : "Chat", icon: MessageSquare },
    { id: "more", label: isRtl ? "المزيد" : "More", icon: MoreHorizontal },
  ];

  const renderOverview = () => (
    <section className="sx-dist-section">
      <div className="sx-dist-section__head">
        <h2>{isRtl ? "نظرة عامة" : "Overview"}</h2>
        <p>{isRtl ? "ملخص أداء الموزع لهذا الشهر" : "Your distributor performance summary"}</p>
      </div>
      <div className="sx-dist-stat-grid">
        <StatCard label={isRtl ? "المدارس التابعة" : "Linked schools"} value={String(stats?.totalSchools ?? 0)} />
        <StatCard label={isRtl ? "المدارس النشطة" : "Active schools"} value={String(stats?.activeSchools ?? 0)} />
        <StatCard
          label={isRtl ? "عمولة هذا الشهر" : "This month"}
          value={formatIqd(stats?.thisMonthCommission ?? 0)}
        />
        <StatCard label={isRtl ? "إجمالي المستحق" : "Total due"} value={formatIqd(stats?.totalDue ?? 0)} />
        <StatCard label={isRtl ? "إجمالي المدفوع" : "Total paid"} value={formatIqd(stats?.totalPaid ?? 0)} />
        <StatCard
          label={isRtl ? "عمولات معلقة" : "Pending rows"}
          value={String(stats?.pendingCommissions ?? 0)}
        />
      </div>
    </section>
  );

  const renderSchools = () => (
    <section className="sx-dist-section">
      <div className="sx-dist-section__head">
        <h2>{isRtl ? "مدارسي" : "My schools"}</h2>
        <p>{isRtl ? "المدارس المرتبطة بحسابك فقط" : "Schools linked to your account only"}</p>
      </div>
      <div className="sx-dist-school-list">
        {schools.length === 0 ? (
          <p className="sx-dist-empty">{isRtl ? "لا توجد مدارس مرتبطة بعد" : "No linked schools yet"}</p>
        ) : (
          schools.map((school) => {
            const expanded = expandedSchoolId === school.id;
            return (
              <article key={school.id} className="sx-dist-school-card">
                <button
                  type="button"
                  className="sx-dist-school-card__head"
                  onClick={() => setExpandedSchoolId(expanded ? null : school.id)}
                >
                  <div className="sx-dist-school-card__icon" aria-hidden>
                    <Building2 size={18} />
                  </div>
                  <div className="sx-dist-school-card__main">
                    <h3>{school.name}</h3>
                    <p>
                      {school.governorate || "—"} · {school.planName || school.planId || "—"}
                    </p>
                  </div>
                  <span className={`sx-dist-badge ${school.isActive ? "sx-dist-badge--paid" : "sx-dist-badge--pending"}`}>
                    {school.subscriptionStatus || school.status || "—"}
                  </span>
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {expanded ? (
                  <div className="sx-dist-school-card__body">
                    <div className="sx-dist-kv"><span>تاريخ الربط</span><strong>{formatDate(school.distributorLinkedAt)}</strong></div>
                    <div className="sx-dist-kv"><span>آخر دفع</span><strong>{formatDate(school.lastPaymentAt)}</strong></div>
                    <div className="sx-dist-kv"><span>عمولة الشهر</span><strong>{formatIqd(school.currentMonthCommission || 0)}</strong></div>
                    <div className="sx-dist-kv"><span>إجمالي العمولات</span><strong>{formatIqd(school.totalCommissionFromSchool || 0)}</strong></div>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
      <div className="sx-dist-table-wrap hidden lg:block">
        <table className="sx-dist-table">
          <thead>
            <tr>
              <th>المدرسة</th>
              <th>المحافظة</th>
              <th>الباقة</th>
              <th>الحالة</th>
              <th>تاريخ الربط</th>
              <th>عمولة الشهر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={`table-${school.id}`}>
                <td>{school.name}</td>
                <td>{school.governorate || "—"}</td>
                <td>{school.planName || school.planId}</td>
                <td>{school.subscriptionStatus || school.status}</td>
                <td>{formatDate(school.distributorLinkedAt)}</td>
                <td>{formatIqd(school.currentMonthCommission || 0)}</td>
                <td>{formatIqd(school.totalCommissionFromSchool || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderEarnings = () => (
    <section className="sx-dist-section">
      <div className="sx-dist-section__head">
        <h2>{isRtl ? "الأرباح والعمولات" : "Earnings"}</h2>
        <p>{isRtl ? "استحقاقاتك الشهرية — للعرض فقط" : "Monthly commissions — read only"}</p>
      </div>
      <div className="sx-dist-filters">
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} aria-label="الشهر">
          <option value="">{isRtl ? "كل الأشهر" : "All months"}</option>
          {monthOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="الحالة">
          <option value="">{isRtl ? "كل الحالات" : "All statuses"}</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={schoolFilter} onChange={(e) => setSchoolFilter(e.target.value)} aria-label="المدرسة">
          <option value="">{isRtl ? "كل المدارس" : "All schools"}</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="sx-dist-commission-list lg:hidden">
        {filteredCommissions.map((c) => (
          <article key={c.id} className="sx-dist-commission-card">
            <div className="sx-dist-commission-card__top">
              <strong>{c.schoolName}</strong>
              <span className={`sx-dist-badge ${STATUS_CLASS[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</span>
            </div>
            <p className="sx-dist-commission-card__meta">{c.monthKey} · {c.planName}</p>
            <div className="sx-dist-kv"><span>المبلغ الصافي</span><strong>{formatIqd(c.netAmount)}</strong></div>
            <div className="sx-dist-kv"><span>نسبة العمولة</span><strong>{c.commissionPercent}%</strong></div>
            <div className="sx-dist-kv"><span>مبلغ العمولة</span><strong>{formatIqd(c.commissionAmount)}</strong></div>
            {c.paidAt ? <div className="sx-dist-kv"><span>تاريخ الدفع</span><strong>{formatDate(c.paidAt)}</strong></div> : null}
          </article>
        ))}
      </div>
      <div className="sx-dist-table-wrap hidden lg:block">
        <table className="sx-dist-table">
          <thead>
            <tr>
              <th>الشهر</th>
              <th>المدرسة</th>
              <th>الصافي</th>
              <th>النسبة</th>
              <th>العمولة</th>
              <th>الحالة</th>
              <th>تاريخ الدفع</th>
            </tr>
          </thead>
          <tbody>
            {filteredCommissions.map((c) => (
              <tr key={`earn-${c.id}`}>
                <td>{c.monthKey}</td>
                <td>{c.schoolName}</td>
                <td>{formatIqd(c.netAmount)}</td>
                <td>{c.commissionPercent}%</td>
                <td>{formatIqd(c.commissionAmount)}</td>
                <td><span className={`sx-dist-badge ${STATUS_CLASS[c.status] || ""}`}>{STATUS_LABELS[c.status] || c.status}</span></td>
                <td>{formatDate(c.paidAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );

  const renderChat = () => (
    <section className="sx-dist-section sx-dist-chat">
      <div className="sx-dist-section__head">
        <h2>{isRtl ? "محادثة الإدارة" : "Platform chat"}</h2>
        <p>{isRtl ? "تواصل مباشر مع إدارة SchoolixIQ" : "Direct line to SchoolixIQ platform team"}</p>
      </div>
      <div className="sx-dist-chat__panel">
        <div className="sx-dist-chat__messages">
          {chatMessages.length === 0 ? (
            <p className="sx-dist-empty">{isRtl ? "ابدأ المحادثة مع الإدارة" : "Start a conversation with support"}</p>
          ) : (
            chatMessages.map((m) => {
              const mine = m.senderRole === "distributor";
              return (
                <div key={m.id} className={`sx-dist-chat__bubble ${mine ? "is-mine" : "is-theirs"}`}>
                  <p className="sx-dist-chat__sender">{mine ? (isRtl ? "أنت" : "You") : (isRtl ? "الإدارة" : "Platform")}</p>
                  <p>{m.text}</p>
                </div>
              );
            })
          )}
        </div>
        <div className="sx-dist-chat__composer">
          <textarea
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder={isRtl ? "اكتب رسالتك للإدارة..." : "Write your message..."}
            rows={2}
          />
          <button type="button" onClick={() => void handleSendChat()} disabled={sendingChat || !chatInput.trim()}>
            {sendingChat ? <Loader2 className="animate-spin" size={16} /> : (isRtl ? "إرسال" : "Send")}
          </button>
        </div>
      </div>
    </section>
  );

  const renderProfile = () => (
    <section className="sx-dist-section">
      <div className="sx-dist-section__head">
        <h2>{isRtl ? "الملف الشخصي" : "Profile"}</h2>
        <p>{isRtl ? "بيانات الموزع — للعرض فقط" : "Distributor profile — read only"}</p>
      </div>
      <div className="sx-dist-profile-grid">
        <div className="sx-dist-kv"><span>الاسم</span><strong>{distributor?.name || profile?.name}</strong></div>
        <div className="sx-dist-kv"><span>الهاتف</span><strong>{distributor?.phone || profile?.phone || "—"}</strong></div>
        <div className="sx-dist-kv"><span>البريد</span><strong>{distributor?.email || profile?.email || "—"}</strong></div>
        <div className="sx-dist-kv"><span>المحافظة</span><strong>{distributor?.governorate || "—"}</strong></div>
        <div className="sx-dist-kv"><span>المنطقة</span><strong>{distributor?.region || "—"}</strong></div>
        <div className="sx-dist-kv"><span>نوع الموزع</span><strong>{distributor?.distributorType || "—"}</strong></div>
        <div className="sx-dist-kv"><span>يتبع إلى</span><strong>{distributor?.parentDistributorName || "—"}</strong></div>
        <div className="sx-dist-kv"><span>الحالة</span><strong>{distributor?.status || (distributor?.active === false ? "غير نشط" : "نشط")}</strong></div>
      </div>
    </section>
  );

  const renderMore = () => (
    <section className="sx-dist-section">
      <div className="sx-dist-section__head">
        <h2>{isRtl ? "المزيد" : "More"}</h2>
      </div>
      <div className="sx-dist-more-actions">
        <button type="button" className="sx-dist-more-row" onClick={() => setActiveTab("profile")}>
          <User size={18} />
          <span>{isRtl ? "الملف الشخصي" : "Profile"}</span>
        </button>
        <div className="sx-dist-more-row sx-dist-more-row--static">
          <LayoutGrid size={18} />
          <span>{isRtl ? "اللغة والمظهر" : "Language & theme"}</span>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
        <button type="button" className="sx-dist-logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>
            <strong>{isRtl ? "تسجيل الخروج" : "Logout"}</strong>
            <small>{isRtl ? "إنهاء الجلسة الحالية بأمان" : "End your session safely"}</small>
          </span>
        </button>
      </div>
    </section>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className="sx-dist-loading">
          <Loader2 className="animate-spin" size={28} />
          <p>{isRtl ? "جاري تحميل لوحة الموزع..." : "Loading distributor dashboard..."}</p>
        </div>
      );
    }
    switch (activeTab) {
      case "schools":
        return renderSchools();
      case "earnings":
        return renderEarnings();
      case "chat":
        return renderChat();
      case "profile":
        return renderProfile();
      case "more":
        return renderMore();
      default:
        return renderOverview();
    }
  };

  return (
    <div className="sx-dist-shell sx-ds-shell sx-app-shell" dir={isRtl ? "rtl" : "ltr"}>
      <aside className="sx-dist-sidebar sx-ds-sidebar hidden lg:flex">
        <div className="sx-dist-sidebar__brand sx-ds-sidebar__brand">
          <SchoolixLogo size={28} surface="light" />
          <div>
            <p className="sx-dist-sidebar__eyebrow">SchoolixIQ</p>
            <h1>{isRtl ? "بوابة الموزع" : "Distributor Portal"}</h1>
          </div>
        </div>
        <nav className="sx-dist-sidebar__nav">
          {[
            { id: "home" as TabId, label: isRtl ? "الرئيسية" : "Home", icon: Home },
            { id: "schools" as TabId, label: isRtl ? "المدارس" : "Schools", icon: School },
            { id: "earnings" as TabId, label: isRtl ? "الأرباح" : "Earnings", icon: Wallet },
            { id: "chat" as TabId, label: isRtl ? "المحادثة" : "Chat", icon: MessageSquare },
            { id: "profile" as TabId, label: isRtl ? "الملف الشخصي" : "Profile", icon: User },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={`sx-dist-nav-item ${activeTab === item.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <button type="button" className="sx-dist-sidebar__logout" onClick={handleLogout}>
          <LogOut size={18} />
          <span>{isRtl ? "تسجيل الخروج" : "Logout"}</span>
        </button>
      </aside>

      <div className="sx-dist-main">
        <header className="sx-dist-header sx-ds-topbar sx-ds-topbar--flex">
          <div>
            <p className="sx-dist-header__eyebrow">{isRtl ? "مرحباً" : "Welcome"}</p>
            <h2>{distributor?.name || profile?.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-2">
              <LanguageToggle />
              <ThemeToggle />
            </div>
            <DashboardSmartAssistantHost hidden={activeTab === "chat"} isRtl={isRtl} />
          </div>
        </header>
        <main className="sx-dist-content">{renderContent()}</main>
      </div>

      <nav className="sx-dist-bottom-nav lg:hidden" aria-label={isRtl ? "تنقل الموزع" : "Distributor navigation"}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`sx-dist-bottom-nav__item ${activeTab === item.id ? "is-active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
