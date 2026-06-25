import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { getDrawerPortalNode } from "../lib/drawerPortal";
import { drawerPanelProps, drawerNavItemMotion, modalBackdropProps, MOTION_SPRING, prefersReducedMotion, servicesSideDrawerProps } from "../lib/motion";
import SchoolixLogo from './SchoolixLogo';
import {
  LayoutDashboard,
  MessageSquare,
  Grid,
  Bell,
  Menu,
  X,
  Search,
  LogOut,
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
  isRtl?: boolean;
  onLogout?: () => void;
  logoutLabel?: string;
  /** Light = high-contrast white menu (parent portal). Dark = navy hub (default). */
  menuSurface?: "dark" | "light";
  /** Hide dock entirely (e.g. full-screen chat on mobile). */
  hidden?: boolean;
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
  isRtl = true,
  onLogout,
  logoutLabel,
  menuSurface = "dark",
  hidden = false,
}) => {
  if (hidden) return null;

  const isLightMenu = menuSurface === "light";
  const [showQuickAccess, setShowQuickAccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Get home/overview item or default
  const overviewItem = menuItems.find((i) => i.id === "overview" || i.id === "home") || menuItems[0];
  // Get chat item or default
  const chatItem = menuItems.find((i) => i.id === "chat") || menuItems.find((i) => i.id === "messages");

  // Secondary items for the bento grid quick access
  const quickAccessItems = menuItems.filter(
    (item) => item.id !== "overview" && item.id !== "home"
  );

  const filteredQuickAccess = quickAccessItems.filter((item) =>
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    setShowQuickAccess(false);
    setIsSidebarOpen(false);
    if (setShowNotifications) {
      setShowNotifications(false);
    }
  };

  const handleLogout = () => {
    setShowQuickAccess(false);
    setIsSidebarOpen(false);
    if (setShowNotifications) {
      setShowNotifications(false);
    }
    onLogout?.();
  };

  const menuItemClasses = (isActive: boolean) => {
    if (isLightMenu) {
      return `parent-menu-item border rounded-2xl ${isActive ? "parent-menu-item--active" : ""}`;
    }
    if (isActive) {
      return "bg-[#D4A64A] text-[#0B2345] border-[#D4A64A] shadow-lg shadow-[#D4A64A]/10";
    }
    return "bg-slate-900/50 hover:bg-[#0B2345]/50 border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white";
  };

  const menuIconClasses = (isActive: boolean) => {
    if (isLightMenu) {
      return `parent-menu-icon p-2.5 rounded-xl shrink-0 flex items-center justify-center ${
        isActive ? "bg-[#0B2345]/10" : "bg-slate-100 dark:bg-slate-700"
      }`;
    }
    if (isActive) {
      return "bg-[#0B2345] text-[#D4A64A]";
    }
    return "bg-[#0B2345] text-slate-400 group-hover:text-white group-hover:bg-[#D4A64A] group-hover:text-[#0B2345] transition-all";
  };

  const menuLabelClasses = (isActive: boolean) => {
    if (isLightMenu) return "parent-menu-label";
    if (isActive) return "text-[#0B2345]";
    return "text-white";
  };

  const menuPanelShellClasses = isLightMenu
    ? 'sx-drawer-panel--light'
    : 'sx-drawer-panel--dark';

  const [isMobileViewport, setIsMobileViewport] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  /** Overlay drawer open — all viewports (services menu). Quick-access sheet is mobile only. */
  const servicesDrawerOpen = isSidebarOpen;
  const quickAccessOverlayOpen = isMobileViewport && showQuickAccess;
  const portalLayerOpen = servicesDrawerOpen || quickAccessOverlayOpen;

  useEffect(() => {
    if (typeof document === "undefined") return;
    const portal = document.getElementById("sx-app-drawer-portal");
    let clearTimer: ReturnType<typeof setTimeout> | undefined;

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showQuickAccess) setShowQuickAccess(false);
      else if (isSidebarOpen) setIsSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSidebarOpen, showQuickAccess, setIsSidebarOpen]);

  const closeServicesMenu = () => setIsSidebarOpen(false);

  const renderDrawerPortal = (node: React.ReactNode) => {
    if (typeof document === "undefined") return null;
    try {
      return createPortal(node, getDrawerPortalNode());
    } catch {
      return null;
    }
  };

  return (
    <>
      {/* Mobile Bottom Dock Bar */}
      <div className="sx-mobile-dock fixed bottom-0 inset-x-0 lg:hidden bg-gradient-to-t from-slate-950 to-slate-900/95 border-t border-slate-800/80 backdrop-blur-lg pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-3 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] print:hidden w-full">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          {/* 1. Home Button */}
          <button
            onClick={() => handleTabClick(overviewItem.id)}
            className="flex flex-col items-center justify-center flex-1 py-1 px-2 relative group focus:outline-none"
          >
            <div className="relative">
              <LayoutDashboard
                size={22}
                className={`transition-all duration-300 ${
                  activeTab === overviewItem.id
                    ? "text-[#D4A64A] scale-110 drop-shadow-[0_0_8px_rgba(212,166,74,0.5)]"
                    : "text-slate-400 group-hover:text-slate-200"
                }`}
              />
              {activeTab === overviewItem.id && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#D4A64A] rounded-full"
                  transition={prefersReducedMotion() ? { duration: 0.01 } : MOTION_SPRING.indicator}
                />
              )}
            </div>
            <span
              className={`text-[9px] font-bold mt-1 tracking-tight transition-colors duration-300 ${
                activeTab === overviewItem.id ? "text-[#D4A64A]" : "text-slate-500 group-hover:text-slate-300"
              }`}
            >
              {isRtl ? "الرئيسية" : "Home"}
            </span>
          </button>

          {/* 2. Messages/Chat Button */}
          {chatItem && (
            <button
              onClick={() => handleTabClick(chatItem.id)}
              className="flex flex-col items-center justify-center flex-1 py-1 px-2 relative group focus:outline-none"
            >
              <div className="relative">
                <MessageSquare
                  size={22}
                  className={`transition-all duration-300 ${
                    activeTab === chatItem.id
                      ? "text-[#D4A64A] scale-110 drop-shadow-[0_0_8px_rgba(212,166,74,0.5)]"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {activeTab === chatItem.id && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#D4A64A] rounded-full"
                    transition={prefersReducedMotion() ? { duration: 0.01 } : MOTION_SPRING.indicator}
                  />
                )}
              </div>
              <span
                className={`text-[9px] font-bold mt-1 tracking-tight transition-colors duration-300 ${
                  activeTab === chatItem.id ? "text-[#D4A64A]" : "text-slate-500 group-hover:text-slate-300"
                }`}
              >
                {chatItem.label}
              </span>
            </button>
          )}

          {/* 3. Central Premium Quick Access Hub */}
          <button
            onClick={() => {
              setShowQuickAccess(true);
              if (setShowNotifications) setShowNotifications(false);
              setIsSidebarOpen(false);
            }}
            className="flex flex-col items-center justify-center relative -mt-7 shrink-0 outline-none"
          >
            <div className={`w-14 h-14 bg-gradient-to-br from-[#0B2345] to-slate-900 text-[#D4A64A] hover:bg-[#D4A64A] hover:text-[#0B2345] rounded-full flex items-center justify-center shadow-xl shadow-[#D4A64A]/10 border-2 border-[#D4A64A]/60 active:scale-90 transition-all duration-300 group ${showQuickAccess ? "rotate-45" : ""}`}>
              <Grid size={24} className="transition-transform duration-300" />
            </div>
            <span className="text-[9px] font-black mt-1 text-[#D4A64A] tracking-wider uppercase font-display select-none">
              {isRtl ? "الوصول السريع" : "Quick Hub"}
            </span>
          </button>

          {/* 4. Notifications Button */}
          {setShowNotifications && (
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowQuickAccess(false);
                setIsSidebarOpen(false);
              }}
              className="flex flex-col items-center justify-center flex-1 py-1 px-2 relative group focus:outline-none"
            >
              <div className="relative">
                <Bell
                  size={22}
                  className={`transition-all duration-300 ${
                    showNotifications
                      ? "text-[#D4A64A] scale-110 drop-shadow-[0_0_8px_rgba(212,166,74,0.5)]"
                      : "text-slate-400 group-hover:text-slate-200"
                  }`}
                />
                {notificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[8px] font-black text-white flex items-center justify-center animate-pulse">
                    {notificationsCount > 9 ? "9+" : notificationsCount}
                  </span>
                )}
                {showNotifications && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#D4A64A] rounded-full"
                    transition={prefersReducedMotion() ? { duration: 0.01 } : MOTION_SPRING.indicator}
                  />
                )}
              </div>
              <span
                className={`text-[9px] font-bold mt-1 tracking-tight transition-colors duration-300 ${
                  showNotifications ? "text-[#D4A64A]" : "text-slate-500 group-hover:text-slate-300"
                }`}
              >
                {isRtl ? "الإشعارات" : "Alerts"}
              </span>
            </button>
          )}

          {/* 5. Menu Drawer Toggle */}
          <button
            onClick={() => {
              const nextOpen = !isSidebarOpen;
              setIsSidebarOpen(nextOpen);
              setShowQuickAccess(false);
              if (setShowNotifications) setShowNotifications(false);
            }}
            className="flex flex-col items-center justify-center flex-1 py-1 px-2 relative group focus:outline-none"
          >
            <div className="relative">
              <Menu
                size={22}
                className={`transition-all duration-300 ${
                  isSidebarOpen
                    ? "text-[#D4A64A] scale-110 drop-shadow-[0_0_8px_rgba(212,166,74,0.5)]"
                    : "text-slate-400 group-hover:text-slate-200"
                }`}
              />
              {isSidebarOpen && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#D4A64A] rounded-full"
                  transition={prefersReducedMotion() ? { duration: 0.01 } : MOTION_SPRING.indicator}
                />
              )}
            </div>
            <span
              className={`text-[9px] font-bold mt-1 tracking-tight transition-colors duration-300 ${
                isSidebarOpen ? "text-[#D4A64A]" : "text-slate-500 group-hover:text-slate-300"
              }`}
            >
              {isRtl ? "المزيد" : "More"}
            </span>
          </button>
        </div>
      </div>

      {/* Quick Access hub — bottom sheet (mobile/tablet only) */}
      {isMobileViewport && renderDrawerPortal(
        <AnimatePresence>
          {showQuickAccess && (
            <div className="sx-drawer-root lg:hidden" role="dialog" aria-modal="true" aria-label={isRtl ? "الوصول السريع" : "Quick access"}>
              <motion.button
                type="button"
                {...modalBackdropProps()}
                onClick={() => setShowQuickAccess(false)}
                className="sx-drawer-backdrop"
                aria-label={isRtl ? "إغلاق" : "Close"}
              />
              <motion.div
                {...drawerPanelProps(true)}
                className={`sx-drawer-panel sx-drawer-panel--bottom ${menuPanelShellClasses}`}
                dir={isRtl ? "rtl" : "ltr"}
              >
                <div className="sx-drawer-panel__header flex-col items-center">
                  <div
                    className={`w-12 h-1.5 rounded-full mb-3 cursor-pointer ${
                      isLightMenu ? "bg-slate-200" : "bg-slate-500/30"
                    }`}
                    onClick={() => setShowQuickAccess(false)}
                    role="presentation"
                  />
                  <div className="w-full flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className={`sx-drawer-panel__title flex items-center gap-2 ${isLightMenu ? "parent-menu-title" : ""}`}>
                        <Grid className="text-[#D4A64A] w-5 h-5 shrink-0" />
                        <span className="truncate">{isRtl ? "بوابة الصلاحيات والوصول السريع" : "Quick Access Gateway"}</span>
                      </h3>
                      <p className={`sx-drawer-panel__subtitle ${isLightMenu ? "parent-menu-subtitle" : ""}`}>
                        {isRtl ? "الوصول السريع والآمن لكافة أقسام المنصة" : "Secure quick-access portal to all components"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickAccess(false)}
                      className="sx-action-btn sx-action-btn-icon shrink-0"
                      aria-label={isRtl ? "إغلاق" : "Close"}
                    >
                      <X size={18} className="sx-action-icon" strokeWidth={2.4} />
                    </button>
                  </div>
                  <div className="w-full mt-3 relative">
                    <Search
                      className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? "right-3" : "left-3"}`}
                      size={16}
                    />
                    <input
                      type="search"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={isRtl ? "البحث عن صلاحية أو قسم معين..." : "Search permissions & details..."}
                      className={`w-full h-11 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A64A] border ${
                        isLightMenu
                          ? `parent-menu-search bg-white ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"}`
                          : `bg-slate-900/60 text-white placeholder-slate-500 border-slate-800/80 ${isRtl ? "pr-10 pl-3" : "pl-10 pr-3"}`
                      }`}
                    />
                  </div>
                </div>
                <div className="sx-drawer-panel__body px-0.5">
                  {filteredQuickAccess.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                      {filteredQuickAccess.map((item, index) => {
                        const Icon = item.icon;
                        const isActive = activeTab === item.id;
                        return (
                          <motion.button
                            key={item.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => handleTabClick(item.id)}
                            className={`flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden active:scale-[0.98] min-h-[4.5rem] justify-between ${menuItemClasses(isActive)}`}
                          >
                            <div className={`p-2.5 rounded-xl shrink-0 flex items-center justify-center ${menuIconClasses(isActive)}`}>
                              <Icon className={isLightMenu ? "parent-menu-icon" : undefined} size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                            </div>
                            <p className={`text-xs font-black tracking-tight leading-snug break-words w-full ${menuLabelClasses(isActive)}`}>
                              {item.label}
                            </p>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                      <p className="text-sm font-semibold">{isRtl ? "لم يتم العثور على صلاحيات تطابق بحثك" : "No matching permissions found"}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
      )}

      {/* Three-lines services menu — side drawer (all viewports) */}
      {renderDrawerPortal(
        <AnimatePresence mode="wait">
          {isSidebarOpen && (
            <motion.div
              key="services-drawer-stack"
              className="sx-drawer-stack"
              initial={{ opacity: 1 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 1 }}
            >
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
                          {isRtl ? "القائمة الرئيسية" : "Main Menu"}
                        </h3>
                        <p className="sx-drawer-services-header__subtitle">
                          {isRtl ? "تصفح جميع أقسام لوحة التحكم" : "Browse all dashboard sections"}
                        </p>
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
                  {menuItems.length > 0 ? (
                    <>
                      <p className="sx-drawer-services-section-label">
                        {isRtl ? "الأقسام والصلاحيات" : "Sections & permissions"}
                        <span className="sx-drawer-services-section-count">{menuItems.length}</span>
                      </p>
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
                              dir={isRtl ? "rtl" : "ltr"}
                            >
                              <span className="sx-drawer-nav-item__icon" aria-hidden>
                                <Icon size={20} strokeWidth={isActive ? 2.35 : 2.15} />
                              </span>
                              <span className="sx-drawer-nav-item__label truncate">{item.label}</span>
                              {isActive ? (
                                <span className="sx-drawer-nav-item__active-dot" aria-hidden />
                              ) : null}
                            </motion.button>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="sx-drawer-services-empty">
                      <Menu size={28} className="sx-drawer-services-empty__icon" strokeWidth={1.75} />
                      <p className="sx-drawer-services-empty__title">
                        {isRtl ? "لا توجد خدمات متاحة" : "No services available"}
                      </p>
                      <p className="sx-drawer-services-empty__hint">
                        {isRtl ? "جرّب تحديث الصفحة أو التواصل مع الإدارة" : "Try refreshing or contact your admin"}
                      </p>
                    </div>
                  )}
                </div>
                {onLogout && (
                  <div className="sx-drawer-services-footer">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="sx-drawer-services-logout"
                    >
                      <LogOut size={20} className="shrink-0" strokeWidth={2.25} />
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
};
