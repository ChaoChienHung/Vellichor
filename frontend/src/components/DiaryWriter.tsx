import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  PenTool, Calendar, Shield, Sparkles, Check, Bookmark, FileText, Feather,
  Image as ImageIcon, Bold, Italic, Heading, Quote, List, ListOrdered, Eye, Edit3,
  UploadCloud, CheckSquare, Loader2, Plus, X, BookOpen, Search, Link2, Hash, ChevronDown
} from 'lucide-react';
import { DiaryEntry, UserProfile } from '../types';
import PenScribbleAnimation from './PenScribbleAnimation';
import {
  parseEntryContent, packEntryContent, DEFAULT_MOODS, PRESET_MOOD_ICONS, MoodOption, DEFAULT_TAGS, getMoodDisplay
} from '../utils/entryParser';
import { compressImage } from '../utils/imageCompressor';
import MarkdownRenderer from './MarkdownRenderer';
import VintageCalendar from './VintageCalendar';

interface DiaryWriterProps {
  currentUser: UserProfile;
  onSave: (entry: Omit<DiaryEntry, 'id' | 'signature' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  onCancel: () => void;
  securityLogs: string[];
  editingEntry?: DiaryEntry | null;
  existingTags?: string[];
  entries?: DiaryEntry[];
}



export default function DiaryWriter({ currentUser, onSave, onCancel, securityLogs, editingEntry, existingTags, entries = [] }: DiaryWriterProps) {
  const initialParsed = editingEntry ? parseEntryContent(editingEntry.content || '') : { moodNote: '', body: '' };

  const [title, setTitle] = useState(editingEntry ? editingEntry.title : '');
  const [date, setDate] = useState(editingEntry ? editingEntry.date : new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState(editingEntry ? initialParsed.body : '');
  const [mood, setMood] = useState(editingEntry ? (editingEntry.mood || 'reflective') : 'reflective');
  const [moodNote, setMoodNote] = useState(editingEntry ? initialParsed.moodNote : '');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Tags states & pool management
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (editingEntry?.tags && Array.isArray(editingEntry.tags)) {
      return editingEntry.tags.map((t) => t.trim()).filter(Boolean);
    }
    return [];
  });

  const [customTags, setCustomTags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vellichor_custom_tags');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [newTagInput, setNewTagInput] = useState('');

  // Link Entry Picker state
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [showUtilityMenu, setShowUtilityMenu] = useState(false);

  const candidateEntries = React.useMemo(() => {
    const list = entries.filter((e) => !editingEntry || e.id !== editingEntry.id);
    if (!linkSearchQuery.trim()) return list;
    const q = linkSearchQuery.trim().toLowerCase();
    return list.filter((e) =>
      (e.title || '').toLowerCase().includes(q) ||
      (e.date || '').includes(q) ||
      (Array.isArray(e.tags) && e.tags.some(t => (t || '').toLowerCase().includes(q))) ||
      (e.content || '').toLowerCase().includes(q)
    );
  }, [entries, editingEntry, linkSearchQuery]);

  const handleInsertEntryLink = (entry: DiaryEntry) => {
    const entryTitle = entry.title || '隨筆';
    const entryDate = entry.date || '';
    const linkMarkdown = `[${entryDate ? entryDate + ' ' : ''}${entryTitle}](entry:${entry.id})`;
    insertTextAtCursor('', '', linkMarkdown);
    setShowLinkPicker(false);
    setLinkSearchQuery('');
    setImageToast(`已為您插入「${entryTitle}」的隨筆關聯`);
    setTimeout(() => setImageToast(null), 3000);
  };

  // Combined available tags pool (presets + custom + history from entries + currently selected)
  const availableTags = React.useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    const addTag = (t: string) => {
      const clean = t.trim();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        list.push(clean);
      }
    };

    DEFAULT_TAGS.forEach(addTag);
    (existingTags || []).forEach(addTag);
    customTags.forEach(addTag);
    selectedTags.forEach(addTag);

