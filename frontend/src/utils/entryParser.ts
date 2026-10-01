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
