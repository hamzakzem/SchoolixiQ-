import { ensureBackendApiBaseUrl, getApiUrl } from './apiUtils';

export type PublicFeaturedSchool = {
  id: string;
  name?: string;
  logoUrl?: string;
  googleMapsUrl?: string;
  featured?: boolean;
  status?: string;
};

/** Public marketing fields of featured schools, served by the backend (no direct school-document reads). */
export async function fetchPublicFeaturedSchools(): Promise<PublicFeaturedSchool[]> {
  await ensureBackendApiBaseUrl();
  const res = await fetch(getApiUrl('/api/public/featured-schools'));
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data.schools) ? (data.schools as PublicFeaturedSchool[]) : [];
}
