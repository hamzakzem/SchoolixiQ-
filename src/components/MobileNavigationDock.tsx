import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { getDrawerPortalNode } from "../lib/drawerPortal";
import {
  drawerPanelProps,
  drawerNavItemMotion,
  modalBackdropProps,
  prefersReducedMotion,
  servicesSideDrawerProps,
} from "../lib/motion";
import { OfflineQueueTrigger, useOfflineOperationsOptional } from "./OfflineSyncIndicator";
import { useAuth } from "../lib/AuthContext";
import { useOfflineStatus } from "../lib/offline/useOfflineStatus";
import { useNotificationBadges } from "../lib/NotificationBadgeContext";
import { LanguageToggle } from "./LanguageToggle";
import { ThemeToggle } from "./ThemeToggle";
import SchoolixLogo from "./SchoolixLogo";
import {
  groupItemsForQuickAccess,
  resolvePermissionsGatewayTab,
  canShowPermissionsGateway,
  getQuickAccessItemDescription,
  getQuickAccessItemBadge,
  getPermissionsGatewayBadge,
  type QuickAccessMenuItem,
} from "../lib/quickAccessSections";
import {
  PremiumSectionHeader,
  SectionHeaderButton,
} from "./PremiumSectionHeader";
import {
  LayoutDashboard,
  MessageSquare,
  LayoutGrid,
  Bell,
  MoreHorizontal,
  X,
  Search,
  LogOut,
  ShieldCheck,
  Settings,
  SlidersHorizontal,
  ClipboardCheck,
  CloudUpload,
  ChevronLeft,
  User,
  Globe,
  Moon,
  KeyRound,
} from "lucide-react";

interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
}

interface MobileNavigationDockProps {
  menuItems: MenuItem[];
  activeTab: string;
  setActiveTab: (tabId: string) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  showNotifications?: boolean;
  setShowNotifications?: (show: boolean) => void;
  notificationsCount?: number;
  messagesCount?: number;
  userRole?: string;
  isRtl?: boolean;
  onLogout?: () => void;
  logoutLabel?: string;
  menuSurface?: "dark" | "light";
  hidden?: boolean;
}

type DockSheet = "none" | "quick" | "more";

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.debug("[MobileNavigationDock]", ...args);
};

function DockBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="sx-dock-v2__badge" aria-hidden>
      {count > 99 ? "99+" : count}
    </span>
  );
}

