import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, User, ShieldCheck, PenTool, Library, Settings, Info, Bell, Clock } from 'lucide-react';
import { DiaryEntry, UserProfile, BookViewMode, DatabaseState } from '../types';
import { createEntry, deleteEntry, getState, rekey, updatePenName } from '../utils/api';
import VellichorBook from './VellichorBook';
import UserAccountModal from './UserAccountModal';

export default function SkeuomorphicDesk() {
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [viewMode, setViewMode] = useState<BookViewMode>('closed');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');
  
  // Custom interactive notifications overlay
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const layoutTransition = {
    type: 'spring' as const,
    stiffness: 220,
    damping: 28,
    mass: 0.9,
  };

  useEffect(() => {
    (async () => {
      try {
        const state = await getState();
        setDbState({
          entries: state.entries,
          currentUser: state.currentUser,
          masterPasswordSet: true,
          securityLogs: [],
        });
        setNeedsAuth(false);
      } catch (e: any) {
        if (String(e?.message || '') === 'not_authenticated') {
          setNeedsAuth(true);
          setDbState(null);
          return;
        }
        setNeedsAuth(true);
        setDbState(null);
      }
    })();
  }, []);

  // Synchronize time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString('zh-TW', { hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // Click Bookmark -> triggers Slide/Flip open to Archive Ledger search page
  const handleBookmarkClick = () => {
    if (viewMode === 'open-search') {
      setViewMode('closed');
      triggerToast("闔書：回憶隨筆已安全收納於皮夾封套中。");
    } else {
      setViewMode('open-search');
      triggerToast("開書中：正在依據編目調取加密的隨筆 Ledger。");
    }
  };

  // Click Pen -> triggers Open to Writing New Page
  const handlePenClick = () => {
    if (viewMode === 'open-write') {
      setViewMode('closed');
      triggerToast("收回筆墨：返回書桌場景。");
    } else {
      setViewMode('open-write');
      triggerToast("執筆研墨：已開啟全新空白之頁，準備寫作。");
    }
  };

  const handleSaveEntry = async (newFields: Omit<DiaryEntry, 'id' | 'signature' | 'createdAt' | 'updatedAt'>) => {
    if (!dbState) return;
    try {
      await createEntry({ title: newFields.title, content: newFields.content, date: newFields.date });
      const state = await getState();
      setDbState({
        entries: state.entries,
        currentUser: state.currentUser,
        masterPasswordSet: true,
        securityLogs: dbState.securityLogs,
      });
      triggerToast(`簽署隨筆完成！「${newFields.title}」已安全裝訂入 Vellichor 本。`);
      setTimeout(() => setViewMode('closed'), 900);
    } catch (e) {
      triggerToast("寫入失敗：請確認已登入，或稍後重試。");
    }
  };

  // Delete diary page
  const handleDeleteEntry = async (entryId: string) => {
    if (!dbState) return;
    const item = dbState.entries.find((e) => e.id === entryId);
    const titleText = item ? item.title : '隨筆';
    try {
      await deleteEntry(entryId);
      const state = await getState();
      setDbState({
        entries: state.entries,
        currentUser: state.currentUser,
        masterPasswordSet: true,
        securityLogs: dbState.securityLogs,
      });
      triggerToast(`已移除「${titleText}」。`);
    } catch (e) {
      triggerToast("刪除失敗：請稍後重試。");
    }
  };

  // Update user profile properties
  const handleUpdateUserProfile = async (updatedFields: Partial<UserProfile>) => {
    if (!dbState) return;
    const pn = (updatedFields.penName || '').trim();
    if (!pn) return;
    try {
      await updatePenName(pn);
      const state = await getState();
      setDbState({
        entries: state.entries,
        currentUser: state.currentUser,
        masterPasswordSet: true,
        securityLogs: dbState.securityLogs,
      });
      triggerToast(`筆跡章印已重構，往後將以「${pn}」手簽。`);
    } catch (e) {
      triggerToast("更新失敗：請稍後重試。");
    }
  };

  const handleRekey = async (oldPass: string, newPass: string): Promise<boolean> => {
    if (!dbState) return false;
    try {
      await rekey(oldPass, newPass);
      const state = await getState();
      setDbState({
        entries: state.entries,
        currentUser: state.currentUser,
        masterPasswordSet: true,
        securityLogs: dbState.securityLogs,
      });
      triggerToast("主密碼已更新：所有日記已重新加密。");
      return true;
    } catch (e) {
      triggerToast("主密碼更新失敗：請確認舊密碼正確。");
      return false;
    }
  };

  if (needsAuth) {
    return (
      <div className="relative min-h-screen bg-[#e5e1da] text-[#1a1a1a] font-serif overflow-hidden select-none flex items-center justify-center px-6">
        <div className="w-full max-w-lg bg-[#fcfaf7]/75 backdrop-blur-xs border border-[#2d2926]/15 rounded-xl shadow-[0_24px_60px_rgba(45,41,38,0.25)] p-6">
          <div className="text-xl font-bold tracking-tight text-[#2d2926]">Vellichor</div>
          <div className="text-xs text-[#2d2926]/65 font-sans mt-1">需要登入後才能開啟你的書桌。</div>
          <div className="mt-5 flex gap-3">
            <a
              className="px-4 py-2 bg-[#2d2926] text-[#fcfaf7] rounded border border-[#2d2926]/30 font-serif text-xs uppercase tracking-wider"
              href="/login"
            >
              Login
            </a>
            <a className="px-4 py-2 bg-[#fcfaf7] text-[#2d2926] rounded border border-[#2d2926]/20 font-serif text-xs uppercase tracking-wider" href="/signup">
              Sign up
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (!dbState) {
    return (
      <div className="relative min-h-screen bg-[#e5e1da] text-[#1a1a1a] font-serif overflow-hidden select-none flex items-center justify-center">
        <div className="text-xs font-sans text-[#2d2926]/70">載入中…</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#e5e1da] text-[#1a1a1a] font-serif overflow-hidden select-none flex flex-col justify-between">
      
      {/* 1. SKEUOMORPHIC DESK CONTAINER */}
      {/* Editorial aesthetic desk background */}
      <div className="absolute inset-0 bg-[#e5e1da] bg-gradient-to-b from-[#dbd7cf] to-[#e5e1da] [background-image:linear-gradient(90deg,rgba(45,41,38,0.015)_50%,transparent_50%),linear-gradient(rgba(45,41,38,0.015)_50%,transparent_50%)] [background-size:24px_24px] pointer-events-none" />

      {/* Subtle organic texture blend */}
      <div 
        className="absolute inset-0 bg-repeat opacity-15 mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(ellipse_at_center, transparent 40%, rgba(45,41,38,0.3) 100%)',
        }}
      />

      {/* CAST-LIGHT LAMP HOOD (Focal elegant spotlighting) */}
      <div className="absolute -top-[15%] -left-[10%] w-[70%] h-[75%] bg-[radial-gradient(circle_at_center,_rgba(252,250,247,0.5)_0%,_rgba(252,250,247,0.15)_50%,_rgba(0,0,0,0)_100%)] rounded-full blur-[45px] pointer-events-none z-10" />

      {/* ========================================== */}
      {/* TOP DESK HEADER BAR */}
      {/* ========================================== */}
      <header className="relative w-full z-20 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#2d2926]/12 bg-[#fcfaf7]/50 backdrop-blur-xs select-none">
        
        {/* Editorial style logo title */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-md bg-[#2d2926] text-[#fcfaf7] flex items-center justify-center shadow-md border border-[#2d2926]/20">
            <span className="font-serif font-bold text-lg">V</span>
          </div>
          <div>
            <span className="text-base font-serif font-bold tracking-tight text-[#2d2926] flex items-center gap-1.5">
              <span>Vellichor</span>
              <span className="bg-[#2d2926]/5 text-[#2d2926] text-[10px] font-sans font-medium px-1.5 py-0.5 rounded border border-[#2d2926]/15">
                ● AES-256 Offline
              </span>
            </span>
            <p className="text-[10.5px] text-[#2d2926]/60 font-sans tracking-wider truncate">
              歡迎回來，執筆墨客 &nbsp;•&nbsp; 簽名: <strong>{dbState.currentUser.penName}</strong>
            </p>
          </div>
        </div>

        {/* Desk Utilities controls */}
        <div className="flex items-center gap-3">
          {/* Time counter */}
          <div className="hidden md:flex items-center gap-1 bg-[#fcfaf7]/70 px-2.5 py-1 rounded border border-[#2d2926]/10 font-sans text-[10.5px] text-[#2d2926]/80">
            <Clock className="w-3.5 h-3.5 text-[#c4a484]" />
            <span>當前時刻: {currentTime || '載入中'}</span>
          </div>

          {/* Credentials lock seal icon */}
          <button
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2d2926] hover:bg-[#1a1a1a] hover:scale-[1.02] active:scale-95 text-[#fcfaf7] rounded border border-[#2d2926]/30 font-serif text-xs uppercase tracking-wider transition-all shadow-md cursor-pointer"
          >
            <User className="w-3.5 h-3.5 text-[#c4a484]" />
            <span>執筆人證</span>
          </button>
        </div>
      </header>


      {/* ========================================== */}
      {/* MAIN DESK PLATFORM (BOOK & STATIONERIES) */}
      {/* ========================================== */}
      <main className="w-full flex-1 max-w-7xl mx-auto px-4 py-8 flex flex-col justify-center relative">
        
        {/* PARCHMENT SHEETS & SKETCHES UNDER THE BOOK EDGES */}
        {/* Slipped premium papers with sketched blueprint layout */}
        <div className="absolute left-1/2 -translate-x-1/2 top-11 md:top-24 w-[360px] md:w-[460px] pointer-events-none select-none z-0">
          
          {/* Slipped sheet 1 (angled left) */}
          <div className="absolute left-4 -top-8 w-[240px] h-[160px] bg-[#fcfaf7] border border-[#2d2926]/12 rounded-sm shadow-md transform -rotate-12 opacity-80 flex flex-col justify-between p-3 select-none">
            <div className="text-[9px] font-sans text-[#2d2926]/40 uppercase tracking-widest">Sketch Map - Manuscript 18</div>
            <div className="flex-1 flex items-center justify-center opacity-20 mt-1">
              {/* Fine line sketch layout of a building or mechanism */}
              <svg className="w-36 h-20 text-[#2d2926]" viewBox="0 0 100 50" fill="none" stroke="currentColor" strokeWidth="0.5">
                <rect x="10" y="5" width="80" height="40" />
                <line x1="10" y1="5" x2="90" y2="45" />
                <line x1="90" y1="5" x2="10" y2="45" />
                <circle cx="50" cy="25" r="15" />
                <circle cx="50" cy="25" r="5" />
              </svg>
            </div>
            <div className="text-[9px] font-serif text-[#c4a484] italic text-right">A genuine reflection</div>
          </div>

          {/* Slipped sheet 2 (angled right) */}
          <div className="absolute right-4 top-14 w-[280px] h-[180px] bg-[#fcfaf7] border border-[#2d2926]/12 rounded-sm shadow-lg transform rotate-6 opacity-90 flex flex-col justify-between p-3 select-none">
            <div className="text-[9.5px] font-sans text-[#2d2926]/40 uppercase tracking-widest">Vellichor Layout Ledger Schematic</div>
            <div className="flex-1 flex items-center justify-center opacity-25 mt-1">
              {/* Sketch of library shelves as per the picture */}
              <svg className="w-44 h-24 text-[#2d2926]" viewBox="0 0 120 60" fill="none" stroke="currentColor" strokeWidth="0.5">
                <line x1="5" y1="5" x2="115" y2="5" />
                <line x1="5" y1="20" x2="115" y2="20" />
                <line x1="5" y1="35" x2="115" y2="35" />
                <line x1="5" y1="50" x2="115" y2="50" />
                {/* Vertical lines shelf partitions */}
                <line x1="20" y1="5" x2="20" y2="50" />
                <line x1="45" y1="5" x2="45" y2="50" />
                <line x1="75" y1="5" x2="75" y2="50" />
                <line x1="100" y1="5" x2="100" y2="50" />
                {/* Book spines drawn roughly */}
                <rect x="23" y="8" width="6" height="10" fill="currentColor" fillOpacity="0.1" />
                <rect x="29" y="7" width="5" height="11" fill="currentColor" fillOpacity="0.2" />
                <rect x="80" y="23" width="7" height="10" fill="currentColor" fillOpacity="0.1" />
                <rect x="87" y="21" width="8" height="12" fill="currentColor" fillOpacity="0.3" />
              </svg>
            </div>
            <div className="text-[8.5px] font-sans text-[#c4a484] italic text-right">"Chronon-Shield" derived kdf security</div>
          </div>
        </div>

        {/* T-JUNCTION OR INTERACTION COLUMNS (Pens Tray left, Bookmark Top, Ink Bottle right) */}
        <motion.div
          layout="position"
          transition={layoutTransition}
          className="relative w-full z-10 flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-8 my-2"
        >
          
          {/* ========================================== */}
          {/* LEFT ELEMENT: PEN STATIONERY TRAY (鋼筆托盤) */}
          {/* ========================================== */}
          <motion.div
            layout="position"
            transition={layoutTransition}
            className="relative lg:static flex flex-row lg:flex-col items-center justify-center select-none shrink-0 pointer-events-auto"
          >
            {/* Elegant metal/wood tray plate */}
            <div className="relative w-44 h-16 lg:w-18 lg:h-52 bg-gradient-to-b from-[#2d2926]/12 to-[#2d2926]/5 rounded-2xl border-2 border-[#2d2926]/20 shadow-[inset_1px_2px_12px_rgba(45,41,38,0.2),2px_4px_8px_rgba(45,41,38,0.08)] flex flex-row lg:flex-col items-center justify-around p-2">
              
              {/* 1. VINTAGE BRASS FOUNTAIN PEN (Clickable tool - starts new page) */}
              <button
                onClick={handlePenClick}
                title="執起鋼筆：開始寫新日記 (Click to draft new entry)"
                className="group relative cursor-pointer flex flex-col items-center focus:outline-none focus:ring-0 active:scale-95"
              >
                {/* Pen shadow */}
                <div className="absolute left-1 lg:left-0 top-6 lg:top-auto lg:-left-2 w-28 h-3 lg:w-3 lg:h-32 bg-black/20 blur-xs rounded-full pointer-events-none group-hover:translate-x-1 group-hover:translate-y-1 transition-all" />
                
                {/* The visual pen body matching reference: Mahogany wooden body with brass nib */}
                <div className="relative w-32 h-4 lg:w-4 lg:h-36 rounded-full bg-gradient-to-r lg:bg-gradient-to-b from-[#2d2926] via-[#c4a484] to-[#2d2926] border border-[#2d2926] flex items-center justify-start lg:justify-end overflow-hidden transform lg:rotate-0 rotate-180 group-hover:-translate-y-1 transition-transform cursor-pointer">
                  {/* Brass body tip band */}
                  <div className="absolute inset-y-0 right-2 lg:inset-x-0 lg:bottom-10 h-full w-2 lg:w-full lg:h-2 bg-gradient-to-r lg:bg-gradient-to-b from-[#c4a484] to-[#dbd7cf] border-y lg:border-x border-[#2d2926]/40" />
                  {/* Pen highlight shining */}
                  <div className="absolute inset-y-0 left-1 lg:inset-x-1 w-0.5 lg:h-full bg-[#fcfaf7]/20 blur-xs rounded-full" />
                </div>

                {/* Exquisite nib element on bottom edge for visual authenticity */}
                <div className="mt-1 hidden lg:block transform group-hover:-translate-y-1 transition-transform">
                  <svg width="14" height="20" viewBox="0 0 24 36" fill="none">
                    <path d="M12 0 L18 16 L20 28 L12 36 L4 28 L6 16 Z" fill="url(#goldGrad)" stroke="#2d2926" strokeWidth="1" />
                    <line x1="12" y1="0" x2="12" y2="28" stroke="#2d2926" strokeWidth="1.2" />
                    <circle cx="12" cy="22" r="1.5" fill="#2d2926" />
                    <defs>
                      <linearGradient id="goldGrad" x1="4" y1="0" x2="20" y2="36">
                        <stop offset="0%" stopColor="#c4a484" />
                        <stop offset="50%" stopColor="#ebd7c4" />
                        <stop offset="100%" stopColor="#2d2926" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>

                {/* Pulsing indicator tag */}
                <div className="absolute -top-3 lg:-top-6 bg-[#2d2926] text-[#fcfaf7] rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sans font-bold select-none border border-[#c4a484]/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  執筆 (Draft)
                </div>
              </button>

              {/* 2. WHITE BONE LETTER OPENER (Decorative skeuomorphism) */}
              <div 
                onClick={() => triggerToast("此為精雕象牙骨質裁紙刀，用於裁切古舊文稿的紙頁。")}
                title="精雕骨裁刀 (Ivory letter opener)"
                className="group relative cursor-pointer"
              >
                {/* Shadow */}
                <div className="absolute left-1 lg:left-0 top-5 lg:top-auto lg:-left-2 w-28 h-2 lg:w-2 lg:h-28 bg-[#2d2926]/12 blur-xs rounded-full pointer-events-none" />
                
                {/* Opener Body */}
                <div className="relative w-28 h-3.5 lg:w-3.5 lg:h-32 bg-[#fcfaf7] border border-[#2d2926]/15 rounded-r-full rounded-l-md shadow-inner flex items-center justify-between px-1">
                  <div className="w-1 h-8 bg-[#2d2926]/10 rounded-full" />
                  {/* Bone carvings textures */}
                  <div className="flex-1 text-[8px] font-sans text-[#2d2926]/20 text-center select-none tracking-widest hidden lg:block">IVORY</div>
                </div>
              </div>
            </div>

            {/* Hint subtitle */}
            <div className="hidden lg:block absolute -bottom-5 text-center w-full text-[9px] font-sans font-semibold tracking-wider text-[#2d2926]/40 uppercase">
              長盤鋼筆 (Pen Tray)
            </div>
          </motion.div>


          {/* ========================================== */}
          {/* CENTER ELEMENT: THE MASTER VELLICHOR BOOK */}
          {/* ========================================== */}
          <motion.div
            layout="position"
            transition={layoutTransition}
            className={viewMode === 'closed' ? "relative flex-1 max-w-[580px]" : "relative flex-1 max-w-[1040px]"}
          >
            
            {/* BOOKMARK TASSEL AT TOP (Clickable tab to see list/search pages) */}
            <div className="absolute -top-10 left-1/2 -translate-x-[90px] w-14 flex flex-col items-center select-none z-10 pointer-events-auto">
              <button
                onClick={handleBookmarkClick}
                title="滑拉皮革書籤：通往目錄搜尋 Ledger (Click to browse list)"
                className="group cursor-pointer flex flex-col items-center focus:outline-none active:translate-y-1 transition-transform"
              >
                {/* Ribbon band sticking straight up out of the book cover */}
                <div className="w-6 h-12 bg-[#2d2926] rounded-t-xs flex items-center justify-center shadow-md border-x border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors cursor-pointer select-none">
                  {/* Beautiful gold monogram icon stamped on leather ribbon */}
                  <span className="text-[10px] text-[#c4a484] font-serif font-bold group-hover:scale-105 transition-transform select-none">L</span>
                </div>
                
                {/* Thick bundle of leather fringes dangling down (the tassel from reference image) */}
                <div className="w-3.5 h-[2px] bg-[#1a1a1a]" />
                <div className="flex flex-col items-stretch w-5 group-hover:brightness-110">
                  <div className="h-6 bg-gradient-to-b from-[#2d2926] via-[#c4a484] to-[#1a1a1a] rounded-b shadow" />
                  {/* Micro string tassels */}
                  <div className="h-2 flex justify-between px-[2px] opacity-80">
                    <span className="w-[1.5px] h-full bg-[#1a1a1a] rounded-full" />
                    <span className="w-[1.5px] h-full bg-[#c4a484] rounded-full" />
                    <span className="w-[1.5px] h-full bg-[#1a1a1a] rounded-full" />
                    <span className="w-[1.5px] h-full bg-[#c4a484] rounded-full" />
                    <span className="w-[1.5px] h-full bg-[#1a1a1a] rounded-full" />
                  </div>
                </div>

                <div className="absolute -top-6 bg-[#2d2926] text-[#fcfaf7] rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sans font-bold select-none border border-[#c4a484]/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  書籤 (Ledger)
                </div>
              </button>
            </div>

            {/* THE BOOK EMBEDDED COMPONENT */}
            <VellichorBook
              viewMode={viewMode}
              entries={dbState.entries}
              currentUser={dbState.currentUser}
              securityLogs={dbState.securityLogs}
              setViewMode={(mode) => {
                setViewMode(mode);
                if (mode !== 'closed') {
                  const label = mode === 'open-write' ? '裝訂隨筆頁面' : '查詢隨筆帳冊';
                  triggerToast(`已對折展開書頁：進駐「${label}」`);
                } else {
                  triggerToast("已安全闔上 Vellichor 密文隨筆本。");
                }
              }}
              onSaveEntry={handleSaveEntry}
              onDeleteEntry={handleDeleteEntry}
            />
          </motion.div>


          {/* ========================================== */}
          {/* RIGHT ELEMENT: INK BOTTLE & WAX SEAL (墨水瓶與蠟封印章) */}
          {/* ========================================== */}
          <motion.div
            layout="position"
            transition={layoutTransition}
            className="relative flex flex-row lg:flex-col items-center justify-center gap-10 lg:gap-14 select-none shrink-0 pointer-events-auto"
          >
            
            {/* 1. DEEP CHERRY RED WAX-SEAL PRE-IMPRINTED ON PARCHMENT (蠟封戳印 - Clickable logs/accounts modal) */}
            <button
              onClick={() => {
                setShowAccountModal(true);
                triggerToast("已解印封泥：調閱執筆者主命鑰審計證書。");
              }}
              title="蠟封印記：點擊展開主控審計日誌 (Click to see safety certificate)"
              className="group relative flex flex-col items-center focus:outline-none focus:ring-0 active:scale-95 cursor-pointer"
            >
              {/* Wax Shadow */}
              <div className="absolute -inset-1 bg-[#2d2926]/20 blur-xs rounded-full pointer-events-none group-hover:translate-x-1 group-hover:translate-y-1 transition-all" />
              
              {/* Vintage Wax Seal medallion from photo using editorial #8b5e3c and #a65d5d */}
              <div className="relative w-16 h-16 rounded-full bg-[#8b5e3c] border-2 border-[#5a4231] shadow-[inset_1px_2px_8px_rgba(255,255,255,0.35),2px_4px_10px_rgba(45,41,38,0.25)] flex items-center justify-center transform group-hover:rotate-6 transition-transform select-none cursor-pointer">
                {/* Edge drip texture wax contours */}
                <div className="absolute inset-1 rounded-full border border-dashed border-[#fcfaf7]/15 pointer-events-none" />
                <div className="absolute w-12 h-12 rounded-full bg-[#a65d5d] border border-[#7a3b3b] fill-none flex items-center justify-center">
                  {/* Embossed Monogram V */}
                  <span className="font-serif font-bold text-2xl text-[#fcfaf7] drop-shadow-[0_-1px_1px_rgba(0,0,0,0.4)] [text-shadow:_0_1.5px_2px_rgb(0_0_0_/_40%)] select-none">
                    V
                  </span>
                </div>
              </div>

              {/* Stamp wood handle stand right next to seal */}
              <div className="absolute -right-6 -bottom-4 pointer-events-none hidden lg:block opacity-75 group-hover:opacity-100 transition-opacity">
                <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
                  {/* Brass element */}
                  <path d="M 4 28 L 20 28 L 20 24 L 4 24 Z" fill="#c4a484" stroke="#2d2926" strokeWidth="0.5" />
                  <path d="M 6 24 C 6 12, 18 12, 18 24 Z" fill="url(#woodGrad)" />
                  <circle cx="12" cy="7" r="4.5" fill="url(#woodGrad)" stroke="#2d2926" strokeWidth="0.5" />
                  <defs>
                    <linearGradient id="woodGrad" x1="4" y1="0" x2="20" y2="28">
                      <stop offset="0%" stopColor="#2d2926" />
                      <stop offset="60%" stopColor="#8b5e3c" />
                      <stop offset="100%" stopColor="#1a1a1a" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              <div className="absolute -top-6 bg-[#2d2926] text-[#fcfaf7] rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sans font-bold select-none border border-[#c4a484]/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                安全證章 (Audit)
              </div>
            </button>


            {/* 2. "ESSENCE OF TIME" VINTAGE INK BOTTLE (時光墨水) */}
            <div
              onClick={() => triggerToast("書寫沙沙：墨香四溢。這瓶「Essence of Time」存留著時間凝結在紙頁上的印跡。")}
              title="Essence of Time 復古木墨瓶"
              className="group relative flex flex-col items-center cursor-pointer"
            >
              {/* Bottle Shadow */}
              <div className="absolute -left-1 top-8 w-14 h-12 bg-[#2d2926]/30 blur-xs rounded-full pointer-events-none group-hover:translate-x-1 group-hover:translate-y-1 transition-all" />
              
              {/* Glass Bottle Body with a label pasted on front */}
              <div className="relative w-14 h-16 bg-gradient-to-b from-[#2d2926]/30 via-[#2d2926]/90 to-[#1a1a1a] rounded-lg border border-[#2d2926] shadow-[inset_1px_2px_4px_rgba(255,255,255,0.1),2px_5px_12px_rgba(45,41,38,0.4)] hover:scale-105 transition-transform flex flex-col items-center pb-1 pt-2 select-none cursor-pointer">
                {/* Little bottle brass neck stopper cap */}
                <div className="absolute -top-3 w-7 h-3 rounded-t-sm bg-gradient-to-r from-[#ebd7c4] via-[#c4a484] to-[#8b5e3c] border-x border-t border-[#2d2926]" />
                <div className="absolute -top-1 w-6 h-1.5 bg-[#1a1a1a]" />

                {/* PASTE BOARD LABEL ("Essence of Time") */}
                <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[84%] bg-[#fcfaf7] rounded border border-[#2d2926]/20 px-1 py-1 text-center select-none shadow-[#2d2926]_1px_1px_2px">
                  <div className="text-[7.5px] font-sans leading-none scale-90 text-[#2d2926]/45 tracking-tighter">ESSENCE OF</div>
                  <div className="text-[8px] font-serif font-bold text-[#1a1a1a] leading-none mt-0.5 tracking-tight">TIME</div>
                  <div className="w-[80%] h-[0.5px] bg-[#c4a484]/40 mx-auto my-[2px]" />
                  <div className="text-[6.5px] font-sans leading-none scale-85 text-[#2d2926]/70 truncate">Nostalgia</div>
                </div>

                {/* Volume fill indicator indicator */}
                <div className="absolute bottom-1 text-[8px] tracking-tight font-sans text-white/45 select-none scale-90">35ml</div>
              </div>

              <div className="absolute -top-6 bg-[#2d2926] text-[#fcfaf7] rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider font-sans font-bold select-none border border-[#c4a484]/40 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                墨水瓶 (Ink)
              </div>
            </div>

          </motion.div>

        </motion.div>

      </main>


      {/* ========================================== */}
      {/* SECURITY CONTROLS DIALOG MODAL / OVERLAY */}
      {/* ========================================== */}
      <AnimatePresence>
        {showAccountModal && (
          <UserAccountModal
            currentUser={dbState.currentUser}
            securityLogs={dbState.securityLogs}
            onUpdateUser={handleUpdateUserProfile}
            onRekey={handleRekey}
            onClose={() => setShowAccountModal(false)}
          />
        )}
      </AnimatePresence>


      {/* ========================================== */}
      {/* POPUP TOAST SYSTEM */}
      {/* ========================================== */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 22, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 100, damping: 15 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 bg-[#2d2926] text-[#fcfaf7] border border-[#c4a484]/30 text-xs font-serif font-semibold rounded-lg shadow-2xl tracking-wide max-w-sm"
          >
            <Bell className="w-4 h-4 text-[#c4a484] shrink-0 animate-bounce" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>


      {/* ========================================== */}
      {/* BOTTOM FOOTER STATUS */}
      {/* ========================================== */}
      <footer className="relative w-full z-10 py-3 text-center border-t border-[#2d2926]/10 bg-[#fcfaf7]/20 font-serif text-[11px] text-[#2d2926]/65 tracking-wider select-none">
        <div>
          Vellichor — 紙墨時光，密文相伴「以 PBKDF2 和 AES-256-GCM 離線守護每一頁記憶」
        </div>
      </footer>

    </div>
  );
}
