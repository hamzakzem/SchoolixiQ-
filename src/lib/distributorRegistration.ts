import { getApiUrl } from './apiUtils';

export type DistributorRegistrationInput = {
  name: string;
  phone: string;
  address: string;
  governorate: string;
  email?: string;
};

export async function submitDistributorRegistration(
  input: DistributorRegistrationInput,
): Promise<{ id: string; status: string }> {
  const response = await fetch(getApiUrl('/api/public/distributors/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { message: text };
  }

  if (!response.ok) {
    throw new Error(String(body.message || body.error || 'فشل إرسال طلب الموزع'));
  }

  return {
    id: String(body.id || ''),
    status: String(body.status || 'pending'),
  };
}
