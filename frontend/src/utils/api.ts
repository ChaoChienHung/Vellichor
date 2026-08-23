import { DiaryEntry } from '../types';

type ApiUser = { username: string; penName: string; isLoggedIn: boolean };

async function req<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const resp = await fetch(input, { credentials: 'same-origin', ...init });
  if (resp.status === 401) {
    throw new Error('not_authenticated');
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(text || `http_${resp.status}`);
  }
  return (await resp.json()) as T;
}

export async function getState(): Promise<{ entries: DiaryEntry[]; currentUser: ApiUser }> {
  return req<{ entries: DiaryEntry[]; currentUser: ApiUser }>('/api/entries/full');
}

export async function createEntry(payload: { title: string; content: string; date?: string }): Promise<{ entry_id: string }> {
  return req<{ entry_id: string }>('/api/entries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function deleteEntry(entryId: string): Promise<{ ok: boolean }> {
  return req<{ ok: boolean }>(`/api/entries/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}

export async function updatePenName(penName: string): Promise<{ user_id: string; username: string; pen_name: string }> {
  return req<{ user_id: string; username: string; pen_name: string }>('/api/me', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ pen_name: penName }),
  });
}

export async function rekey(oldPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  return req<{ ok: boolean }>('/api/rekey', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
}
