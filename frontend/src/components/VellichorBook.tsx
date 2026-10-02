import React, { useState } from 'react';
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
  onSaveEntry: (entry: Omit<DiaryEntry, 'id' | 'signature' | 'createdAt' | 'updatedAt'>, existingId?: string) => void;
  onDeleteEntry: (id: string) => void;
  onOpenImportExport?: (tab?: 'export' | 'import', entry?: DiaryEntry | null) => void;
}

export default function VellichorBook({
  viewMode,
  entries,
  currentUser,
  securityLogs,
  setViewMode,
  onSaveEntry,
  onDeleteEntry,
  onOpenImportExport
}: VellichorBookProps) {
  const isClosed = viewMode === 'closed';
  const [editingEntry, setEditingEntry] = useState<DiaryEntry | null>(null);

  React.useEffect(() => {
    if (viewMode === 'closed') {
      setEditingEntry(null);
    }
  }, [viewMode]);

  return (
    <div 
      className="relative w-full max-w-6xl mx-auto grid grid-cols-1 grid-rows-1 place-items-center p-1 sm:p-2 min-h-[500px] sm:min-h-[550px] xl:min-h-[600px]"
      style={{ perspective: 2400 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        
        {/* ========================================== */}
        {/* 1. CLOSED BOOK COVER VIEW MODE */}
        {/* ========================================== */}
        {isClosed ? (
          <motion.div
            key="closed-book"
            initial={{ rotateY: -100, x: -30, opacity: 0, scale: 0.98 }}
            animate={{ rotateY: 0, x: 0, opacity: 1, scale: 1 }}
            exit={{ 
              rotateY: -100, 
              x: -30,
              opacity: 0,
              scale: 0.98,
              transition: { duration: 0.32, ease: [0.32, 0, 0.67, 0] } 
            }}
            transition={{ type: 'spring', stiffness: 160, damping: 20, mass: 1 }}
            style={{ 
              transformOrigin: 'left center', 
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
            }}
            className="col-start-1 row-start-1 relative select-none z-20"
          >
            {/* Clickable cover triggers flip open to double page */}
            <div
               onClick={() => setViewMode('open-search')}
               className="relative w-[min(510px,88vw)] h-[min(610px,78vh)] bg-[#2d2926] rounded-r-lg shadow-[14px_22px_50px_rgba(20,15,10,0.42),inset_2px_2px_10px_rgba(255,255,255,0.08)] border-l-12 border-[#1a1a1a] cursor-pointer group hover:scale-[1.015] hover:shadow-[18px_28px_60px_rgba(20,15,10,0.52)] transition-all duration-300"
            >
              {/* Embossed soft leather grain pattern effect */}
              <div className="absolute inset-0 bg-[#2d2926] opacity-90 [background-image:radial-gradient(#1a1a1a_1px,transparent_1px)] [background-size:12px_12px] rounded-r-lg" />
              
              {/* Aged edge shading overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/45 via-transparent to-white/5 rounded-r-lg pointer-events-none" />

              {/* Realistic Deckle-Edged Paper Block Stack on right side (Simulates thick notebook pages) */}
              <div 
                className="absolute -right-3.5 inset-y-2.5 w-4 bg-gradient-to-r from-[#e3dac9] via-[#f7f2e7] to-[#ede3d1] rounded-r-xs border-y border-r border-[#2d2926]/25 shadow-md pointer-events-none"
                style={{
                  backgroundImage: 'repeating-linear-gradient(180deg, #d8ceb9 0px, #d8ceb9 1.5px, #fdfcf9 2px, #fdfcf9 4px)'
                }}
              />
              {/* Bottom paper page stack peek */}
              <div 
                className="absolute -bottom-2.5 left-4 right-1 h-3 bg-gradient-to-b from-[#e3dac9] to-[#d8ceb9] rounded-b-xs border-x border-b border-[#2d2926]/20 shadow-sm pointer-events-none"
                style={{
                  backgroundImage: 'repeating-linear-gradient(90deg, #d8ceb9 0px, #d8ceb9 1.5px, #fdfcf9 2px, #fdfcf9 4px)'
                }}
              />

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

              {/* Stitched saddle-leather inner border */}
              <div className="absolute inset-3 rounded-r-md border border-dashed border-[#c4a484]/35 pointer-events-none" />

              {/* Gold embossed central border strip */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-16 bg-gradient-to-r from-[#c4a484]/15 via-[#ebd7c4]/30 to-[#c4a484]/15 border-y border-[#c4a484]/50 pointer-events-none flex items-center justify-center shadow-xs">
                <div className="w-full h-[1.5px] bg-[#ebd7c4]/40 my-auto mx-6 shadow-xs" />
              </div>

              {/* Gilded Embossed Typography */}
              <div className="absolute inset-x-0 top-14 flex flex-col items-center justify-center text-center px-6 pointer-events-none select-none">
                {/* Vintage Subtitle Header */}
                <div className="text-xs font-serif uppercase tracking-[0.35em] text-[#c4a484]/80 mb-2">
                  Encrypted Chronicles
                </div>

                {/* Title: Vellichor (Gilded foil relief, locked size) */}
                <h1 
                  className="text-5xl font-serif font-black tracking-[0.12em] bg-gradient-to-b from-[#fffaf0] via-[#eedcc4] to-[#b38a5b] bg-clip-text text-transparent drop-shadow-[0_4px_8px_rgba(0,0,0,0.85)] filter"
                  style={{
                    textShadow: '0 2px 4px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.3)',
                  }}
                >
                  Vellichor
                </h1>

                {/* Decorative Filigree Divider */}
                <div className="flex items-center justify-center gap-3 w-56 my-3 opacity-80">
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c4a484] to-transparent" />
                  <span className="text-[#ebd7c4] text-xs font-serif">❖</span>
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-[#c4a484] to-transparent" />
                </div>
                
                {/* Pen name: Ludwig */}
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-sans text-[#c4a484]/70 uppercase tracking-[0.25em] mb-1">
                    執筆墨客
                  </span>
                  <p 
                    className="text-2xl font-serif italic text-[#ebd7c4] tracking-[0.08em] font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.7)]"
                  >
                    {currentUser.penName || 'Pen Name'}
                  </p>
                </div>
              </div>

              {/* Gold embossed lower shield crest (open book graphic details inside) */}
              <div className="absolute inset-x-0 bottom-10 flex justify-center pointer-events-none opacity-85 group-hover:opacity-100 transition-opacity">
                <svg width="76" height="76" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_3px_5px_rgba(0,0,0,0.6)]">
                  {/* Shield Frame */}
                  <path d="M32 4 L48 14 V32 C48 44, 32 54, 32 54 C32 54, 16 44, 16 32 V14 Z" stroke="#c4a484" strokeWidth="2.4" strokeLinejoin="round" />
                  {/* Miniature open notebook inside shield */}
                  <path d="M22 26 H42 M22 32 H42 M22 38 H34" stroke="#ebd7c4" strokeWidth="2" strokeLinecap="round" />
                  {/* Ink Flask bottle sketch inside */}
                  <path d="M28 20 C28 17, 36 17, 36 20 C36 22, 38 23, 38 25 M38 25 V42 H26 V25 C26 23, 28 22, 28 20 Z" stroke="#ebd7c4" strokeWidth="1.6" fill="none" />
                  <circle cx="32" cy="33" r="3" fill="#c4a484" />
                </svg>
              </div>

              {/* Book Spine ribs simulation overlays with genuine 3D raised leather cords */}
              <div className="absolute left-0 inset-y-0 w-4 bg-gradient-to-r from-black/90 via-black/50 to-transparent rounded-l pointer-events-none flex flex-col justify-around py-12">
                <div className="w-full h-1 bg-[#1a1a1a] shadow-[0_1px_2px_rgba(255,255,255,0.1),0_-1px_2px_rgba(0,0,0,0.8)]" />
                <div className="w-full h-1 bg-[#1a1a1a] shadow-[0_1px_2px_rgba(255,255,255,0.1),0_-1px_2px_rgba(0,0,0,0.8)]" />
                <div className="w-full h-1 bg-[#1a1a1a] shadow-[0_1px_2px_rgba(255,255,255,0.1),0_-1px_2px_rgba(0,0,0,0.8)]" />
                <div className="w-full h-1 bg-[#1a1a1a] shadow-[0_1px_2px_rgba(255,255,255,0.1),0_-1px_2px_rgba(0,0,0,0.8)]" />
              </div>
              
              {/* Soft shining light over the book */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/12 via-transparent to-transparent pointer-events-none rounded-r-lg" />
              
              {/* Quick helper tip */}
              <div className="absolute -bottom-8 inset-x-0 text-center font-serif text-[11px] text-[#2d2926]/75 tracking-widest uppercase animate-pulse">
                點擊書封以翻開隨筆 (Click cover to open)
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="opened-book"
            initial={{ scale: 0.96, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ 
              scale: 0.97, 
              y: 8, 
              opacity: 0,
              transition: { duration: 0.22, ease: [0.32, 0, 0.67, 0] } 
            }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="col-start-1 row-start-1 relative w-full max-w-[960px] xl:max-w-[1000px] 2xl:max-w-[1080px] bg-[#2d2926] rounded-2xl p-3.5 sm:p-4 md:p-5 shadow-[0_32px_75px_rgba(25,20,15,0.45),0_12px_30px_rgba(0,0,0,0.25)] border-t border-[#c4a484]/20 z-10"
            style={{ 
              transformOrigin: 'center center', 
              transformStyle: 'preserve-3d',
              willChange: 'transform, opacity',
            }}
          >
            {/* Outer closed spine thickness representation */}
            <div className="absolute inset-x-0 -bottom-2 h-4 bg-[#1a1a1a] rounded-b-xl shadow-md pointer-events-none" />

            {/* Inner Pages Container with aged leather rim margins */}
            <div className="relative bg-[#f5efe4] rounded-lg shadow-inner py-1 px-1 sm:py-1.5 sm:px-1.5 flex flex-col md:flex-row border-4 border-[#1a1a1a]">
              
              {/* Left/Right splitting spine layout thread gutter (the middle fold) */}
              <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-8 bg-gradient-to-r from-transparent via-black/20 to-transparent pointer-events-none z-10 hidden md:block" />
              {/* Splitting crease line */}
              <div className="absolute left-1/2 -translate-x-1/2 inset-y-0 w-[2px] bg-[#1a1a1a]/25 pointer-events-none z-10 hidden md:block" />

              <div className="w-full min-h-[460px] md:min-h-[540px] xl:min-h-[570px] max-h-[76vh] bg-[#fcfaf7] rounded-md overflow-hidden relative shadow-inner">
                {viewMode === 'open-write' ? (
                  <DiaryWriter
                    currentUser={currentUser}
                    onSave={(newEntry, existingId) => {
                      onSaveEntry(newEntry, existingId);
                      setEditingEntry(null);
                    }}
                    onCancel={() => {
                      setEditingEntry(null);
                      setViewMode(entries.length > 0 ? 'open-search' : 'closed');
                    }}
                    securityLogs={securityLogs}
                    editingEntry={editingEntry}
                  />
                ) : (
                  <DiarySearch
                    entries={entries}
                    currentUser={currentUser}
                    onClose={() => setViewMode('closed')}
                    onDelete={onDeleteEntry}
                    onEdit={(entry) => {
                      setEditingEntry(entry);
                      setViewMode('open-write');
                    }}
                    onNewEntry={() => {
                      setEditingEntry(null);
                      setViewMode('open-write');
                    }}
                    onOpenImportExport={onOpenImportExport}
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
