import { useLanguage } from "../lib/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-full font-bold transition-all duration-300 bg-white hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/30 text-slate-500 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-sm active:scale-95 cursor-pointer z-50 select-none h-11 min-w-[44px] md:h-11 justify-center px-3 sm:px-4"
      title={language === "ar" ? "Switch to English" : "التحويل إلى العربية"}
    >
      <Globe className="w-[18px] h-[18px] sm:w-4 sm:h-4 text-indigo-500 shrink-0" />
      <span className="font-sans whitespace-nowrap hidden sm:block text-xs">
        {language === "ar" ? "English" : "العربية"}
      </span>
    </button>
  );
}
