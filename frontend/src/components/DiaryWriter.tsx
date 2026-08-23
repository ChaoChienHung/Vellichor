import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PenTool, Calendar, Shield, Sparkles, Check, Bookmark, FileText } from 'lucide-react';
import { DiaryEntry, UserProfile } from '../types';
import PenScribbleAnimation from './PenScribbleAnimation';

interface DiaryWriterProps {
  currentUser: UserProfile;
  onSave: (entry: Omit<DiaryEntry, 'id' | 'signature' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  securityLogs: string[];
}

const MOODS = [
  { id: 'peaceful', label: '寧靜 🍃', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { id: 'reflective', label: '沈思 🌌', color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
  { id: 'nostalgic', label: '懷舊 🕯️', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { id: 'joyful', label: '喜悅 ☀️', color: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  { id: 'melancholy', label: '憂鬱 🌧️', color: 'text-blue-700 bg-blue-50 border-blue-200' },
];

export default function DiaryWriter({ currentUser, onSave, onCancel, securityLogs }: DiaryWriterProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('reflective');
  const [tagsInput, setTagsInput] = useState('');
  const [moodNote, setMoodNote] = useState('');
  
  const [isSigning, setIsSigning] = useState(false);
  const [signatureDone, setSignatureDone] = useState(false);
  const [encryptionLogMsg, setEncryptionLogMsg] = useState('Ready for AES-256 generation...');

  const handleSign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      alert("請填寫標題和內容再簽章。");
      return;
    }

    setIsSigning(true);
    setEncryptionLogMsg("Running PBKDF2 Master Password derivation...");
    
    // Simulate encryption stages
    setTimeout(() => {
      setEncryptionLogMsg("AES-256-GCM block packing: injecting nonce & salt...");
      setTimeout(() => {
        setEncryptionLogMsg("Ciphertext generated successfully. Signing document.");
        setTimeout(() => {
          setSignatureDone(true);
          // Auto trigger final save after signature animation
          setTimeout(() => {
            const tags = tagsInput
              .split(/[\s,#，]+/)
              .filter(t => t.trim().length > 0);

            const note = moodNote.trim();
            const mergedContent = note ? `【心情札記】${note}\n\n${content}` : content;
              
            onSave({
              title,
              date,
              content: mergedContent,
              mood,
              tags
            });
            setIsSigning(false);
          }, 1800);
        }, 1000);
      }, 1000);
    }, 700);
  };

  return (
    <div className="w-full h-full text-[#1a1a1a] flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#2d2926]/10" style={{ fontFamily: '"Noto Serif TC", serif' }}>
      
      {/* LEFT PAGE: Metadata, Mood, Tags, Core Cryptographic Monitor */}
      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-[#fcfaf7] relative rounded-l-md overflow-y-auto max-h-[80vh] md:max-h-[640px]">
        {/* Soft page shadow accent */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-[#2d2926]/5 pointer-events-none" />

        <div className="space-y-5">
          <div className="border-b border-[#2d2926]/10 pb-3">
            <h2 className="text-xl font-bold tracking-tight text-[#1a1a1a] flex items-center gap-2">
              <PenTool className="w-5 h-5 text-[#c4a484]" />
              <span>筆墨隨記</span>
            </h2>
            <p className="text-xs text-[#2d2926]/60 mt-1 uppercase tracking-wider font-sans font-medium">
              Vellichor / Writer Module
            </p>
          </div>

          {/* Date setting */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#c4a484]" />
              <span>紀錄日期</span>
            </label>
            <div className="flex items-center gap-2 bg-[#fcfaf7] border border-[#2d2926]/15 rounded px-3 py-1.5 focus-within:border-[#2d2926]">
              <span className="text-sm font-sans text-[#2d2926]/70 font-semibold select-none">Date:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-transparent border-none text-sm text-[#1a1a1a] font-sans focus:ring-0 outline-none w-full p-0 cursor-pointer"
                required
              />
            </div>
          </div>

          {/* Mood selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1a1a1a]">今朝心緒</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMood(m.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    mood === m.id
                      ? 'bg-[#2d2926] text-[#fcfaf7] border-[#1a1a1a] shadow-sm font-medium'
                      : 'bg-[#fcfaf7] hover:bg-[#ebd7c4]/20 text-[#2d2926] border-[#2d2926]/20'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tags entry */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-1.5">
              <Bookmark className="w-4 h-4 text-[#c4a484]" />
              <span>標籤（逗號或空白分隔）</span>
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="例如: 日常, 雨天, 感悟"
              className="w-full bg-[#fcfaf7] border border-[#2d2926]/15 rounded px-3 py-2 text-sm text-[#1a1a1a] placeholder-[#2d2926]/35 focus:outline-none focus:border-[#2d2926] font-serif"
            />
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
      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-[#fcfaf7] relative rounded-r-md overflow-y-auto max-h-[80vh] md:max-h-[640px]">
        {/* Soft folding line shadow accent */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-l from-transparent to-[#2d2926]/5 pointer-events-none" />

        <form onSubmit={handleSign} className="h-full flex flex-col justify-between space-y-4">
          <div className="space-y-4 flex-1 flex flex-col">
            
            {/* Title - Elegant placeholder, no underlines, big serif */}
            <div className="relative">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="日記標題 / 暮色微芒之詩"
                className="w-full bg-transparent border-none text-xl font-bold text-[#1a1a1a] font-serif placeholder-[#2d2926]/30 p-0 focus:ring-0 focus:outline-none"
                required
                disabled={isSigning}
                style={{ caretColor: '#1a1a1a' }}
              />
            </div>
            
            {/* Ink Paper Lines */}
            <div className="relative flex-1 flex flex-col min-h-[220px]">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="在此寫下今天的點滴思緒、紙墨寄情..."
                className="w-full flex-1 bg-transparent border-none text-base text-[#2d2926] leading-relaxed resize-none p-0 focus:ring-0 focus:outline-none"
                required
                disabled={isSigning}
                style={{ 
                  caretColor: '#1a1a1a',
                  backgroundImage: 'linear-gradient(rgba(45, 41, 38, 0.05) 1px, transparent 1px)',
                  backgroundSize: '100% 2.2rem',
                  lineHeight: '2.2rem',
                  fontFamily: '"Noto Serif TC", serif',
                }}
              />

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
                    <div className="font-serif text-3xl font-italic text-[#a65d5d] mt-0.5" style={{ fontFamily: '"Great Vibes", "Alex Brush", cursive' }}>
                      {currentUser.penName || 'Ludwig'}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-[#2d2926]/10 pt-4 shrink-0">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSigning}
              className="px-4 py-2 text-xs font-sans tracking-wider uppercase border border-[#2d2926]/15 rounded text-[#2d2926] hover:bg-[#2d2926]/5 cursor-pointer disabled:opacity-50"
            >
              闔書返回
            </button>
            <button
              type="submit"
              disabled={isSigning || !title.trim() || !content.trim()}
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
                  <span>Sign (手簽)</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
    </div>
  );
}
