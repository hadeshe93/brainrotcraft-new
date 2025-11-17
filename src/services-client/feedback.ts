import { fetchService } from '@/lib/fetch';

export async function submitFeedback(formData: FormData) {
  return fetchService('/api/feedback', {
    method: 'POST',
    body: formData,
  });
}
