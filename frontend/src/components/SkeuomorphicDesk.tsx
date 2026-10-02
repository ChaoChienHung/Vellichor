import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, User, ShieldCheck, PenTool, Library, Settings, Info, Bell, Clock, FolderArchive } from 'lucide-react';
import { DiaryEntry, UserProfile, BookViewMode, DatabaseState } from '../types';
import { createEntry, deleteEntry, getState, rekey, updateEntry, updatePenName, getSuggestedUser, apiLogout } from '../utils/api';
import VellichorBook from './VellichorBook';
import UserAccountModal from './UserAccountModal';
import ImportExportModal from './ImportExportModal';
import DeskUnlockModal from './DeskUnlockModal';
import { PenTray3D, WaxSealAndAudit3D, CrystalInkwell3D } from './Stationery3D';

export default function SkeuomorphicDesk() {
  const [dbState, setDbState] = useState<DatabaseState | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [viewMode, setViewMode] = useState<BookViewMode>('closed');
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [importExportTab, setImportExportTab] = useState<'export' | 'import'>('export');
  const [importExportEntry, setImportExportEntry] = useState<DiaryEntry | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [suggestedUser, setSuggestedUser] = useState<string>('');
  
  // Custom interactive notifications overlay
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadState = async () => {
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
      setNeedsAuth(true);
      try {
        const suggested = await getSuggestedUser();
        if (suggested?.username) {
          setSuggestedUser(suggested.username);
        }
      } catch {}
    }
  };

  useEffect(() => {
    loadState();
  }, []);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {}
    setDbState(null);
    setNeedsAuth(true);
    setShowAccountModal(false);
    setViewMode('closed');
    triggerToast("書桌已成功上鎖封緘。");
  };

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

  const handleSaveEntry = async (
    newFields: Omit<DiaryEntry, 'id' | 'signature' | 'createdAt' | 'updatedAt'>,
    existingId?: string
  ) => {
    if (!dbState) return;
    try {
      if (existingId) {
        await updateEntry(existingId, {
          title: newFields.title,
          content: newFields.content,
          date: newFields.date,
          tags: newFields.tags,
          mood: newFields.mood,
        });
        const state = await getState();
        setDbState({
          entries: state.entries,
          currentUser: state.currentUser,
          masterPasswordSet: true,
          securityLogs: dbState.securityLogs,
        });
        triggerToast(`隨筆修訂完成！「${newFields.title}」已重新加密存檔。`);
      } else {
        await createEntry({
          title: newFields.title,
          content: newFields.content,
          date: newFields.date,
          tags: newFields.tags,
          mood: newFields.mood,
        });
        const state = await getState();
        setDbState({
          entries: state.entries,
          currentUser: state.currentUser,
          masterPasswordSet: true,
          securityLogs: dbState.securityLogs,
        });
        triggerToast(`簽署隨筆完成！「${newFields.title}」已安全裝訂入 Vellichor 本。`);
      }
      setViewMode('open-search');
    } catch (e) {
      triggerToast("儲存失敗：請確認已登入，或稍後重試。");
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

  const handleOpenImportExport = (tab: 'export' | 'import' = 'export', entry?: DiaryEntry) => {
    setImportExportTab(tab);
    setImportExportEntry(entry);
    setShowImportExportModal(true);
  };

  const handleImportComplete = async () => {
    try {
      const state = await getState();
      setDbState({
        entries: state.entries,
        currentUser: state.currentUser,
        masterPasswordSet: true,
        securityLogs: dbState ? dbState.securityLogs : [],
      });
      triggerToast("匯入完成！日記檔案已全數加密裝訂入庫。");
    } catch (e) {
      triggerToast("更新日記目錄失敗，請重整頁面。");
    }
  };

  if (!dbState && !needsAuth) {
    return (
      <div className="relative min-h-screen bg-[#e5e1da] text-[#1a1a1a] font-serif overflow-hidden select-none flex items-center justify-center">
        <div className="text-xs font-sans text-[#2d2926]/70 tracking-widest uppercase">調取密文書桌中…</div>
      </div>
    );
  }

  const currentUserProfile: UserProfile = dbState
    ? dbState.currentUser
    : {
        username: suggestedUser || 'Ludwig',
        penName: suggestedUser || 'Ludwig',
        isLoggedIn: false,
      };

  const currentEntries = dbState ? dbState.entries : [];

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
              歡迎回來，執筆墨客 &nbsp;•&nbsp; 簽名: <strong>{currentUserProfile.penName}</strong>
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

            {/* Import / Export action button */}
            <button
              onClick={() => handleOpenImportExport('export')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fcfaf7] hover:bg-[#f4efe6] hover:scale-[1.02] active:scale-95 text-[#2d2926] rounded border border-[#2d2926]/20 font-serif text-xs uppercase tracking-wider transition-all shadow-xs cursor-pointer"
              title="隨筆備份與匯出匯入 (Export & Import)"
            >
              <FolderArchive className="w-3.5 h-3.5 text-[#8b5e3c]" />
              <span>隨筆匯入 / 匯出</span>
            </button>

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
        <main className="w-full flex-1 max-w-[1560px] mx-auto px-3 sm:px-5 md:px-8 py-3 md:py-6 flex flex-col justify-center relative">
          
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
          <div className={`relative w-full z-10 flex flex-col lg:flex-row items-center justify-center ${
            viewMode !== 'closed' 
              ? 'gap-3 sm:gap-4 md:gap-5 xl:gap-8 2xl:gap-12' 
              : 'gap-6 lg:gap-8 xl:gap-12'
          } my-auto transition-all duration-300`}>
            
            {/* ========================================== */}
            {/* LEFT ELEMENT: 3D SOLID CARVED PEN TRAY (DRAFT) */}
            {/* ========================================== */}
            <div className="relative flex flex-row lg:flex-col items-center justify-center select-none shrink-0 pointer-events-auto scale-80 sm:scale-85 md:scale-90 xl:scale-95 2xl:scale-100 origin-center transition-transform duration-300">
              <PenTray3D onDraftClick={handlePenClick} />
            </div>


            {/* ========================================== */}
            {/* CENTER ELEMENT: THE MASTER VELLICHOR BOOK */}
            {/* ========================================== */}
            <div className="relative flex-1 min-w-0 flex justify-center items-center w-full max-w-[980px] xl:max-w-[1020px] 2xl:max-w-[1100px]">
              
              {/* BOOKMARK TASSEL AT TOP (Clickable tab to see list/search pages) */}
              <div className="absolute -top-10 left-1/2 -translate-x-[90px] w-14 flex flex-col items-center select-none z-30 pointer-events-auto">
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
                entries={currentEntries}
                currentUser={currentUserProfile}
                securityLogs={dbState ? dbState.securityLogs : []}
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
                onOpenImportExport={handleOpenImportExport}
              />
            </div>


            {/* ========================================== */}
            {/* RIGHT ELEMENT: 3D WAX SEAL (AUDIT) & 3D CRYSTAL INKWELL (INK) */}
            {/* ========================================== */}
            <div className="relative flex flex-row lg:flex-col items-center justify-center gap-2.5 sm:gap-3.5 xl:gap-5 select-none shrink-0 pointer-events-auto scale-80 sm:scale-85 md:scale-90 xl:scale-95 2xl:scale-100 origin-center transition-transform duration-300">
              {/* 1. 3D Wax Seal & Turned Wood Brass Stamp (Audit) */}
              <WaxSealAndAudit3D
                onAuditClick={() => {
                  setShowAccountModal(true);
                  triggerToast("已解印封泥：調閱執筆者主命鑰審計證書。");
                }}
              />

              {/* 2. 3D Faceted Crystal Inkwell (Ink) */}
              <CrystalInkwell3D
                onInkClick={() => triggerToast("書寫沙沙：墨香四溢。這瓶「Essence of Time」存留著時間凝結在紙頁上的印跡。")}
              />
            </div>

          </div>

      </main>


      {/* ========================================== */}
      {/* SECURITY CONTROLS DIALOG MODAL / OVERLAY */}
      {/* ========================================== */}
      <AnimatePresence>
        {showAccountModal && (
          <UserAccountModal
            currentUser={currentUserProfile}
            securityLogs={dbState ? dbState.securityLogs : []}
            onUpdateUser={handleUpdateUserProfile}
            onRekey={handleRekey}
            onLogout={handleLogout}
            onClose={() => setShowAccountModal(false)}
          />
        )}
        {showImportExportModal && (
          <ImportExportModal
            entries={currentEntries}
            currentUser={currentUserProfile}
            defaultTab={importExportTab}
            selectedEntry={importExportEntry}
            onClose={() => setShowImportExportModal(false)}
            onImportComplete={handleImportComplete}
          />
        )}
        <DeskUnlockModal
          isOpen={needsAuth}
          suggestedUsername={suggestedUser}
          onSuccess={() => {
            loadState();
            triggerToast("隨筆解鎖成功：歡迎歸來，執筆墨客。");
          }}
        />
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
