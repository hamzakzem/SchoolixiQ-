import React, { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { School } from "../types";
import { ArrowLeft } from "lucide-react";
import { useSystemConfig } from "../lib/SystemConfigContext";

interface DisplayPartner {
  id: string;
  name: string;
  logoUrl: string;
}

function PromotionalBannerSlider({
  banners,
}: {
  banners: { id: string; imageUrl: string; active: boolean; link?: string }[];
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (banners.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 5000); // 5 seconds
    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className="relative w-full aspect-[21/9] md:aspect-[3/1] overflow-hidden group">
      {banners.map((banner, index) => {
        const isActive = index === currentIndex;
        return (
          <a
            key={banner.id}
            href={banner.link || "#"}
            target={banner.link ? "_blank" : undefined}
            rel={banner.link ? "noopener noreferrer" : undefined}
            className={`absolute inset-0 transition-opacity duration-1000 ${isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"}`}
            aria-hidden={!isActive}
          >
            <img
              src={banner.imageUrl || undefined}
              alt={`Promotional Banner ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </a>
        );
      })}

      {/* Navigation Dots */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 z-20 flex justify-center gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                setCurrentIndex(index);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${index === currentIndex ? "bg-white w-6" : "bg-white/50 hover:bg-white/75"}`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GlobalFooter({ compact = false }: { compact?: boolean }) {
  const { config } = useSystemConfig();
  const [partnersList, setPartnersList] = useState<DisplayPartner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (compact) {
      setLoading(false);
      return;
    }
    const fetchFooterData = async () => {
      try {
        const schoolsQ = query(
          collection(db, "schools"),
          where("featured", "==", true),
          where("status", "==", "active"),
          limit(8),
        );
        const schoolsSnap = await getDocs(schoolsQ);
        const schoolsData = schoolsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as School)
          .filter((s) => s.logoUrl);

        const formattedList = schoolsData.map((s) => ({
          id: s.id,
          name: s.name,
          logoUrl: s.logoUrl!,
        }));

        setPartnersList(formattedList);
      } catch (error) {
        console.error("Error fetching footer data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFooterData();
  }, [compact]);

  if (loading) return null;

  if (compact) {
    return (
      <footer className="mt-auto shrink-0 relative w-full py-3 bg-transparent print:hidden select-none">
        <div className="max-w-7xl mx-auto px-6">
          <div className="w-full h-px bg-slate-200/20 dark:bg-slate-800/25 mb-3" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-right">
            <span className="text-[10px] md:text-xs font-semibold text-slate-400 dark:text-slate-500 select-none">
              &copy; {new Date().getFullYear()} {config.appName}. جميع الحقوق
              محفوظة.
            </span>
            {config.appLogo && (
              <img
                src={config.appLogo || undefined}
                alt={config.appName}
                className="max-h-4 md:max-h-5 object-contain opacity-35 dark:opacity-45 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300 pointer-events-none"
              />
            )}
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-slate-50 dark:bg-slate-950 border-t border-slate-200/40 dark:border-slate-800/40 mt-auto shrink-0 relative w-full pt-16 md:pt-24 pb-8 overflow-hidden transition-all duration-300 select-none">
      <div className="max-w-7xl mx-auto px-4 md:px-8 relative">
        {/* PROMOTIONAL BANNERS SECTION */}
        {config.promotionalBanners &&
          config.promotionalBanners.filter((b) => b.active).length > 0 && (
            <div className="mb-16 md:mb-24 w-full flex justify-center">
              <div className="w-full max-w-5xl rounded-3xl md:rounded-[2.5rem] overflow-hidden bg-slate-100 dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <PromotionalBannerSlider
                  banners={config.promotionalBanners.filter((b) => b.active)}
                />
              </div>
            </div>
          )}

        {/* PARTNERS GRID */}
        {partnersList.length > 0 && (
          <div className="mb-16 md:mb-24 text-center">
            <div className="mb-10">
              <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-3">
                مدارس تستخدم {config.appName}
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 max-w-4xl mx-auto px-4">
              {partnersList.map((partner) => (
                <div
                  key={partner.id}
                  className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 hover:border-indigo-100 dark:hover:border-indigo-500/20 transition-all duration-200"
                >
                  <div className="h-14 md:h-16 flex items-center justify-center mb-4 opacity-75 group-hover:opacity-100 transition-opacity duration-200">
                    <img
                      src={partner.logoUrl || undefined}
                      alt={partner.name}
                      className="max-h-full max-w-full object-contain filter grayscale group-hover:grayscale-0 group-hover:scale-[1.03] transition-all duration-200"
                    />
                  </div>
                  <span className="text-xs md:text-sm font-bold text-slate-400 dark:text-slate-500 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors duration-200 opacity-0 group-hover:opacity-100 absolute bottom-3">
                    {partner.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA SECTION */}
        <div className="text-center mb-16 px-4">
          <div className="inline-block bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-8 md:p-12 rounded-3xl border border-indigo-100/50 dark:border-indigo-500/10 w-full max-w-4xl">
            <h3 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-4">
              ابدأ رحلتك الرقمية مع {config.appName} اليوم
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xl mx-auto">
              انضم إلى مئات المدارس التي تثق بنا للارتقاء بالتجربة التعليمية
              وتبسيط الإدارة بخطوات بسيطة.
            </p>
            <button
              onClick={() => {
                if (config.socialLinks?.whatsapp) {
                  window.open(config.socialLinks.whatsapp, "_blank");
                } else {
                  window.location.href = "/login?mode=signup";
                }
              }}
              className="inline-flex items-center gap-3 px-8 py-4 bg-[#0B2345] hover:bg-indigo-700 text-white rounded-xl font-bold text-base transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/25 active:scale-95"
            >
              احجز عرضاً تجريبياً
              <ArrowLeft size={20} className="rtl:-scale-x-100" />
            </button>
          </div>
        </div>

        {/* SOCIAL LINKS */}
        {config.socialLinks &&
          (config.socialLinks.instagram ||
            config.socialLinks.twitter ||
            config.socialLinks.linkedin ||
            config.socialLinks.whatsapp) && (
            <div className="w-full flex justify-center mt-4 mb-8">
              <div className="social-card scale-90 md:scale-95">
                {config.socialLinks.instagram && (
                  <a
                    href={config.socialLinks.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="socialContainer containerOne"
                  >
                    <svg className="socialSvg instagramSvg" viewBox="0 0 16 16">
                      <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.036 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
                    </svg>
                  </a>
                )}
                {config.socialLinks.twitter && (
                  <a
                    href={config.socialLinks.twitter}
                    target="_blank"
                    rel="noreferrer"
                    className="socialContainer containerTwo"
                  >
                    <svg className="socialSvg twitterSvg" viewBox="0 0 16 16">
                      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
                    </svg>
                  </a>
                )}
                {config.socialLinks.linkedin && (
                  <a
                    href={config.socialLinks.linkedin}
                    target="_blank"
                    rel="noreferrer"
                    className="socialContainer containerThree"
                  >
                    <svg className="socialSvg linkedinSvg" viewBox="0 0 16 16">
                      <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
                    </svg>
                  </a>
                )}
                {config.socialLinks.whatsapp && (
                  <a
                    href={config.socialLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    className="socialContainer containerFour"
                  >
                    <svg className="socialSvg whatsappSvg" viewBox="0 0 16 16">
                      <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c-.003 1.396.366 2.76 1.062 3.96L0 15.688l3.905-1.025a7.868 7.868 0 0 0 4.086 1.135h.004c4.367 0 7.926-3.558 7.93-7.926a7.86 7.86 0 0 0-2.324-5.546zM7.994 14.51c-1.184 0-2.344-.316-3.364-.913l-.24-.143-2.502.656.666-2.438-.157-.25a6.536 6.536 0 0 1-1.001-3.483c.004-3.605 2.94-6.541 6.55-6.541a6.535 6.535 0 0 1 4.631 1.916 6.52 6.52 0 0 1 1.914 4.634c-.003 3.603-2.939 6.539-6.543 6.539zM11.583 9.61c-.198-.1-.198-.2-.404-.303-.205-.104-1.218-.601-1.405-.67-.188-.069-.327-.104-.465.103-.138.207-.534.67-.655.808-.12.138-.242.155-.438.051-.198-.103-.872-.321-1.66-1.03-.615-.551-1.03-1.233-1.15-1.44-.121-.208-.013-.321.085-.424.088-.093.198-.231.298-.344.098-.112.13-.193.197-.321.066-.129.034-.241-.016-.345-.049-.103-.464-1.121-.636-1.536-.168-.403-.339-.348-.464-.354-.12-.006-.258-.006-.397-.006a.754.754 0 0 0-.546.255c-.188.207-.719.704-.719 1.718 0 1.014.737 1.996.84 2.134.103.138 1.455 2.221 3.525 3.115 2.07.893 2.07.595 2.455.56.386-.034 1.218-.498 1.39-1.062 1.39-.982 1.39-1.821 1.218-1.996z" />
                    </svg>
                  </a>
                )}
              </div>
            </div>
          )}

        {/* BOTTOM FOOTER */}
        <div className="w-full flex flex-col items-center pt-8 border-t border-slate-200/60 dark:border-slate-800/60">
          {config.appLogo && (
            <img
              src={config.appLogo || undefined}
              alt={config.appName}
              className="max-h-6 object-contain mb-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all pointer-events-none"
            />
          )}
          <div className="text-slate-400 dark:text-slate-500 text-[11px] md:text-xs font-semibold tracking-wide">
            &copy; {new Date().getFullYear()} {config.appName}. جميع الحقوق
            محفوظة.
          </div>
        </div>
      </div>
    </footer>
  );
}
