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

export async function updateEntry(entryId: string, payload: { title: string; content: string; date?: string }): Promise<{ ok: boolean; entry_id: string }> {
  return req<{ ok: boolean; entry_id: string }>(`/api/entries/${encodeURIComponent(entryId)}`, {
    method: 'PUT',
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

export function getExportUrl(
  format: 'zip' | 'json' | 'markdown' | 'vellichor' = 'zip',
  entryId?: string,
  mode: 'encrypted' | 'plaintext' = 'encrypted',
  password?: string
): string {
  const params = new URLSearchParams({ format, mode });
  if (entryId) {
    params.set('entry_id', entryId);
  }
  if (password) {
    params.set('password', password);
  }
  return `/api/entries/export?${params.toString()}`;
}

export async function importEntriesFile(
  file: File,
  password?: string
): Promise<{ ok: boolean; total: number; imported: number; errors: string[] }> {
  const formData = new FormData();
  formData.append('file', file);
  if (password) {
    formData.append('password', password);
  }
  const resp = await fetch('/api/entries/import', {
    method: 'POST',
    credentials: 'same-origin',
    body: formData,
  });
  if (resp.status === 401) {
    throw new Error('not_authenticated');
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let errMsg = '匯入失敗：檔案格式不符合 Vellichor 隨筆規格，系統未做任何處理。';
    try {
      const data = JSON.parse(text);
      if (data?.detail?.message) {
        errMsg = data.detail.message;
      } else if (typeof data?.detail === 'string') {
        errMsg = data.detail;
      }
    } catch {
      if (text) errMsg = text;
    }
    throw new Error(errMsg);
  }
  return resp.json();
}

export async function importEntriesJson(entries: any[]): Promise<{ ok: boolean; total: number; imported: number; errors: string[] }> {
  return req<{ ok: boolean; total: number; imported: number; errors: string[] }>('/api/entries/import', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
}

