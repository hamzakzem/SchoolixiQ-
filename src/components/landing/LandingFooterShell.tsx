import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone } from 'lucide-react';
import { LandingCircularLogoWithLabel } from './LandingCircularLogo';
import { resolveWhatsAppUrl } from '../../lib/landingPageConfig';

const PLATFORM_LINKS = [
  { href: '#hero', label: 'الرئيسية' },
  { href: '#features', label: 'المميزات' },
  { href: '#interfaces', label: 'الواجهات' },
  { href: '#smart-gate', label: 'التسريح الآمن' },
  { href: '#pricing', label: 'الباقات' },
  { href: '#partners', label: 'الشركاء' },
  { href: '#distributors', label: 'الموزعين' },
  { href: '#about', label: 'عن المنصة' },
];

const SUPPORT_LINKS = [
  { href: '#faq', label: 'الأسئلة الشائعة' },
  { href: '#contact', label: 'تواصل معنا' },
  { href: '/login', label: 'تسجيل الدخول' },
  { href: '/login?mode=signup', label: 'إنشاء حساب' },
];

export function LandingFooterShell({
  appName,
  description,
  whatsappNumber,
  email,
  phone,
  location,
}: {
  appName: string;
  description?: string;
  whatsappNumber?: string;
  email?: string;
  phone?: string;
  location?: string;
}) {
  const waUrl = resolveWhatsAppUrl(whatsappNumber);

  return (
    <div className="landing-footer-shell">
      <div className="lp-container">
        <div className="landing-footer-shell__grid">
          <div className="landing-footer-shell__brand">
            <div className="mb-4">
              <LandingCircularLogoWithLabel size={42} appName={appName} />
            </div>
            <p className="text-sm leading-[1.85] text-[#94a3b8] max-w-xs">
              {description || 'منصة عربية متكاملة لإدارة المدارس — حضور، أقساط، تقارير، وتواصل في تجربة واحدة.'}
            </p>
          </div>

          <div>
            <p className="landing-footer-shell__heading">المنصة</p>
            <ul className="landing-footer-shell__links">
              {PLATFORM_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href}>{l.label}</a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="landing-footer-shell__heading">الدعم</p>
            <ul className="landing-footer-shell__links">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.href}>
                  {l.href.startsWith('/') ? (
                    <Link to={l.href}>{l.label}</Link>
                  ) : (
                    <a href={l.href}>{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="landing-footer-shell__heading">تواصل معنا</p>
            <ul className="landing-footer-shell__contact">
              <li>
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <Phone size={15} />
                  واتساب {phone || '07757905554'}
                </a>
              </li>
              {email && (
                <li>
                  <a href={`mailto:${email}`}>
                    <Mail size={15} />
                    {email}
                  </a>
                </li>
              )}
              {location && (
                <li>
                  <span>
                    <MapPin size={15} />
                    {location}
                  </span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="landing-footer-shell__divider" />
      </div>
    </div>
  );
}
