import { useLanguage } from "../lib/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <button
      type="button"
      onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
      className="inline-flex items-center gap-1.5 rounded-xl sm:rounded-full font-bold transition-all duration-300 bg-[#0B2345] hover:bg-[#D4A64A] text-[#D4A64A] hover:text-[#0B2345] border border-[#D4A64A]/30 hover:border-[#D4A64A] shadow-md shadow-[#0B2345]/10 active:scale-95 cursor-pointer z-50 select-none h-11 min-w-[44px] md:h-11 justify-center px-3 sm:px-4 group"
      title={language === "ar" ? "Switch to English" : "التحويل إلى العربية"}
    >
      <Globe className="w-[18px] h-[18px] sm:w-4 sm:h-4 text-[#D4A64A] group-hover:text-[#0B2345] shrink-0 transition-colors duration-300" />
      <span className="font-sans whitespace-nowrap hidden sm:block text-xs text-[#D4A64A] group-hover:text-[#0B2345] transition-colors duration-300">
        {language === "ar" ? "English" : "العربية"}
      </span>
    </button>
  );
}