export const MobileNavigationDock: React.FC<MobileNavigationDockProps> = ({
  menuItems,
  activeTab,
  setActiveTab,
  isSidebarOpen,
  setIsSidebarOpen,
  showNotifications = false,
  setShowNotifications,
  notificationsCount = 0,
  messagesCount: messagesCountProp,
  userRole,
  isRtl = true,
  onLogout,
  logoutLabel,
  menuSurface = "dark",
  hidden = false,
}) => {
  const { user, profile } = useAuth();
  const { tabBadges, categoryUnread } = useNotificationBadges();
  const offlineOps = useOfflineOperationsOptional();
  const { counts: offlineCounts, isSyncing } = useOfflineStatus();

  const [activeSheet, setActiveSheet] = useState<DockSheet>("none");
  const [searchTerm, setSearchTerm] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);

  const role = userRole || profile?.role;
  const isAuthenticated = Boolean(user || profile);
  const showLogoutAction = isAuthenticated && Boolean(onLogout);
  const overviewItem =
    menuItems.find((i) => i.id === "overview" || i.id === "home") || menuItems[0];
  const chatItem =
    menuItems.find((i) => i.id === "chat") || menuItems.find((i) => i.id === "messages");

  const messagesCount =
    messagesCountProp ??
    tabBadges.chat ??
    tabBadges.messages ??
    categoryUnread.messages ??
    0;

  const quickAccessItems: QuickAccessMenuItem[] = menuItems.filter(
    (item) => item.id !== overviewItem?.id && item.id !== "home",
  );

  const groupedQuickAccess = groupItemsForQuickAccess(quickAccessItems, searchTerm);
  const permissionsGatewayTab = resolvePermissionsGatewayTab(quickAccessItems, role);
  const showPermissionsGateway = canShowPermissionsGateway(role, permissionsGatewayTab);

  const hasOfflineWork =
    offlineCounts.pending + offlineCounts.failed + offlineCounts.blocked > 0 || isSyncing;

  const [isCompactViewport, setIsCompactViewport] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 1023px)");
    const sync = () => setIsCompactViewport(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const sheetOpen = activeSheet !== "none";
  const servicesDrawerOpen = !hidden && !isCompactViewport && isSidebarOpen;
  const portalLayerOpen = servicesDrawerOpen || (!hidden && isCompactViewport && sheetOpen);

  const closeSheets = () => {
    devLog("closeSheets");
    setActiveSheet("none");
    setSearchTerm("");
    lastTriggerRef.current?.focus();
  };

  const handleTabClick = (tabId: string) => {
    devLog("navigate", tabId);
    setActiveTab(tabId);
    closeSheets();
    setIsSidebarOpen(false);
    setShowNotifications?.(false);
  };

  const openSheet = (sheet: DockSheet, trigger?: HTMLElement | null) => {
    devLog("openSheet", sheet);
    if (trigger) lastTriggerRef.current = trigger;
    setActiveSheet(sheet);
    setIsSidebarOpen(false);
    if (sheet !== "none") setShowNotifications?.(false);
  };

  const toggleNotifications = (trigger?: HTMLElement | null) => {
    if (trigger) lastTriggerRef.current = trigger;
    setShowNotifications?.(!showNotifications);
    setActiveSheet("none");
    setIsSidebarOpen(false);
  };

  useEffect(() => {
    if (!hidden) return;
    document.documentElement.classList.remove("sx-drawer-open");
    document.body.classList.remove("sx-drawer-open");
    document.getElementById("sx-app-drawer-portal")?.classList.remove("sx-app-drawer-portal--active");
  }, [hidden]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const portal = document.getElementById("sx-app-drawer-portal");
    let clearTimer: number | undefined;

    if (portalLayerOpen) {
      document.documentElement.classList.add("sx-drawer-open");
      document.body.classList.add("sx-drawer-open");
      portal?.classList.add("sx-app-drawer-portal--active");
    } else {
      document.documentElement.classList.remove("sx-drawer-open");
      document.body.classList.remove("sx-drawer-open");
      clearTimer = window.setTimeout(() => {
        portal?.classList.remove("sx-app-drawer-portal--active");
      }, 320);
    }
    return () => {
      if (clearTimer) window.clearTimeout(clearTimer);
      document.documentElement.classList.remove("sx-drawer-open");
      document.body.classList.remove("sx-drawer-open");
      portal?.classList.remove("sx-app-drawer-portal--active");
    };
  }, [portalLayerOpen]);

  useEffect(() => {
    if (activeSheet === "quick") {
      const t = window.setTimeout(() => searchRef.current?.focus(), 120);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [activeSheet]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (activeSheet !== "none") {
        closeSheets();
        return;
      }
      if (showNotifications) {
        setShowNotifications?.(false);
        return;
      }
      if (isSidebarOpen) setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeSheet, isSidebarOpen, showNotifications, setIsSidebarOpen, setShowNotifications]);

  if (hidden) return null;

  const closeServicesMenu = () => setIsSidebarOpen(false);

  const renderDrawerPortal = (node: React.ReactNode) => {
    if (typeof document === "undefined") return null;
    try {
      return createPortal(node, getDrawerPortalNode());
    } catch {
      return null;
    }
  };

  const dockBtnClass = (active: boolean, variant?: "quick") =>
    `sx-dock-v2__btn${active ? (variant === "quick" ? " sx-dock-v2__btn--active-quick" : " sx-dock-v2__btn--active") : ""}`;

  const permissionsBadge = getPermissionsGatewayBadge(role, isRtl);
  const showQuickAccessHint = showPermissionsGateway;

  const offlinePendingCount =
    offlineCounts.pending + offlineCounts.failed + offlineCounts.blocked;

  return (
    <>
      <div className="sx-offline-status-host sx-offline-status-host--dock-v2 print:hidden">
        <OfflineQueueTrigger variant="dock-pill" />
      </div>

      <nav
        className="sx-dock-v2 lg:hidden print:hidden"
        aria-label={isRtl ? "التنقل السفلي" : "Bottom navigation"}
      >
        <div className="sx-dock-v2__inner">
          <button
            type="button"
            className={dockBtnClass(activeTab === overviewItem?.id)}
            onClick={() => handleTabClick(overviewItem.id)}
            aria-label={isRtl ? "الرئيسية" : "Home"}
            aria-current={activeTab === overviewItem?.id ? "page" : undefined}
          >
            <LayoutDashboard size={22} strokeWidth={2.1} aria-hidden />
            <span>{isRtl ? "الرئيسية" : "Home"}</span>
          </button>

          {chatItem && (
            <button
              type="button"
              className={dockBtnClass(activeTab === chatItem.id)}
              onClick={() => handleTabClick(chatItem.id)}
              aria-label={isRtl ? "الرسائل" : "Messages"}
            >
              <span className="sx-dock-v2__icon-wrap">
                <MessageSquare size={22} strokeWidth={2.1} aria-hidden />
                <DockBadge count={messagesCount} />
              </span>
              <span>{isRtl ? "الرسائل" : "Messages"}</span>
            </button>
          )}

          {setShowNotifications && (
            <button
              type="button"
              className={dockBtnClass(showNotifications)}
              onClick={(e) => toggleNotifications(e.currentTarget)}
              aria-label={isRtl ? "الإشعارات" : "Notifications"}
              aria-pressed={showNotifications}
            >
              <span className="sx-dock-v2__icon-wrap">
                <Bell size={22} strokeWidth={2.1} aria-hidden />
                <DockBadge count={notificationsCount} />
              </span>
              <span>{isRtl ? "الإشعارات" : "Notifications"}</span>
            </button>
          )}

          <button
            type="button"
            className={dockBtnClass(activeSheet === "quick", "quick")}
            onClick={(e) =>
              openSheet(activeSheet === "quick" ? "none" : "quick", e.currentTarget)
            }
            aria-label={
              isRtl ? "الوصول السريع إلى أقسام المنصة" : "Quick access to platform sections"
            }
            aria-expanded={activeSheet === "quick"}
          >
            <span className="sx-dock-v2__icon-wrap">
              <LayoutGrid size={22} strokeWidth={2.1} aria-hidden />
              {showQuickAccessHint && <span className="sx-dock-v2__dot" aria-hidden />}
            </span>
            <span>{isRtl ? "الوصول" : "Access"}</span>
          </button>

          <button
            type="button"
            className={dockBtnClass(activeSheet === "more")}
            onClick={(e) =>
              openSheet(activeSheet === "more" ? "none" : "more", e.currentTarget)
            }
            aria-label={isRtl ? "المزيد والإعدادات" : "More & settings"}
            aria-expanded={activeSheet === "more"}
          >
            <span className="sx-dock-v2__icon-wrap">
              <MoreHorizontal size={22} strokeWidth={2.1} aria-hidden />
              {hasOfflineWork && <span className="sx-dock-v2__dot" aria-hidden />}
            </span>
            <span>{isRtl ? "المزيد" : "More"}</span>
          </button>
        </div>
      </nav>

      {/* Quick Access 2.0 — mobile/tablet sheet */}
      {isCompactViewport &&
        renderDrawerPortal(
          <AnimatePresence>
            {activeSheet === "quick" && (
              <div
                className="sx-dock-sheet-root"
                data-ui="mobile-panel-overlay-v3"
                data-panel="quick-access"
                role="dialog"
                aria-modal="true"
                aria-label={isRtl ? "الوصول السريع" : "Quick access"}
              >
                <motion.button
                  type="button"
                  {...modalBackdropProps()}
                  onClick={closeSheets}
                  className="sx-drawer-backdrop"
                  aria-label={isRtl ? "إغلاق" : "Close"}
                />
                <motion.div
                  {...drawerPanelProps(true)}
                  className="sx-dock-sheet sx-dock-sheet--quick sx-dock-sheet--light"
                  dir={isRtl ? "rtl" : "ltr"}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sx-dock-sheet__grab" aria-hidden />
                  <div className="sx-dock-sheet__sticky">
                    <PremiumSectionHeader
                      panel="quick-access"
                      icon={LayoutGrid}
                      iconTone="navy"
                      title={isRtl ? "الوصول السريع" : "Quick access"}
                      subtitle={
                        isRtl
                          ? "انتقل بسرعة إلى أقسام المنصة المتاحة حسب صلاحيتك"
                          : "Jump quickly to platform sections available for your role"
                      }
                      actions={
                        <SectionHeaderButton
                          onClick={closeSheets}
                          ariaLabel={isRtl ? "إغلاق" : "Close"}
                        >
                          <X size={18} strokeWidth={2} aria-hidden />
                        </SectionHeaderButton>
                      }
                    />
                    <div className="sx-dock-sheet__search-wrap">
                      <Search className="sx-dock-sheet__search-icon" size={16} aria-hidden />
                      <input
                        ref={searchRef}
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={isRtl ? "ابحث عن قسم أو خدمة…" : "Search for a section or service…"}
                        className="sx-dock-sheet__search"
                        aria-label={isRtl ? "بحث" : "Search"}
                      />
                      {searchTerm ? (
                        <button
                          type="button"
                          className="sx-dock-sheet__search-clear"
                          onClick={() => {
                            setSearchTerm("");
                            searchRef.current?.focus();
                          }}
                          aria-label={isRtl ? "مسح البحث" : "Clear search"}
                        >
                          <X size={14} aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="sx-dock-sheet__body">
                    {groupedQuickAccess.length === 0 ? (
                      <div className="sx-dock-sheet__empty">
                        <p className="sx-dock-sheet__empty-title">
                          {isRtl ? "لا توجد نتائج مطابقة" : "No matching results"}
                        </p>
                        <p className="sx-dock-sheet__empty-hint">
                          {isRtl
                            ? "جرّب كلمات مثل: الطلاب، الأقساط، الرسائل"
                            : "Try: students, tuition, messages"}
                        </p>
                      </div>
                    ) : (
                      groupedQuickAccess.map(({ section, items }) => (
                        <section key={section.id} className="sx-dock-qa-section">
                          <div className="sx-dock-qa-section__head">
                            <h3 className="sx-dock-qa-section__label">
                              {isRtl ? section.labelAr : section.labelEn}
                            </h3>
                            <p className="sx-dock-qa-section__desc">
                              {isRtl ? section.descAr : section.descEn}
                            </p>
                          </div>
                          {section.id === "system" &&
                            showPermissionsGateway &&
                            permissionsGatewayTab && (
                              <button
                                type="button"
                                className="sx-dock-perms-card"
                                onClick={() => handleTabClick(permissionsGatewayTab)}
                              >
                                <span className="sx-dock-perms-card__body">
                                  <span className="sx-dock-perms-card__title">
                                    {isRtl ? "بوابة الصلاحيات" : "Permissions gateway"}
                                    <span className="sx-dock-perms-card__badge">
                                      {permissionsBadge}
                                    </span>
                                  </span>
                                  <span className="sx-dock-perms-card__desc">
                                    {isRtl
                                      ? "إدارة الوصول والصلاحيات حسب الدور"
                                      : "Manage role-based access"}
                                  </span>
                                </span>
                                <span className="sx-dock-perms-card__icon" aria-hidden>
                                  <ShieldCheck size={20} strokeWidth={2.2} />
                                </span>
                              </button>
                            )}
                          <div className="sx-dock-qa-grid">
                            {items.map((item) => {
                              const Icon = item.icon;
                              const isActive = activeTab === item.id;
                              const desc = getQuickAccessItemDescription(item, isRtl);
                              const badge = getQuickAccessItemBadge(item.id, isRtl);
                              const longLabel = item.label.length > 14;
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() => handleTabClick(item.id)}
                                  className={`sx-dock-qa-item${isActive ? " sx-dock-qa-item--active" : ""}${longLabel ? " sx-dock-qa-item--wide" : ""}`}
                                >
                                  <span className="sx-dock-qa-item__content">
                                    <span className="sx-dock-qa-item__label-row">
                                      <span className="sx-dock-qa-item__label">{item.label}</span>
                                      {badge === "admin" ? (
                                        <span className="sx-dock-qa-item__chip">
                                          {isRtl ? "إداري" : "Admin"}
                                        </span>
                                      ) : null}
                                    </span>
                                    <span className="sx-dock-qa-item__desc">{desc}</span>
                                  </span>
                                  <span className="sx-dock-qa-item__icon" aria-hidden>
                                    <Icon size={18} strokeWidth={isActive ? 2.4 : 2} />
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </section>
                      ))
                    )}
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
        )}

      {/* More / Settings sheet — mobile/tablet */}
      {isCompactViewport &&
        renderDrawerPortal(
          <AnimatePresence>
            {activeSheet === "more" && (
              <div
                className="sx-dock-sheet-root"
                data-ui="mobile-panel-overlay-v3"
                data-panel="more"
                role="dialog"
                aria-modal="true"
                aria-label={isRtl ? "المزيد" : "More"}
              >
                <motion.button
                  type="button"
                  {...modalBackdropProps()}
                  onClick={closeSheets}
                  className="sx-drawer-backdrop"
                  aria-label={isRtl ? "إغلاق" : "Close"}
                />
                <motion.div
                  {...drawerPanelProps(true)}
                  className="sx-dock-sheet sx-dock-sheet--more sx-dock-sheet--light"
                  dir={isRtl ? "rtl" : "ltr"}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="sx-dock-sheet__grab" aria-hidden />
                  <div className="sx-dock-sheet__sticky">
                    <PremiumSectionHeader
                      panel="more"
                      icon={SlidersHorizontal}
                      iconTone="navy"
                      title={isRtl ? "المزيد من الخيارات" : "More options"}
                      subtitle={
                        isRtl
                          ? "إعدادات الحساب، التخصيص، وأدوات النظام"
                          : "Account settings, personalization, and system tools"
                      }
                      actions={
                        <SectionHeaderButton
                          onClick={closeSheets}
                          ariaLabel={isRtl ? "إغلاق" : "Close"}
                        >
                          <X size={18} strokeWidth={2} aria-hidden />
                        </SectionHeaderButton>
                      }
                    />
                  </div>
                  <div className="sx-dock-sheet__body sx-dock-more-body">
                    <section className="sx-dock-more-section">
                      <h3 className="sx-dock-more-section__label">
                        {isRtl ? "الحساب" : "Account"}
                      </h3>
                      {menuItems.some((i) => i.id === "settings") && (
                        <button
                          type="button"
                          className="sx-dock-more-row"
                          onClick={() => handleTabClick("settings")}
                        >
                          <span className="sx-dock-more-row__icon" aria-hidden>
                            <User size={18} strokeWidth={2} />
                          </span>
                          <span className="sx-dock-more-row__text">
                            <span className="sx-dock-more-row__label">
                              {isRtl ? "الملف الشخصي" : "Profile"}
                            </span>
                            <span className="sx-dock-more-row__hint">
                              {isRtl ? "عرض وتعديل بياناتك" : "View and edit your details"}
                            </span>
                          </span>
                          <ChevronLeft
                            size={16}
                            className="sx-dock-more-row__chevron"
                            aria-hidden
                          />
                        </button>
                      )}
                      {menuItems.some((i) => i.id === "settings") && (
                        <button
                          type="button"
                          className="sx-dock-more-row"
                          onClick={() => handleTabClick("settings")}
                        >
                          <span className="sx-dock-more-row__icon" aria-hidden>
                            <Settings size={18} strokeWidth={2} />
                          </span>
                          <span className="sx-dock-more-row__text">
                            <span className="sx-dock-more-row__label">
                              {isRtl ? "الإعدادات" : "Settings"}
                            </span>
                            <span className="sx-dock-more-row__hint">
                              {isRtl ? "تفضيلات الحساب والمدرسة" : "Account and school preferences"}
                            </span>
                          </span>
                          <ChevronLeft
                            size={16}
                            className="sx-dock-more-row__chevron"
                            aria-hidden
                          />
                        </button>
                      )}
                    </section>

                    <section className="sx-dock-more-section">
                      <h3 className="sx-dock-more-section__label">
                        {isRtl ? "التخصيص" : "Personalization"}
                      </h3>
                      <div className="sx-dock-more-row sx-dock-more-row--static">
                        <span className="sx-dock-more-row__icon" aria-hidden>
                          <Globe size={18} strokeWidth={2} />
                        </span>
                        <span className="sx-dock-more-row__text">
                          <span className="sx-dock-more-row__label">
                            {isRtl ? "اللغة" : "Language"}
                          </span>
                          <span className="sx-dock-more-row__hint">
                            {isRtl ? "العربية / English" : "Arabic / English"}
                          </span>
                        </span>
                        <LanguageToggle />
                      </div>
                      <div className="sx-dock-more-row sx-dock-more-row--static">
                        <span className="sx-dock-more-row__icon" aria-hidden>
                          <Moon size={18} strokeWidth={2} />
                        </span>
                        <span className="sx-dock-more-row__text">
                          <span className="sx-dock-more-row__label">
                            {isRtl ? "المظهر" : "Appearance"}
                          </span>
                          <span className="sx-dock-more-row__hint">
                            {isRtl ? "الوضع الفاتح أو الليلي" : "Light or dark mode"}
                          </span>
                        </span>
                        <ThemeToggle />
                      </div>
                    </section>

                    {(hasOfflineWork ||
                      showPermissionsGateway ||
                      ((role === "superadmin" || role === "super_admin") &&
                        menuItems.some((i) => i.id === "diagnostics"))) && (
                      <section className="sx-dock-more-section">
                        <h3 className="sx-dock-more-section__label">
                          {isRtl ? "النظام" : "System"}
                        </h3>
                        {hasOfflineWork && offlineOps && (
                          <button
                            type="button"
                            className="sx-dock-more-row sx-dock-more-row--status"
                            onClick={() => {
                              closeSheets();
                              offlineOps.openPanel();
                            }}
                          >
                            <span className="sx-dock-more-row__icon sx-dock-more-row__icon--warn" aria-hidden>
                              <CloudUpload size={18} strokeWidth={2} />
                            </span>
                            <span className="sx-dock-more-row__text">
                              <span className="sx-dock-more-row__label">
                                {isRtl ? "عمليات بانتظار المزامنة" : "Pending sync operations"}
                              </span>
                              <span className="sx-dock-more-row__hint">
                                {isRtl
                                  ? `${offlinePendingCount} عملية تحتاج مزامنة`
                                  : `${offlinePendingCount} operations need sync`}
                              </span>
                            </span>
                            <span className="sx-dock-more-row__chip sx-dock-more-row__chip--warn">
                              {isSyncing ? (isRtl ? "جاري" : "Syncing") : offlinePendingCount}
                            </span>
                          </button>
                        )}
                        {(role === "superadmin" || role === "super_admin") &&
                          menuItems.some((i) => i.id === "diagnostics") && (
                            <button
                              type="button"
                              className="sx-dock-more-row"
                              onClick={() => handleTabClick("diagnostics")}
                            >
                              <span className="sx-dock-more-row__icon" aria-hidden>
                                <ClipboardCheck size={18} strokeWidth={2} />
                              </span>
                              <span className="sx-dock-more-row__text">
                                <span className="sx-dock-more-row__label">
                                  {isRtl ? "التشخيصات" : "Diagnostics"}
                                </span>
                                <span className="sx-dock-more-row__hint">
                                  {isRtl ? "فحص النظام والأداء" : "System health checks"}
                                </span>
                              </span>
                              <ChevronLeft
                                size={16}
                                className="sx-dock-more-row__chevron"
                                aria-hidden
                              />
                            </button>
                          )}
                        {showPermissionsGateway && permissionsGatewayTab && (
                          <button
                            type="button"
                            className="sx-dock-more-row"
                            onClick={() => handleTabClick(permissionsGatewayTab)}
                          >
                            <span className="sx-dock-more-row__icon" aria-hidden>
                              <KeyRound size={18} strokeWidth={2} />
                            </span>
                            <span className="sx-dock-more-row__text">
                              <span className="sx-dock-more-row__label">
                                {isRtl ? "بوابة الصلاحيات" : "Permissions gateway"}
                              </span>
                              <span className="sx-dock-more-row__hint">
                                {isRtl ? "إدارة الوصول حسب الدور" : "Role-based access control"}
                              </span>
                            </span>
                            <span className="sx-dock-more-row__chip">{permissionsBadge}</span>
                          </button>
                        )}
                      </section>
                    )}
                  </div>
                  {showLogoutAction && (
                    <div className="sx-dock-sheet__footer sx-dock-more-footer">
                      <button
                        type="button"
                        className="sx-dock-more-logout"
                        onClick={handleLogout}
                      >
                        <span className="sx-dock-more-logout__icon" aria-hidden>
                          <LogOut size={18} strokeWidth={2} />
                        </span>
                        <span className="sx-dock-more-logout__text">
                          <span className="sx-dock-more-logout__label">
                            {logoutLabel || (isRtl ? "تسجيل الخروج" : "Logout")}
                          </span>
                          <span className="sx-dock-more-logout__hint">
                            {isRtl
                              ? "إنهاء الجلسة الحالية بأمان"
                              : "End your current session safely"}
                          </span>
                        </span>
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
        )}

      {/* Desktop services drawer — unchanged */}
      {renderDrawerPortal(
        <AnimatePresence mode="wait">
          {servicesDrawerOpen && (
            <motion.div key="services-drawer-stack" className="sx-drawer-stack">
              <motion.button
                type="button"
                {...modalBackdropProps()}
                onClick={closeServicesMenu}
                className="sx-drawer-backdrop"
                aria-label={isRtl ? "إغلاق القائمة" : "Close menu"}
              />
              <motion.aside
                key="services-drawer"
                {...servicesSideDrawerProps(isRtl)}
                className={`sx-drawer-panel sx-drawer-panel--services ${isRtl ? "sx-drawer-panel--rtl" : "sx-drawer-panel--ltr"}`}
                dir={isRtl ? "rtl" : "ltr"}
                role="dialog"
                aria-modal="true"
                aria-label={isRtl ? "قائمة الخدمات" : "Services menu"}
              >
                <div className="sx-drawer-services-header">
                  <div className="sx-drawer-services-header__glow" aria-hidden />
                  <div className="flex items-start justify-between gap-3 relative z-[1]">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="sx-drawer-services-header__badge">
                        <SchoolixLogo size={26} surface="light" />
                      </div>
                      <div className="min-w-0">
                        <p className="sx-drawer-services-header__eyebrow">SchoolixIQ</p>
                        <h3 className="sx-drawer-services-header__title">
                          {isRtl ? "القائمة الرئيسية" : "Main menu"}
                        </h3>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={closeServicesMenu}
                      className="sx-drawer-services-close sx-action-btn sx-action-btn-icon shrink-0"
                      aria-label={isRtl ? "إغلاق" : "Close"}
                    >
                      <X size={18} strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
                <div className="sx-drawer-services-body">
                  <div className="sx-drawer-services-list">
                    {menuItems.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          type="button"
                          {...drawerNavItemMotion(index, isRtl)}
                          whileTap={prefersReducedMotion() ? undefined : { scale: 0.98 }}
                          onClick={() => handleTabClick(item.id)}
                          className={`sx-drawer-nav-item ${isActive ? "sx-drawer-nav-item--active" : ""}`}
                        >
                          <span className="sx-drawer-nav-item__icon" aria-hidden>
                            <Icon size={20} strokeWidth={isActive ? 2.35 : 2.15} />
                          </span>
                          <span className="sx-drawer-nav-item__label truncate">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
                {showLogoutAction && (
                  <div className="sx-drawer-services-footer">
                    <button type="button" onClick={handleLogout} className="sx-drawer-services-logout">
                      <LogOut size={20} strokeWidth={2.25} aria-hidden />
                      <span>{logoutLabel || (isRtl ? "تسجيل الخروج" : "Logout")}</span>
                    </button>
                  </div>
                )}
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>,
      )}
    </>
  );

  function handleLogout() {
    closeSheets();
    setIsSidebarOpen(false);
    setShowNotifications?.(false);
    onLogout?.();
  }
};
