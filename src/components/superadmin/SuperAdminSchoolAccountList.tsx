import React, { useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Building, Copy, Mail, Phone } from 'lucide-react';
import {
  SchoolLifecycleButtons,
  SchoolStatusBadge,
} from './SchoolLifecycleButtons';
import type { SuperAdminSchoolRecord } from './SuperAdminSchoolRecordList';

function SchoolLogo({ school }: { school: SuperAdminSchoolRecord }) {
  if (school.logoUrl) {
    return (
      <div className="sx-school-record-logo">
        <img src={school.logoUrl} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="sx-school-record-logo sx-school-record-logo--placeholder">
      <Building size={22} strokeWidth={2} />
    </div>
  );
}

function SchoolIdCopy({ id, isRtl }: { id: string; isRtl: boolean }) {
  const copy = useCallback(() => {
    if (!id) return;
    void navigator.clipboard?.writeText(id).then(() => {
      toast.success(isRtl ? 'تم نسخ المعرّف' : 'ID copied');
    });
  }, [id, isRtl]);

  return (
    <button type="button" onClick={copy} className="sx-school-record-id" title={id}>
      <span className="font-mono">ID: {id?.slice(0, 8)}…</span>
      <Copy size={12} className="shrink-0 opacity-80" aria-hidden />
    </button>
  );
}

function ContactChip({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value?: string;
  href?: string;
}) {
  const display = value || '—';
  const inner = (
    <>
      <Icon size={14} className="shrink-0 text-slate-500" aria-hidden />
      <span className="sx-school-chip__label">{label}</span>
      <span className="sx-school-chip__value truncate">{display}</span>
    </>
  );

  if (href && value) {
    return (
      <a href={href} className="sx-school-chip sx-school-chip--link" title={display}>
        {inner}
      </a>
    );
  }

  return (
    <span className="sx-school-chip" title={display}>
      {inner}
    </span>
  );
}

function AccountCard({
  school,
  isRtl,
  hasCredential,
}: {
  school: SuperAdminSchoolRecord & { adminPassword?: string };
  isRtl: boolean;
  hasCredential: boolean;
}) {
  return (
    <article className="sx-school-record-card" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="sx-school-record-header">
        <SchoolLogo school={school} />
        <div className="min-w-0 flex-1">
          <h4 className="sx-school-record-title" title={school.name}>
            {school.name}
          </h4>
          <SchoolIdCopy id={school.id} isRtl={isRtl} />
        </div>
        <SchoolStatusBadge school={school} isRtl={isRtl} />
      </header>

      <div className="sx-school-record-chips">
        <ContactChip
          icon={Mail}
          label="البريد"
          value={school.adminEmail}
          href={school.adminEmail ? `mailto:${school.adminEmail}` : undefined}
        />
        <ContactChip
          icon={Phone}
          label="الهاتف"
          value={school.adminPhone}
          href={
            school.adminPhone
              ? `https://wa.me/${school.adminPhone.replace(/\s+/g, '')}`
              : undefined
          }
        />
        <span className="sx-school-chip" title={hasCredential ? 'كلمة مرور محفوظة' : 'لا توجد كلمة مرور'}>
          <span className="sx-school-chip__label">المصادقة</span>
          <span className="sx-school-chip__value">
            {hasCredential ? 'محمية' : 'غير محددة'}
          </span>
        </span>
      </div>

      <div className="sx-school-record-actions">
        <div className="flex flex-wrap gap-2 w-full justify-center">
          {school.adminEmail ? (
            <a
              href={`mailto:${school.adminEmail}`}
              className="sx-school-action-btn sx-school-action-btn--info"
            >
              <Mail size={14} />
              بريد
            </a>
          ) : null}
          {school.adminPhone ? (
            <a
              href={`https://wa.me/${school.adminPhone.replace(/\s+/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="sx-school-action-btn sx-school-action-btn--success"
            >
              <Phone size={14} />
              واتساب
            </a>
          ) : null}
        </div>
        <SchoolLifecycleButtons school={school} isRtl={isRtl} compact />
      </div>
    </article>
  );
}

type SuperAdminSchoolAccountListProps = {
  schools: (SuperAdminSchoolRecord & { adminPassword?: string })[];
  isRtl: boolean;
  emptyMessage: string;
  renderCredential: (hasCredential: boolean) => React.ReactNode;
};

export function SuperAdminSchoolAccountList({
  schools,
  isRtl,
  emptyMessage,
  renderCredential,
}: SuperAdminSchoolAccountListProps) {
  if (schools.length === 0) {
    return <p className="sx-school-record-empty">{emptyMessage}</p>;
  }

  return (
    <>
      <div className="sx-school-record-cards lg:hidden sx-schools-table-scroll custom-scrollbar">
        {schools.map((school) => (
          <AccountCard
            key={school.id}
            school={school}
            isRtl={isRtl}
            hasCredential={!!school.adminPassword}
          />
        ))}
      </div>

      <div className="hidden lg:block sx-table-scroll sx-schools-table-scroll custom-scrollbar w-full">
        <table className="sx-school-table w-full text-right border-collapse" style={{ minWidth: 960 }}>
          <thead>
            <tr>
              <th>المدرسة</th>
              <th>بيانات التواصل</th>
              <th>المصادقة</th>
              <th>الحالة</th>
              <th className="text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((school) => (
              <tr key={school.id} className="sx-school-table__row group">
                <td className="sx-school-table__cell sx-school-table__cell--school">
                  <div className="flex items-start gap-3">
                    <SchoolLogo school={school} />
                    <div className="min-w-0">
                      <p className="sx-school-record-title" title={school.name}>
                        {school.name}
                      </p>
                      <SchoolIdCopy id={school.id} isRtl={isRtl} />
                    </div>
                  </div>
                </td>
                <td className="sx-school-table__cell">
                  <div className="flex flex-col gap-2">
                    <p className="sx-school-record-meta flex items-center gap-2" title={school.adminEmail}>
                      <Mail size={14} className="shrink-0" />
                      <span className="truncate">{school.adminEmail || '—'}</span>
                    </p>
                    <p className="sx-school-record-meta flex items-center gap-2" title={school.adminPhone}>
                      <Phone size={14} className="shrink-0" />
                      <span>{school.adminPhone || '—'}</span>
                    </p>
                  </div>
                </td>
                <td className="sx-school-table__cell">
                  {renderCredential(!!school.adminPassword)}
                </td>
                <td className="sx-school-table__cell">
                  <SchoolStatusBadge school={school} isRtl={isRtl} />
                </td>
                <td className="sx-school-table__cell sx-school-table__cell--actions">
                  <div className="flex justify-center gap-2 mb-3">
                    {school.adminEmail ? (
                      <a
                        href={`mailto:${school.adminEmail}`}
                        className="sx-school-record-quick-btn"
                        title="إرسال بريد"
                      >
                        <Mail size={16} />
                      </a>
                    ) : null}
                    {school.adminPhone ? (
                      <a
                        href={`https://wa.me/${school.adminPhone.replace(/\s+/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="sx-school-record-quick-btn"
                        title="واتساب"
                      >
                        <Phone size={16} />
                      </a>
                    ) : null}
                  </div>
                  <div className="sx-school-record-actions sx-school-record-actions--table">
                    <SchoolLifecycleButtons school={school} isRtl={isRtl} compact />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
