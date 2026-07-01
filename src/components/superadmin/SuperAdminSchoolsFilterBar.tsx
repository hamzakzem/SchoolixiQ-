import React from 'react';
import { Search } from 'lucide-react';

export type SchoolSortOption = 'newest' | 'oldest' | 'students' | 'activity';

type PackageOption = { id: string; name?: string };

type SuperAdminSchoolsFilterBarProps = {
  isRtl: boolean;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  schoolFilter: string;
  onSchoolFilterChange: (value: string) => void;
  presenceFilter: string;
  onPresenceFilterChange: (value: string) => void;
  planFilter: string;
  onPlanFilterChange: (value: string) => void;
  stageFilter: string;
  onStageFilterChange: (value: string) => void;
  governorateFilter: string;
  onGovernorateFilterChange: (value: string) => void;
  directorateFilter: string;
  onDirectorateFilterChange: (value: string) => void;
  sortBy: SchoolSortOption;
  onSortChange: (value: SchoolSortOption) => void;
  packages: PackageOption[];
  stageOptions: string[];
  governorateOptions: string[];
  directorateOptions: string[];
};

export function SuperAdminSchoolsFilterBar({
  isRtl,
  searchTerm,
  onSearchChange,
  schoolFilter,
  onSchoolFilterChange,
  presenceFilter,
  onPresenceFilterChange,
  planFilter,
  onPlanFilterChange,
  stageFilter,
  onStageFilterChange,
  governorateFilter,
  onGovernorateFilterChange,
  directorateFilter,
  onDirectorateFilterChange,
  sortBy,
  onSortChange,
  packages,
  stageOptions,
  governorateOptions,
  directorateOptions,
}: SuperAdminSchoolsFilterBarProps) {
  return (
    <div className="sx-sa-schools-filters" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="sx-sa-schools-filters__row">
        <div className="sx-sa-schools-filters__search">
          <Search size={18} aria-hidden />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={isRtl ? 'بحث فوري بالاسم أو البريد أو العنوان...' : 'Instant search...'}
            aria-label={isRtl ? 'بحث المدارس' : 'Search schools'}
          />
        </div>
      </div>
      <div className="sx-sa-schools-filters__row">
        <select
          className="sx-sa-schools-filters__select"
          value={schoolFilter}
          onChange={(e) => onSchoolFilterChange(e.target.value)}
          aria-label={isRtl ? 'فلتر الحالة' : 'Status filter'}
        >
          <option value="active">{isRtl ? 'نشطة فقط' : 'Active only'}</option>
          <option value="all">{isRtl ? 'كل المدارس' : 'All schools'}</option>
          <option value="suspended">{isRtl ? 'معطّلة مؤقتاً' : 'Suspended'}</option>
          <option value="archived">{isRtl ? 'مؤرشفة' : 'Archived'}</option>
          <option value="expiring">{isRtl ? 'تنتهي قريباً' : 'Expiring soon'}</option>
        </select>
        <select
          className="sx-sa-schools-filters__select"
          value={planFilter}
          onChange={(e) => onPlanFilterChange(e.target.value)}
          aria-label={isRtl ? 'فلتر الباقة' : 'Plan filter'}
        >
          <option value="">{isRtl ? 'كل الباقات' : 'All plans'}</option>
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || p.id}
            </option>
          ))}
        </select>
        <select
          className="sx-sa-schools-filters__select"
          value={stageFilter}
          onChange={(e) => onStageFilterChange(e.target.value)}
          aria-label={isRtl ? 'فلتر المرحلة' : 'Stage filter'}
        >
          <option value="">{isRtl ? 'كل المراحل' : 'All stages'}</option>
          {stageOptions.map((stage) => (
            <option key={stage} value={stage}>
              {stage}
            </option>
          ))}
        </select>
        <select
          className="sx-sa-schools-filters__select"
          value={governorateFilter}
          onChange={(e) => onGovernorateFilterChange(e.target.value)}
          aria-label={isRtl ? 'فلتر المحافظة' : 'Governorate filter'}
        >
          <option value="">{isRtl ? 'كل المحافظات' : 'All governorates'}</option>
          {governorateOptions.map((gov) => (
            <option key={gov} value={gov}>
              {gov}
            </option>
          ))}
        </select>
        <select
          className="sx-sa-schools-filters__select"
          value={directorateFilter}
          onChange={(e) => onDirectorateFilterChange(e.target.value)}
          aria-label={isRtl ? 'فلتر المديرية' : 'Directorate filter'}
        >
          <option value="">{isRtl ? 'كل المديريات' : 'All directorates'}</option>
          {directorateOptions.map((dir) => (
            <option key={dir} value={dir}>
              {dir}
            </option>
          ))}
        </select>
        <select
          className="sx-sa-schools-filters__select"
          value={presenceFilter}
          onChange={(e) => onPresenceFilterChange(e.target.value)}
          aria-label={isRtl ? 'فلتر النشاط' : 'Activity filter'}
        >
          <option value="all">{isRtl ? 'كل النشاط' : 'All activity'}</option>
          <option value="online">{isRtl ? 'نشطة الآن' : 'Online now'}</option>
          <option value="recent">{isRtl ? 'نشطة مؤخراً' : 'Recently active'}</option>
          <option value="offline">{isRtl ? 'غير نشطة' : 'Offline'}</option>
        </select>
        <select
          className="sx-sa-schools-filters__select"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SchoolSortOption)}
          aria-label={isRtl ? 'ترتيب النتائج' : 'Sort results'}
        >
          <option value="newest">{isRtl ? 'الأحدث' : 'Newest'}</option>
          <option value="oldest">{isRtl ? 'الأقدم' : 'Oldest'}</option>
          <option value="students">{isRtl ? 'عدد الطلاب' : 'Student count'}</option>
          <option value="activity">{isRtl ? 'آخر نشاط' : 'Last activity'}</option>
        </select>
      </div>
    </div>
  );
}
