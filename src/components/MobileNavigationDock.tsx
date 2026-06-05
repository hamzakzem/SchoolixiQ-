import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  LayoutDashboard,
  MessageSquare,
  Grid,
  Bell,
  Menu,
  X,
  Search,
  ChevronRight,
  ChevronLeft
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
}) => {
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

  return (
    <>
      {/* Mobile Bottom Dock Bar */}
      <div className="fixed bottom-0 inset-x-0 z-[45] lg:hidden bg-gradient-to-t from-slate-950 to-slate-900/95 border-t border-slate-800/80 backdrop-blur-lg pb-[calc(env(safe-area-inset-bottom,0px)+8px)] pt-3 px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] print:hidden w-full">
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
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
              setIsSidebarOpen(!isSidebarOpen);
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
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
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

      {/* Modern Slide-up Bento Hub Overlay */}
      <AnimatePresence>
        {showQuickAccess && (
          <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
            {/* Backdrop glass blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowQuickAccess(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute bottom-0 inset-x-0 bg-[#0B2345] dark:bg-slate-950 border-t border-[#D4A64A]/30 rounded-t-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] text-white overflow-hidden pb-[calc(env(safe-area-inset-bottom,0px)+20px)]"
            >
              {/* Header block with pull pill */}
              <div className="p-6 pb-3 shrink-0 relative flex flex-col items-center">
                <div className="w-12 h-1.5 bg-slate-500/30 rounded-full mb-5 cursor-pointer hover:bg-slate-500/50" onClick={() => setShowQuickAccess(false)} />
                <div className="w-full flex items-center justify-between" dir={isRtl ? "rtl" : "ltr"}>
                  <div>
                    <h3 className="text-xl font-black text-white font-display tracking-tight flex items-center gap-2">
                      <Grid className="text-[#D4A64A] w-5 h-5" />
                      <span>{isRtl ? "بوابة الصلاحيات والوصول السريع" : "Quick Access Gateway"}</span>
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {isRtl ? "الوصول السريع والآمن لكافة أقسام المنصة" : "Secure quick-access portal to all components"}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowQuickAccess(false)}
                    className="w-10 h-10 bg-slate-800/60 text-slate-300 hover:text-white rounded-full flex items-center justify-center border border-slate-700/50 hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Instant Filter Search input */}
                <div className="w-full mt-4 relative" dir={isRtl ? "rtl" : "ltr"}>
                  <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${isRtl ? "right-4" : "left-4"}`} size={16} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={isRtl ? "البحث عن صلاحية أو قسم معين..." : "Search permissions & details..."}
                    className={`w-full h-11 bg-slate-900/60 rounded-xl ${isRtl ? "pr-11 pl-4" : "pl-11 pr-4"} text-sm focus:outline-none focus:ring-1 focus:ring-[#D4A64A] text-white placeholder-slate-500 border border-slate-800/80`}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-white ${isRtl ? "left-4" : "right-4"}`}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Bento Grid Content Container */}
              <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar" dir={isRtl ? "rtl" : "ltr"}>
                {filteredQuickAccess.length > 0 ? (
                  <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 gap-3">
                    {filteredQuickAccess.map((item, index) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => handleTabClick(item.id)}
                          className={`flex flex-col items-start gap-3 p-4 rounded-2xl border transition-all relative overflow-hidden active:scale-[0.98] select-none text-right group min-h-[4.5rem] justify-between ${
                            isActive
                              ? "bg-[#D4A64A] text-[#0B2345] border-[#D4A64A] shadow-lg shadow-[#D4A64A]/10"
                              : "bg-slate-900/50 hover:bg-[#0B2345]/50 border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white"
                          }`}
                        >
                          <div className={`p-2.5 rounded-xl ${isActive ? "bg-[#0B2345] text-[#D4A64A]" : "bg-[#0B2345] text-slate-400 group-hover:text-white group-hover:bg-[#D4A64A] group-hover:text-[#0B2345] transition-all"} shrink-0 flex items-center justify-center`}>
                            <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
                          </div>
                          
                          <div className="w-full">
                            <p className={`text-xs font-black tracking-tight leading-snug break-words ${isActive ? "text-[#0B2345]" : "text-white"}`}>
                              {item.label}
                            </p>
                          </div>
                          
                          <div className={`absolute ${isRtl ? "left-3" : "right-3"} bottom-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                          </div>
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
      </AnimatePresence>
    </>
  );
};