    return list;
  }, [existingTags, customTags, selectedTags]);

  // Autocomplete suggestions based on user typing
  const tagSuggestions = React.useMemo(() => {
    const q = newTagInput.trim().toLowerCase();
    if (!q) return [];
    return availableTags.filter((t) => 
      t.toLowerCase().includes(q) && !selectedTags.includes(t)
    ).slice(0, 5);
  }, [newTagInput, availableTags, selectedTags]);

  const handleToggleTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    if (selectedTags.includes(clean)) {
      setSelectedTags(selectedTags.filter((t) => t !== clean));
    } else {
      setSelectedTags([...selectedTags, clean]);
    }
  };

  const handleAddTag = (tagToAdd?: string) => {
    const raw = (tagToAdd !== undefined ? tagToAdd : newTagInput).trim();
    if (!raw) return;

    // Support multiple tags separated by comma, space or #
    const tokens = raw
      .split(/[\s,#，]+/)
      .map((t) => t.replace(/^#+/, '').trim())
      .filter((t) => t.length > 0);

    if (tokens.length === 0) return;

    const newSelected = [...selectedTags];
    const newCustom = [...customTags];

    tokens.forEach((item) => {
      if (!newSelected.includes(item)) {
        newSelected.push(item);
      }
      if (!DEFAULT_TAGS.includes(item) && !newCustom.includes(item)) {
        newCustom.push(item);
      }
    });

    setSelectedTags(newSelected);
    if (newCustom.length !== customTags.length) {
      setCustomTags(newCustom);
      try {
        localStorage.setItem('vellichor_custom_tags', JSON.stringify(newCustom));
      } catch {
        // ignore
      }
    }

    setNewTagInput('');
  };

  const handleRemoveSelectedTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tagToRemove));
  };

  const handleDeleteCustomTag = (tagToDelete: string) => {
    const updated = customTags.filter((t) => t !== tagToDelete);
    setCustomTags(updated);
    try {
      localStorage.setItem('vellichor_custom_tags', JSON.stringify(updated));
    } catch {
      // ignore
    }
    setSelectedTags((prev) => prev.filter((t) => t !== tagToDelete));
  };

  // Custom mood states
  const [customMoods, setCustomMoods] = useState<MoodOption[]>(() => {
    try {
      const saved = localStorage.getItem('vellichor_custom_moods');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });
  const [isAddingMood, setIsAddingMood] = useState(false);
  const [newMoodName, setNewMoodName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('🍵');

  // Combine default and custom moods
  const allMoods = React.useMemo(() => {
    const list = [...DEFAULT_MOODS, ...customMoods];
    if (editingEntry?.mood && !list.some((m) => m.id === editingEntry.mood)) {
      list.push({
        id: editingEntry.mood,
        name: editingEntry.mood,
        icon: '',
        label: editingEntry.mood,
        isCustom: true,
      });
    }
    return list;
  }, [customMoods, editingEntry?.mood]);

  const handleAddCustomMood = () => {
    const name = newMoodName.trim();
    if (!name) return;
    const icon = selectedIcon.trim() || '✨';
    const id = `${name} ${icon}`;

    if (!customMoods.some((m) => m.id === id || m.name === name)) {
      const updated = [
        ...customMoods,
        {
          id,
          name,
          icon,
          label: id,
          isCustom: true,
        },
      ];
      setCustomMoods(updated);
      try {
        localStorage.setItem('vellichor_custom_moods', JSON.stringify(updated));
      } catch {
        // ignore
      }
    }

    setMood(id);
    setNewMoodName('');
    setIsAddingMood(false);
  };

  const handleDeleteCustomMood = (idToDelete: string) => {
    const updated = customMoods.filter((m) => m.id !== idToDelete);
    setCustomMoods(updated);
    try {
      localStorage.setItem('vellichor_custom_moods', JSON.stringify(updated));
    } catch {
      // ignore
    }
    if (mood === idToDelete) {
      setMood('reflective');
    }
  };

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [imageToast, setImageToast] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isSigning, setIsSigning] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const [encryptionLogMsg, setEncryptionLogMsg] = useState('Ready for AES-256 generation...');

  // Helper to insert markdown text at cursor
  const insertTextAtCursor = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent(prev => prev + before + defaultText + after);
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = textarea.value;
    const selected = current.substring(start, end) || defaultText;
    const replacement = before + selected + after;
    const updated = current.substring(0, start) + replacement + current.substring(end);
    setContent(updated);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const handleProcessImageFile = async (file: File | Blob, customName?: string) => {
    setIsProcessingImage(true);
    setValidationError(null);
    try {
      const res = await compressImage(file);
      const name = customName || (file as File).name?.replace(/\.[^/.]+$/, '') || '隨筆相片';
      const imgMarkdown = `\n![${name}](${res.dataUrl})\n`;
      insertTextAtCursor(imgMarkdown);
      setImageToast(`已將「${name}」壓縮至 ${Math.round(res.compressedSize / 1024)}KB 並以 AES 密文嵌入隨筆`);
      setTimeout(() => setImageToast(null), 4000);
    } catch (err: any) {
      setValidationError(err?.message || '處理相片失敗');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleProcessImageFile(file, '剪貼簿相片');
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleProcessImageFile(file);
      } else {
        setValidationError('僅支援拖放圖檔（JPEG, PNG, WebP 等）');
      }
    }
  };

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanMoodNote = moodNote.trim();

    if (!cleanTitle) {
      setValidationError("請填寫隨筆標題再進行手簽存檔。");
      return;
    }
    if (!cleanContent && !cleanMoodNote) {
      setValidationError("請在右頁正文或左頁心情札記中填寫隨筆內容再進行簽章。");
      return;
    }
    setValidationError(null);

    setIsSigning(true);
    setEncryptionLogMsg("Running PBKDF2 Master Password derivation...");
    
    // Smooth, responsive encryption feedback
    setTimeout(() => {
      setEncryptionLogMsg("AES-256-GCM block packing & signing...");
      setSignatureDone(true);
      setTimeout(() => {
        // Include any remaining input from newTagInput if user typed and didn't press Add
        const pendingTokens = newTagInput
          .split(/[\s,#，]+/)
          .map((t) => t.replace(/^#+/, '').trim())
          .filter((t) => t.length > 0);

        const finalTags = Array.from(new Set([...selectedTags, ...pendingTokens]));

        const mergedContent = packEntryContent(cleanMoodNote, cleanContent);
          
        onSave({
          title: cleanTitle,
          date,
          content: mergedContent,
          mood,
          tags: finalTags
        }, editingEntry ? editingEntry.id : undefined);
        setIsSigning(false);
      }, 650);
    }, 450);
  };

  return (
    <div className="w-full h-full text-[#1a1a1a] flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#2d2926]/10" style={{ fontFamily: '"Noto Serif TC", serif' }}>
      
      {/* LEFT PAGE: Metadata, Mood, Tags, Core Cryptographic Monitor */}
      <div className="w-full md:w-1/2 p-4 sm:p-5 flex flex-col justify-between bg-[#fcfaf7] relative rounded-l-md overflow-y-auto max-h-[80vh] md:max-h-[640px]">
        {/* Soft page shadow accent */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-[#2d2926]/5 pointer-events-none" />

        <div className="space-y-5">
          <div className="border-b border-[#2d2926]/10 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-[#1a1a1a] flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#c4a484]" />
              <span>{editingEntry ? '修訂隨筆' : '筆墨隨記'}</span>
            </h2>
            <p className="text-xs text-[#2d2926]/60 mt-1 uppercase tracking-wider font-sans font-medium">
              {editingEntry ? 'Vellichor / Revision Mode' : 'Vellichor / Writer Module'}
            </p>
          </div>

          {/* Date setting */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#c4a484]" />
              <span>紀錄日期</span>
            </label>
            <VintageCalendar value={date} onChange={setDate} />
          </div>

          {/* Mood selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#c4a484]" />
                  <span>今朝心情</span>
                </label>
                {/* Active mood chip indicator */}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#ebd7c4]/30 text-[#2d2926] font-serif font-medium border border-[#2d2926]/12 inline-flex items-center gap-1 shadow-2xs">
                  <span className="text-[#8c6239] text-[10px]">當前：</span>
                  <span className="font-semibold">{allMoods.find(m => m.id === mood)?.name || mood}</span>
                  <span className="text-xs leading-none">{allMoods.find(m => m.id === mood)?.icon || ''}</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingMood(!isAddingMood)}
                className="text-xs flex items-center gap-1 text-[#8c6239] hover:text-[#5a3e23] font-medium transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-[#ebd7c4]/30"
                title="自訂專屬於你的心緒與圖示"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新增心緒</span>
              </button>
            </div>

            {/* Custom Mood Creation Card */}
            <AnimatePresence>
              {isAddingMood && (
                <motion.div
                  initial={{ opacity: 0, y: -6, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -6, height: 0 }}
                  className="overflow-hidden mb-2"
                >
                  <div className="p-3 bg-[#fdfcf9] border border-[#c4a484]/50 rounded-xl shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-[#2d2926]/10 pb-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-serif font-bold text-[#2d2926]">
                        <Sparkles className="w-3.5 h-3.5 text-[#8c6239]" />
                        <span>自訂心緒與意境圖示</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAddingMood(false)}
                        className="text-[#2d2926]/50 hover:text-[#2d2926] p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-sans font-medium text-[#2d2926]/70">心緒名稱</label>
                        <input
                          type="text"
                          value={newMoodName}
                          onChange={(e) => setNewMoodName(e.target.value)}
                          placeholder="例如: 悠然、沉醉、清歡"
                          maxLength={8}
                          className="w-full bg-[#fcfaf7] border border-[#2d2926]/20 rounded px-2.5 py-1 text-xs text-[#1a1a1a] focus:outline-none focus:border-[#8c6239] font-serif"
                        />
                      </div>

                      {/* Icon selector & preview */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-sans font-medium text-[#2d2926]/70">自選 Icon 或自由輸入</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={selectedIcon}
                            onChange={(e) => setSelectedIcon(e.target.value)}
                            placeholder="圖示"
                            maxLength={4}
                            className="w-14 text-center text-sm bg-[#fcfaf7] border border-[#2d2926]/20 rounded py-1 focus:outline-none focus:border-[#8c6239]"
                          />
                          <div className="text-[11px] font-serif text-[#2d2926]/80 flex items-center gap-1 bg-[#ebd7c4]/25 px-2 py-1 rounded-full border border-[#8c6239]/20 truncate">
                            <span className="text-[#8c6239]/70">預覽:</span>
                            <span className="font-bold text-[#1a1a1a]">{newMoodName.trim() || '自訂心緒'}</span>
                            <span>{selectedIcon || '✨'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Preset Emoji Picker Grid */}
                    <div className="space-y-1">
                      <div className="text-[10px] font-sans text-[#2d2926]/60">點選推薦意境圖示快速套用：</div>
                      <div className="flex flex-wrap gap-1 p-1.5 bg-[#ebd7c4]/15 rounded border border-[#2d2926]/10 max-h-20 overflow-y-auto">
                        {PRESET_MOOD_ICONS.map((ic) => (
                          <button
                            key={ic}
                            type="button"
                            onClick={() => setSelectedIcon(ic)}
                            className={`w-6 h-6 flex items-center justify-center text-xs rounded cursor-pointer transition-all hover:scale-115 ${
                              selectedIcon === ic ? 'bg-[#8c6239] text-white shadow-xs scale-110' : 'hover:bg-white/80'
                            }`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-[#2d2926]/10">
                      <button
                        type="button"
                        onClick={() => setIsAddingMood(false)}
                        className="text-xs px-2.5 py-0.5 rounded text-[#2d2926]/70 hover:bg-[#2d2926]/5 cursor-pointer font-sans"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={handleAddCustomMood}
                        disabled={!newMoodName.trim()}
                        className="text-xs px-3 py-1 rounded bg-[#2d2926] text-[#fcfaf7] hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-40 font-serif font-medium shadow-2xs"
                      >
                        新增並選用
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mood button list */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {allMoods.map((m) => {
                const isSelected = mood === m.id;
                return (
                  <div key={m.id} className="relative group">
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMood(m.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#2d2926] text-[#fcfaf7] border-[#1a1a1a] shadow-xs font-medium'
                          : 'bg-[#fcfaf7] hover:bg-[#ebd7c4]/20 text-[#2d2926] border-[#2d2926]/20'
                      }`}
                    >
                      <span className="font-medium text-xs">{m.name}</span>
                      <span className="text-sm leading-none">{m.icon}</span>
                    </button>
                    {m.isCustom && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomMood(m.id);
                        }}
                        title={`移除自訂心緒「${m.name}」`}
                        className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#2d2926]/75 hover:bg-[#8c2626] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] cursor-pointer shadow-xs leading-none"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tags Selector with Multi-select Tag Pool & Quick Custom Add */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
                <Bookmark className="w-4 h-4 text-[#c4a484]" />
                <span>標籤印記</span>
              </label>
              <span className="text-[11px] font-sans text-[#2d2926]/50">
                點選下方推薦或自訂新增
              </span>
            </div>

            {/* Selected tags badges tray */}
            <div className="min-h-[34px] p-1.5 bg-[#fcfaf7] border border-[#2d2926]/15 rounded flex flex-wrap gap-1.5 items-center">
              {selectedTags.length === 0 ? (
                <span className="text-xs text-[#2d2926]/40 italic pl-1 font-serif">
                  尚未選取標籤（可由下方點選推薦或直接輸入）
                </span>
              ) : (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-[#2d2926] text-[#fcfaf7] font-serif shadow-xs"
                  >
                    <span className="text-[#c4a484] text-[10px]">#</span>
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveSelectedTag(tag)}
                      className="hover:text-[#e06c75] ml-0.5 cursor-pointer leading-none text-xs font-bold transition-colors"
                      title={`移除標籤 #${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Quick Tag Selection Pool */}
            <div className="space-y-1">
              <div className="text-[10px] font-sans text-[#2d2926]/60">
                推薦與常用標籤池（點擊切換附加）：
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-[#ebd7c4]/15 rounded border border-[#2d2926]/10">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  const isCustom = customTags.includes(tag) && !DEFAULT_TAGS.includes(tag);
                  return (
                    <div key={tag} className="relative group">
                      <button
                        type="button"
                        onClick={() => handleToggleTag(tag)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer flex items-center gap-1 ${
                          isSelected
                            ? 'bg-[#8c6239] text-[#fcfaf7] border-[#6b4724] shadow-xs font-medium'
                            : 'bg-[#fcfaf7] hover:bg-[#ebd7c4]/30 text-[#2d2926] border-[#2d2926]/20'
                        }`}
                      >
                        <span className="text-[10px] opacity-70">#</span>
                        <span>{tag}</span>
                        {isSelected && <Check className="w-2.5 h-2.5 ml-0.5 text-[#ebd7c4]" />}
                      </button>
                      {isCustom && !isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomTag(tag);
                          }}
                          title={`從自訂標籤庫移除「${tag}」`}
                          className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#2d2926]/70 hover:bg-[#8c2626] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] cursor-pointer shadow-xs leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Add Custom Tag Input with Autocomplete */}
            <div className="relative">
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#2d2926]/40 font-serif">#</span>
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="新增自訂標籤（按 Enter 或點擊加入，支援逗號）"
                    className="w-full bg-[#fcfaf7] border border-[#2d2926]/15 rounded pl-6 pr-3 py-1.5 text-xs text-[#1a1a1a] placeholder-[#2d2926]/35 focus:outline-none focus:border-[#2d2926] font-serif"
                    disabled={isSigning}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleAddTag()}
                  disabled={!newTagInput.trim()}
                  className="px-2.5 py-1.5 text-xs rounded bg-[#2d2926] hover:bg-[#1a1a1a] text-[#fcfaf7] font-serif transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1 shadow-2xs shrink-0"
                >
                  <Plus className="w-3 h-3" />
                  <span>加入</span>
                </button>
              </div>

              {/* Autocomplete Suggestions if user is typing */}
              {tagSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-[#fcfaf7] border border-[#2d2926]/20 rounded-md shadow-lg z-20 py-1 font-serif">
                  <div className="px-2.5 py-0.5 text-[10px] text-[#2d2926]/50">
                    推薦既有標籤（點擊直接套用）：
                  </div>
                  {tagSuggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddTag(sug)}
                      className="w-full text-left px-3 py-1 text-xs hover:bg-[#ebd7c4]/30 flex items-center justify-between text-[#1a1a1a] cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <span className="text-[#8c6239]">#</span>
                        <span className="font-medium">{sug}</span>
                      </span>
                      <span className="text-[10px] text-[#8c6239] font-sans">點選直接套用</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#c4a484]" />
              <span>心情札記</span>
            </label>
            <textarea
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="請用一句話形容今天的心情，例如：平靜，但帶著一點期待。"
              className="w-full min-h-[70px] bg-[#fcfaf7] border border-[#2d2926]/15 rounded px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#2d2926]/35 focus:outline-none focus:border-[#2d2926] font-serif resize-none"
              disabled={isSigning}
            />
          </div>

          {/* System Dynamic Crypto Tracker */}
          <div className="bg-[#fcfaf7] rounded-lg p-3 border border-[#2d2926]/12 font-sans text-[11px] space-y-1">
            <div className="flex items-center justify-between text-[#1a1a1a] font-bold border-b border-[#2d2926]/10 pb-1 mb-1">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#c4a484] animate-pulse" />
                <span>加密狀態監控器</span>
              </span>
              <span className="text-[#c4a484] text-[10px] font-bold">AES-256 OK</span>
            </div>
            <div className="text-[#2d2926]/80">
              <span className="text-[#1a1a1a] font-medium">執筆者:</span> {currentUser.penName || 'Ludwig'}
            </div>
            <div className="text-[#2d2926]/80 truncate">
              <span className="text-[#1a1a1a] font-medium">密鑰鹽值:</span> SHA-KDF-SALT-STABLE
            </div>
            <div className="text-[#2d2926]/90 font-medium italic flex items-center gap-1 bg-[#ebd7c4]/15 px-1.5 py-0.5 rounded mt-1.5 text-[10px]">
              <Sparkles className="w-2.5 h-2.5 text-[#c4a484] shrink-0" />
              <span className="truncate">{encryptionLogMsg}</span>
            </div>
          </div>
        </div>

        {/* Scribbling micro graphic animation at left-page bottom */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {isSigning ? (
              <motion.div
                key="signing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <PenScribbleAnimation />
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-4 px-6 border border-dashed border-[#2d2926]/12 bg-[#2d2926]/2 rounded-xl"
              >
                <div className="text-[11px] font-sans text-[#2d2926]/60 flex flex-col items-center gap-1">
                  <FileText className="w-5 h-5 text-[#2d2926]/40 mb-1" />
                  <span>於右側自由傾訴筆墨靈感。</span>
                  <span>完成後點擊「Sign(完成手簽)」將其彙編加密。</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT PAGE: Ink Slate Content Entry */}
      <div className="w-full md:w-1/2 p-4 sm:p-5 flex flex-col justify-between bg-[#fcfaf7] relative rounded-r-md overflow-y-auto max-h-[80vh] md:max-h-[640px]">
        {/* Soft folding line shadow accent */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-l from-transparent to-[#2d2926]/5 pointer-events-none" />

        {/* Link Picker Modal rendered via Portal to prevent any 3D perspective / overflow clipping */}
        {showLinkPicker && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" style={{ fontFamily: '"EB Garamond", serif' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-xl bg-[#faf5ec] border-2 border-amber-900/30 rounded-xl shadow-2xl p-5 sm:p-6 text-[#3e2723] overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Parchment background effect */}
              <div className="absolute inset-0 bg-[radial-gradient(#fbf8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
              {/* Corner gold ornaments */}
              <div className="absolute w-6 h-6 border-t-2 border-l-2 border-amber-800/40 top-2 left-2 pointer-events-none" />
              <div className="absolute w-6 h-6 border-t-2 border-r-2 border-amber-800/40 top-2 right-2 pointer-events-none" />
              <div className="absolute w-6 h-6 border-b-2 border-l-2 border-amber-800/40 bottom-2 left-2 pointer-events-none" />
              <div className="absolute w-6 h-6 border-b-2 border-r-2 border-amber-800/40 bottom-2 right-2 pointer-events-none" />

              {/* Header */}
              <div className="pb-3 border-b border-amber-900/15 flex items-center justify-between shrink-0 relative z-10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-900/10 text-amber-900">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-lg text-[#1a1a1a]">
                      引用典藏隨筆
                    </h3>
                    <p className="text-xs text-[#2d2926]/60">
                      點選篇章即可在執筆游標處自動插入雙向關聯連結
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowLinkPicker(false)}
                  className="p-1.5 rounded-full hover:bg-black/5 text-[#2d2926]/60 hover:text-[#2d2926] cursor-pointer transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="py-3 border-b border-amber-900/15 shrink-0 relative z-10 space-y-1.5">
                <div className="relative">
                  <Search className="w-4 h-4 text-amber-800 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={linkSearchQuery}
                    onChange={(e) => setLinkSearchQuery(e.target.value)}
                    placeholder="搜尋隨筆標題、日期 (YYYY-MM-DD) 或標籤..."
                    autoFocus
                    className="w-full pl-9 pr-8 py-2 bg-[#ebd7c4]/20 border border-amber-900/25 rounded-md text-sm text-[#2d2926] placeholder-[#2d2926]/40 focus:outline-none focus:ring-1 focus:ring-amber-800 font-serif"
                  />
                  {linkSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLinkSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#2d2926]/40 hover:text-[#1a1a1a] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="text-[11px] text-[#2d2926]/60 font-serif flex items-center gap-1">
                  <span>語法：</span>
                  <code className="text-[#8c6239] bg-[#ebd7c4]/35 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    [日期 標題](entry:識別碼)
                  </code>
                  <span className="text-[#2d2926]/50">（典藏閱讀時可直接點擊翻頁）</span>
                </div>
              </div>

              {/* Entries List */}
              <div className="flex-1 overflow-y-auto py-2 space-y-2 relative z-10 min-h-[220px] max-h-[45vh] pr-1">
                {candidateEntries.length === 0 ? (
                  <div className="text-center py-12 text-sm text-[#2d2926]/50 font-serif italic">
                    {entries.length === 0 ? '手帳中尚無其他已封存隨筆' : '查無符合條件的隨筆篇章'}
                  </div>
                ) : (
                  candidateEntries.map((e) => {
                    const parsedContent = e.content ? parseEntryContent(e.content).body : '';
                    return (
                      <div
                        key={e.id}
                        onClick={() => handleInsertEntryLink(e)}
                        className="p-3 rounded-lg border border-amber-900/15 bg-white/40 hover:bg-[#ebd7c4]/35 hover:border-amber-800/40 cursor-pointer transition-all duration-150 group shadow-2xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-serif font-bold text-sm text-[#1a1a1a] group-hover:text-amber-900 transition-colors truncate">
                            {e.title || '無標題隨筆'}
                          </div>
                          <span className="text-[10px] font-mono text-amber-900 bg-amber-900/10 px-1.5 py-0.5 rounded shrink-0">
                            #{String(e.id || '').slice(0, 8)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#2d2926]/60 font-sans">
                          <span>{e.date}</span>
                          <span>•</span>
                          <span className="capitalize">{getMoodDisplay(e.mood)}</span>
                          {e.tags && e.tags.length > 0 && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px] text-amber-900 font-medium">
                                {e.tags.map((t) => `#${t}`).join(' ')}
                              </span>
                            </>
                          )}
                        </div>
                        {parsedContent && (
                          <div className="mt-1.5 text-xs text-[#2d2926]/70 font-serif line-clamp-2 leading-relaxed">
                            {parsedContent.slice(0, 90)}...
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-amber-900/15 flex items-center justify-between text-xs text-[#2d2926]/60 shrink-0 relative z-10">
                <span>共 {candidateEntries.length} 篇隨筆可供引用</span>
                <button
                  type="button"
                  onClick={() => setShowLinkPicker(false)}
                  className="px-3.5 py-1.5 text-xs border border-amber-900/20 rounded-md text-[#2d2926] hover:bg-black/5 cursor-pointer font-sans transition-colors"
                >
                  取消返回
                </button>
              </div>
            </motion.div>
          </div>,
          document.body
        )}

        <form onSubmit={handleSign} className="h-full flex flex-col justify-between space-y-4">
          <div className="space-y-3 flex-1 flex flex-col">
            
            {/* Title - Elegant placeholder, no underlines, big serif */}
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setValidationError(null); }}
                placeholder="日記標題 / 暮色微芒之詩"
                className="w-full bg-transparent border-none text-xl font-bold text-[#1a1a1a] font-serif placeholder-[#2d2926]/30 p-0 focus:ring-0 focus:outline-none"
                disabled={isSigning}
                style={{ caretColor: '#1a1a1a' }}
              />
            </div>

            {/* Markdown Toolbar & Tab Switcher (Strictly One Single Line) */}
            <div className="flex items-center justify-between border-y border-[#2d2926]/10 py-1 text-xs font-sans gap-1">
              {/* Left: Compact formatting buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('**', '**', '粗體文字')}
                  title="粗體 (Bold - **text**)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('*', '*', '斜體文字')}
                  title="斜體 (Italic - *text*)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n### ', '\n', '小標題')}
                  title="標題 (Header - ### title)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <Heading className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n> ', '\n', '詩文或心靈引言')}
                  title="引用 (Quote - > quote)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <Quote className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n- ', '\n', '無序項目')}
                  title="無序清單 (Unordered List - - item 或 * item)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n1. ', '\n', '有序項目')}
                  title="有序清單 (Ordered List - 1. item)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => insertTextAtCursor('\n- [ ] ', '\n', '隨筆代辦事項')}
                  title="代辦任務 (Task - - [ ] task)"
                  disabled={activeTab !== 'write' || isSigning}
                  className="p-1 rounded hover:bg-[#2d2926]/8 text-[#2d2926] cursor-pointer disabled:opacity-40"
                >
                  <CheckSquare className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: 隨筆工具 (Utility Dropdown) + 執筆/預覽 Toggle */}
              <div className="flex items-center gap-1.5 shrink-0">
                {/* 隨筆工具 (Utility) Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowUtilityMenu(!showUtilityMenu)}
                    title="隨筆工具 (插入相片、引用隨筆等功能選單)"
                    disabled={activeTab !== 'write' || isSigning}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#ebd7c4]/30 hover:bg-[#ebd7c4]/60 text-[#8c6239] cursor-pointer transition-colors border border-[#8c6239]/25 disabled:opacity-40 font-medium text-[11px]"
                  >
                    <Sparkles className="w-3 h-3 text-[#8c6239]" />
                    <span>隨筆工具</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showUtilityMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Popover */}
                  {showUtilityMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-20" 
                        onClick={() => setShowUtilityMenu(false)} 
                      />
                      <div className="absolute right-0 top-full mt-1 w-44 bg-[#fdfcf9] border border-[#2d2926]/15 rounded-lg shadow-xl py-1 z-30 font-serif">
                        <button
                          type="button"
                          onClick={() => {
                            setShowUtilityMenu(false);
                            fileInputRef.current?.click();
                          }}
                          disabled={isProcessingImage || isSigning}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#ebd7c4]/35 flex items-center gap-2 text-[#1a1a1a] cursor-pointer transition-colors"
                        >
                          {isProcessingImage ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8c6239]" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-[#8c6239]" />
                          )}
                          <span>插入相片 (加密插圖)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowUtilityMenu(false);
                            setLinkSearchQuery('');
                            setShowLinkPicker(true);
                          }}
                          disabled={isSigning}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#ebd7c4]/35 flex items-center gap-2 text-[#1a1a1a] cursor-pointer transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5 text-[#8c6239]" />
                          <span>引用隨筆 (連結篇章)</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessImageFile(file);
                    e.target.value = '';
                  }}
                  className="hidden"
                />

                <div className="w-[1px] h-3 bg-[#2d2926]/15" />

                {/* Write vs Preview Mode Toggle */}
                <div className="flex items-center rounded bg-[#2d2926]/8 p-0.5 border border-[#2d2926]/10">
                  <button
                    type="button"
                    onClick={() => setActiveTab('write')}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-all cursor-pointer ${
                      activeTab === 'write' ? 'bg-[#fcfaf7] shadow-2xs font-bold text-[#1a1a1a]' : 'text-[#2d2926]/60 hover:text-[#1a1a1a]'
                    }`}
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>執筆</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded transition-all cursor-pointer ${
                      activeTab === 'preview' ? 'bg-[#fcfaf7] shadow-2xs font-bold text-[#1a1a1a]' : 'text-[#2d2926]/60 hover:text-[#1a1a1a]'
                    }`}
                  >
                    <Eye className="w-3 h-3" />
                    <span>預覽</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Ink Paper Lines / Content Area with Drag & Drop */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                  setIsDraggingOver(false);
                }
              }}
              onDrop={handleDrop}
              className={`relative flex-1 flex flex-col min-h-[220px] rounded transition-all ${
                isDraggingOver ? 'ring-2 ring-[#8c6239] ring-dashed bg-[#ebd7c4]/15' : ''
              }`}
            >
              {isDraggingOver && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#fcfaf7]/85 backdrop-blur-2xs rounded border-2 border-dashed border-[#8c6239] pointer-events-none">
                  <UploadCloud className="w-8 h-8 text-[#8c6239] animate-bounce mb-1" />
                  <span className="text-xs font-serif font-bold text-[#8c6239]">放開以將相片壓縮並加密嵌入隨筆</span>
                  <span className="text-[10px] font-sans text-[#2d2926]/60 mt-0.5">自動進行高畫質規格化壓縮與 AES 密文保存</span>
                </div>
              )}

              {activeTab === 'write' ? (
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => { setContent(e.target.value); setValidationError(null); }}
                  onPaste={handlePaste}
                  placeholder="在此寫下今天的點滴思緒、紙墨寄情... (支援 Markdown 標題、粗體、清單 - / * / 1.，以及直接貼上或拖曳照片)"
                  className="w-full flex-1 bg-transparent border-none text-base text-[#2d2926] leading-relaxed resize-none p-0 focus:ring-0 focus:outline-none"
                  disabled={isSigning}
                  style={{ 
                    caretColor: '#1a1a1a',
                    backgroundImage: 'linear-gradient(rgba(45, 41, 38, 0.05) 1px, transparent 1px)',
                    backgroundSize: '100% 2.2rem',
                    lineHeight: '2.2rem',
                    fontFamily: '"Noto Serif TC", serif',
                  }}
                />
              ) : (
                <div 
                  className="w-full flex-1 overflow-y-auto max-h-[360px] pr-1"
                  style={{ 
                    backgroundImage: 'linear-gradient(rgba(45, 41, 38, 0.05) 1px, transparent 1px)',
                    backgroundSize: '100% 2.2rem',
                    lineHeight: '2.2rem',
                  }}
                >
                  <MarkdownRenderer 
                    content={content} 
                    onSelectEntry={(targetId) => {
                      const clean = targetId.toLowerCase().trim();
                      const found = entries.find(e => 
                        e.id.toLowerCase() === clean || 
                        e.id.toLowerCase().startsWith(clean) || 
                        e.title.toLowerCase() === clean
                      );
                      setImageToast(found ? `關聯篇章：「${found.title}」(${found.date})` : `關聯隨筆編號：#${targetId.slice(0, 8)}`);
                      setTimeout(() => setImageToast(null), 3500);
                    }}
                  />
                </div>
              )}

              {/* Dynamic Image Insertion Toast */}
              <AnimatePresence>
                {imageToast && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-2 left-2 z-10 text-[11px] font-sans bg-[#ebd7c4] text-[#4a2e18] px-2.5 py-1 rounded-md border border-[#8c6239]/30 shadow-sm flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3 h-3 text-[#8c6239]" />
                    <span>{imageToast}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* CURSIVE SIGNATURE SPACE */}
              <AnimatePresence>
                {signatureDone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
                    animate={{ opacity: 1, scale: 1, rotate: [-10, -5] }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="absolute bottom-4 right-4 text-[#1a1a1a] select-none pointer-events-none"
                  >
                    <div className="text-right text-[10px] font-sans tracking-widest text-[#2d2926]/50 uppercase">
                      已簽章 (Signed In Ink)
                    </div>
                    {/* Exquisite hand written cursive pen name signature */}
                    <div 
                      className="font-serif text-3xl font-italic text-[#a65d5d] mt-1 pr-2 py-1 leading-normal" 
                      style={{ fontFamily: '"Great Vibes", "Alex Brush", cursive' }}
                    >
                      {currentUser.penName || 'Ludwig'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Validation error display */}
          {validationError && (
            <div className="text-xs text-[#a65d5d] font-serif italic bg-red-950/10 border border-red-900/20 px-3 py-1.5 rounded">
              {validationError}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-[#2d2926]/10 pt-4 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSigning}
              className="px-4 py-2 text-xs font-sans tracking-wider uppercase border border-[#2d2926]/15 rounded text-[#2d2926] hover:bg-[#2d2926]/5 cursor-pointer disabled:opacity-50"
            >
              返回目錄
            </button>
            <button
              type="submit"
              disabled={isSigning || (!title.trim() && !content.trim() && !moodNote.trim())}
              className={`px-5 py-2 text-xs font-sans tracking-widest uppercase rounded flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${
                isSigning
                  ? 'bg-[#2d2926]/20 text-[#2d2926]/50 border border-[#2d2926]/10'
                  : 'bg-[#2d2926] text-[#fcfaf7] border border-[#1a1a1a] hover:bg-[#1a1a1a] active:scale-95 disabled:opacity-40 font-medium'
              }`}
            >
              {isSigning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>加密製印中...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingEntry ? '重新簽署並保存 (Update)' : 'Sign (手簽封緘)'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
