export interface ParsedEntryContent {
  moodNote: string;
  body: string;
}

/**
 * Parses raw diary content into moodNote and main diary body.
 * Supports:
 * - 【心情札記】... \n\n ...
 * - 心情札記：... \n內容：...
 * - Plain content without note
 */
export function parseEntryContent(rawContent: string): ParsedEntryContent {
  if (!rawContent) return { moodNote: '', body: '' };

  const trimmed = rawContent.trim();

  // Pattern 1: 【心情札記】... \n\n ...
  const bracketMatch = trimmed.match(/^【心情札記】\s*([\s\S]*?)(?:\n\s*\n|\n(?=【內容】|【?內容】?[:：])|$)([\s\S]*)$/);
  if (bracketMatch) {
    const moodNote = (bracketMatch[1] || '').trim();
    let body = (bracketMatch[2] || '').trim();
    body = body.replace(/^(?:【內容】|【?內容】?[:：])\s*/, '').trim();
    return { moodNote, body };
  }

  // Pattern 2: 心情札記[:：]... \n內容[:：]...
  const colonMatch = trimmed.match(/^(?:心情札記[:：]|【心情札記】)\s*([\s\S]*?)(?:\n\s*\n|\n(?=內容[:：]|【內容】)|$)([\s\S]*)$/);
  if (colonMatch) {
    const moodNote = (colonMatch[1] || '').trim();
    let body = (colonMatch[2] || '').trim();
    body = body.replace(/^(?:內容[:：]|【內容】)\s*/, '').trim();
    return { moodNote, body };
  }

  // Pattern 3: If content starts with 【內容】...
  if (trimmed.startsWith('【內容】')) {
    return { moodNote: '', body: trimmed.replace(/^【內容】\s*/, '').trim() };
  }

  return { moodNote: '', body: trimmed };
}

/**
 * Packs moodNote and main body back into canonical storage format.
 */
export function packEntryContent(moodNote: string, body: string): string {
  const cleanNote = moodNote.trim();
  const cleanBody = body.trim();
  if (cleanNote) {
    return `【心情札記】${cleanNote}\n\n${cleanBody}`;
  }
  return cleanBody;
}

export interface MoodOption {
  id: string;
  name: string;
  icon: string;
  label: string;
  color?: string;
  isCustom?: boolean;
}

export const DEFAULT_MOODS: MoodOption[] = [
  { id: 'peaceful', name: '寧靜', icon: '🍃', label: '寧靜 🍃', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'reflective', name: '沈思', icon: '🌌', label: '沈思 🌌', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { id: 'nostalgic', name: '懷舊', icon: '🕯️', label: '懷舊 🕯️', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'joyful', name: '喜悅', icon: '☀️', label: '喜悅 ☀️', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { id: 'melancholy', name: '憂鬱', icon: '🌧️', label: '憂鬱 🌧️', color: 'text-blue-700 bg-blue-50 border-blue-200' },
];

export const PRESET_MOOD_ICONS: string[] = [
  // 文藝靜謐
  '🍵', '☕', '🍷', '📖', '🖋️', '📜', '🕯️', '🎻', '🎨', '♟️',
  // 自然流轉
  '🍃', '🌿', '🌸', '🍂', '🍁', '🌙', '⭐', '☀️', '🌧️', '⛅', '🌊', '🏔️',
  // 心緒觸動
  '🌌', '✨', '💭', '🕊️', '🐾', '💡', '🪐', '🔥', '⚡', '🍀', '❤️', '🎐',
];

export function getMoodDisplay(mood?: string): string {
  if (!mood) return '沈思 🌌';
  const found = DEFAULT_MOODS.find((m) => m.id === mood);
  if (found) return found.label;
  return mood;
}

export const DEFAULT_TAGS: string[] = [
  '日常', '思絮', '閱讀', '靈感', '歲月', '旅行', '生活', '回憶'
];
