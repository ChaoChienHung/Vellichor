import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, KeyRound, Bookmark, Compass } from 'lucide-react';
import { DiaryEntry, UserProfile, BookViewMode } from '../types';
import DiaryWriter from './DiaryWriter';
import DiarySearch from './DiarySearch';

interface VellichorBookProps {
  viewMode: BookViewMode;
  entries: DiaryEntry[];
  currentUser: UserProfile;
  securityLogs: string[];
  setViewMode: (mode: BookViewMode) => void;
  onSaveEntry: (entry: Omit<DiaryEntry, 'id' | 'signature' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteEntry: (id: string) => void;
}

export default function VellichorBook({
  viewMode,
  entries,
  currentUser,
  securityLogs,
  setViewMode,
  onSaveEntry,
  onDeleteEntry
}: VellichorBookProps) {
  const isClosed = viewMode === 'closed';

  return (
    <div className="relative w-full max-w-6xl mx-auto flex items-center justify-center p-2 min-h-[560px]">
      <AnimatePresence mode="wait">
        
        {/* ========================================== */}
        {/* 1. CLOSED BOOK COVER VIEW MODE */}
        {/* ========================================== */}
        {isClosed ? (
          <motion.div
            key="closed-book"
            initial={{ rotateY: -10, scale: 0.95, opacity: 0 }}
            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
            exit={{ rotateY: 90, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 80, damping: 15 }}
            style={{ perspective: 1500 }}
            className="relative"
          >
            {/* Clickable cover triggers flip open to double page */}
            <div
               onClick={() => setViewMode('open-search')}
               className="relative w-[520px] h-[620px] bg-[#2d2926] rounded-r-lg shadow-[10px_20px_40px_rgba(0,0,0,0.35),inset_2px_2px_10px_rgba(255,255,255,0.1)] border-l-10 border-[#1a1a1a] cursor-pointer group hover:scale-[1.01] hover:shadow-[12px_24px_50px_rgba(0,0,0,0.45)] transition-all duration-300"
            >
              {/* Embossed soft leather grain pattern effect */}
              <div className="absolute inset-0 bg-[#2d2926] opacity-90 [background-image:radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:12px_12px] rounded-r-lg" />
              
              {/* Aged edge shading overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/5 rounded-r-lg pointer-events-none" />

              {/* 4 Brass plated metal corners (exquisite vintage details matching the photo) */}
              {/* Top Left Corner */}
              <div className="absolute top-0 left-0 w-8 h-8 pointer-events-none">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M0 0 H32 L20 12 L12 20 L0 32 Z" fill="#c4a484" stroke="#2d2926" strokeWidth="0.5" />
                  <path d="M0 0 H24 L16 8 L8 16 L0 24 Z" fill="#ebd7c4" />
                  <circle cx="6" cy="6" r="1.5" fill="#1a1a1a" />
                </svg>
              </div>
              {/* Top Right Corner */}
              <div className="absolute top-0 right-0 w-8 h-8 pointer-events-none transform rotate-90">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M0 0 H32 L20 12 L12 20 L0 32 Z" fill="#c4a484" stroke="#2d2926" strokeWidth="0.5" />
                  <path d="M0 0 H24 L16 8 L8 16 L0 24 Z" fill="#ebd7c4" />
                  <circle cx="6" cy="6" r="1.5" fill="#1a1a1a" />
                </svg>
              </div>
              {/* Bottom Left Corner */}
              <div className="absolute bottom-0 left-0 w-8 h-8 pointer-events-none transform -rotate-90">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M0 0 H32 L20 12 L12 20 L0 32 Z" fill="#c4a484" stroke="#2d2926" strokeWidth="0.5" />
                  <path d="M0 0 H24 L16 8 L8 16 L0 24 Z" fill="#ebd7c4" />
                  <circle cx="6" cy="6" r="1.5" fill="#1a1a1a" />
                </svg>
              </div>
              {/* Bottom Right Corner */}
              <div className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none transform rotate-180">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                  <path d="M0 0 H32 L20 12 L12 20 L0 32 Z" fill="#c4a484" stroke="#2d2926" strokeWidth="0.5" />
                  <path d="M0 0 H24 L16 8 L8 16 L0 24 Z" fill="#ebd7c4" />
                  <circle cx="6" cy="6" r="1.5" fill="#1a1a1a" />
                </svg>
              </div>

              {/* Gold embossed central border strip */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-14 bg-gradient-to-r from-[#c4a484]/10 via-[#c4a484]/25 to-[#c4a484]/10 border-y border-[#c4a484]/40 pointer-events-none flex items-center justify-center">
                <div className="w-full h-[2px] bg-[#ebd7c4]/20 my-auto mx-4" />
              </div>

              {/* Gilded Embossed Typography */}
              <div className="absolute inset-x-0 top-16 flex flex-col items-center justify-center text-center px-4 pointer-events-none">
                {/* Title: Vellichor */}
                <h1 className="text-4xl text-[#ebd7c4] font-serif font-bold drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] [text-shadow:_0_1.5px_2px_rgb(45_41_38_/_70%)]" style={{ letterSpacing: '0.08em' }}>
                  Vellichor
                </h1>
                
                {/* Pen name: Ludwig */}
                <p className="text-sm text-[#ebd7c4]/70 font-sans tracking-widest mt-2 uppercase font-medium">
                  {currentUser.penName || 'Pen Name'}
                </p>
              </div>

              {/* Gold embossed lower shield crest (open book graphic details inside) */}
              <div className="absolute inset-x-0 bottom-12 flex justify-center pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                <svg width="70" height="70" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_2px_3px_rgba(0,0,0,0.5)]">
                  {/* Shield Frame */}
                  <path d="M32 4 L48 14 V32 C48 44, 32 54, 32 54 C32 54, 16 44, 16 32 V14 Z" stroke="#c4a484" strokeWidth="2.2" strokeLinejoin="round" />
                  {/* Miniature open notebook inside shield */}
                  <path d="M22 26 H42 M22 32 H42 M22 38 H34" stroke="#c4a484" strokeWidth="2" strokeLinecap="round" />
                  {/* Ink Flask bottle sketch inside */}
                  <path d="M28 20 C28 17, 36 17, 36 20 C36 22, 38 23, 38 25 M38 25 V42 H26 V25 C26 23, 28 22, 28 20 Z" stroke="#c4a484" strokeWidth="1.6" fill="none" />
                  <circle cx="32" cy="33" r="3" fill="#c4a484" />
                </svg>
              </div>

              {/* Book Spine ribs simulation overlays */}
              <div className="absolute left-0 inset-y-0 w-2.5 bg-gradient-to-r from-black/80 to-transparent rounded-l pointer-events-none" />
              
              {/* Soft shining light over the book */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none rounded-r-lg" />
              
              {/* Quick helper tip */}
              <div className="absolute -bottom-8 inset-x-0 text-center font-serif text-[10px] text-[#2d2926]/60 tracking-widest uppercase animate-pulse">
                點擊書封以翻開隨筆 (Click cover to open)
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="opened-book"
            initial={{ rotateY: -90, scale: 0.95, opacity: 0 }}
            animate={{ rotateY: 0, scale: 1, opacity: 1 }}
            exit={{ rotateY: -90, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            className="relative bg-[#2d2926] rounded-2xl p-4 md:p-6 shadow-[0_30px_60px_rgba(45,41,38,0.4)] border-t border-[#c4a484]/15"
            style={{ perspective: 1800, width: "min(1040px, 96vw)" }}
          >
            {/* Outer closed spine thickness representation */}
            <div className="absolute inset-x-0 -bottom-2 h-4 bg-[#1a1a1a] rounded-b-xl shadow-md pointer-events-none" />

            {/* Inner Pages Container with aged leather rim margins */}
            <div className="relative bg-[#f5efe4] rounded-lg shadow-inner py-1.5 px-1.5 flex flex-col md:flex-row border-4 border-[#1a1a1a]">
              
              {/* Left/Right splitting spine layout thread gutter (the middle fold) */}
              <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-8 bg-gradient-to-r from-transparent via-black/20 to-transparent pointer-events-none z-10 hidden md:block" />
              {/* Splitting crease line */}
              <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-[2px] bg-[#1a1a1a]/25 pointer-events-none z-10 hidden md:block" />

              <div className="w-full min-h-[450px] md:min-h-[580px] bg-[#fcfaf7] rounded-md overflow-hidden relative shadow-inner">
                {viewMode === 'open-write' ? (
                  <DiaryWriter
                    currentUser={currentUser}
                    onSave={(newEntry) => onSaveEntry(newEntry)}
                    onCancel={() => setViewMode('closed')}
                    securityLogs={securityLogs}
                  />
                ) : (
                  <DiarySearch
                    entries={entries}
                    currentUser={currentUser}
                    onClose={() => setViewMode('closed')}
                    onDelete={onDeleteEntry}
                  />
                )}
              </div>

              {/* Subtle Ribbon bookmark marker lying in the gutter shadow */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 h-[80%] w-2 bg-[#ebd7c4]/70 border-r border-[#2d2926]/12 shadow-sm pointer-events-none z-10 hidden md:block rounded-b" />
            </div>
            
            {/* Soft gold decorative ornaments at binding corners of outer plate */}
            <div className="absolute top-2 left-2 w-3 h-3 bg-[#c4a484]/40 rounded-full" />
            <div className="absolute top-2 right-2 w-3 h-3 bg-[#c4a484]/40 rounded-full" />
            <div className="absolute bottom-2 left-2 w-3 h-3 bg-[#c4a484]/40 rounded-full" />
            <div className="absolute bottom-2 right-2 w-3 h-3 bg-[#c4a484]/40 rounded-full" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
