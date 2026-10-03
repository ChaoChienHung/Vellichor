import { InkSettings } from '../types';

export const DEFAULT_INK_SETTINGS: InkSettings = {
  color: '#1a1a1a',
  colorName: '漆夜墨黑',
  fontFamily: '"Noto Serif TC", "EB Garamond", serif',
  fontName: '典雅宋體',
  fontSize: 'md',
};

export const INK_COLOR_PRESETS = [
  { color: '#1a1a1a', name: '漆夜墨黑', desc: '經典深邃', border: 'border-[#1a1a1a]', bg: 'bg-[#1a1a1a]' },
  { color: '#1b365d', name: '深海靛藍', desc: '沉靜幽藍', border: 'border-[#1b365d]', bg: 'bg-[#1b365d]' },
  { color: '#7b182b', name: '宮廷緋紅', desc: '熱烈硃砂', border: 'border-[#7b182b]', bg: 'bg-[#7b182b]' },
  { color: '#6e4620', name: '古木赭褐', desc: '歲月暖褐', border: 'border-[#6e4620]', bg: 'bg-[#6e4620]' },
  { color: '#1b4332', name: '松針苔綠', desc: '清新深綠', border: 'border-[#1b4332]', bg: 'bg-[#1b4332]' },
  { color: '#301e43', name: '皇室紫羅蘭', desc: '尊貴高雅', border: 'border-[#301e43]', bg: 'bg-[#301e43]' },
];

export const INK_FONT_PRESETS = [
  { fontFamily: '"Noto Serif TC", "EB Garamond", serif', name: '典雅宋體', desc: '端莊雋永' },
  { fontFamily: 'KaiTi, "STKaiti", "DFKai-SB", "Noto Serif TC", serif', name: '行草筆墨', desc: '揮毫靈動' },
  { fontFamily: '"Courier New", Courier, monospace', name: '復古打字機', desc: '機械打字' },
  { fontFamily: '"Noto Sans TC", sans-serif', name: '現代清秀', desc: '簡約清晰' },
];

const STORAGE_KEY = 'vellichor_ink_settings';

export function getStoredInkSettings(): InkSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_INK_SETTINGS, ...parsed };
    }
  } catch (e) {}
  return DEFAULT_INK_SETTINGS;
}

export function saveStoredInkSettings(settings: InkSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {}
}
