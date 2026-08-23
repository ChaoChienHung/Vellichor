import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Calendar, ShieldCheck, Eye, EyeOff, Hash, Trash2, Library, ChevronLeft, ChevronRight } from 'lucide-react';
import { DiaryEntry, UserProfile } from '../types';

interface DiarySearchProps {
  entries: DiaryEntry[];
  currentUser: UserProfile;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function DiarySearch({ entries, currentUser, onClose, onDelete }: DiarySearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateQuery, setDateQuery] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(
    entries.length > 0 ? entries[entries.length - 1].id : null
  );
  
  // Show plaintext content vs ciphertext blocks
  const [revealCiphertexts, setRevealCiphertexts] = useState<Record<string, boolean>>({});

  // Pagination for search results (Left page items list string)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 3;

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const decryptedContent = entry.content || '';
    
    const matchesSearch = 
      entry.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      decryptedContent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesDate = !dateQuery || entry.date === dateQuery;
    
    return matchesSearch && matchesDate;
  });

  // Calculate pages
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const paginatedEntries = filteredEntries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const selectedEntry = entries.find(e => e.id === selectedEntryId) || filteredEntries[0];

  const getDecryptedContent = (entry: DiaryEntry) => {
    if (entry.content) return entry.content;
    return '';
  };

  const getSlippedSnippet = (entry: DiaryEntry, query: string) => {
    const text = getDecryptedContent(entry);
    if (!query) {
      return text.length > 60 ? text.substring(0, 60) + '...' : text;
    }
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) {
      return text.length > 60 ? text.substring(0, 60) + '...' : text;
    }
    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + 40);
    let snippet = text.substring(start, end);
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  };

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === highlight.toLowerCase() 
            ? <mark key={i} className="bg-[#c4a484]/30 text-[#1a1a1a] px-0.5 rounded font-semibold underline decoration-[#c4a484]">{part}</mark> 
            : <span key={i}>{part}</span>
        )}
      </span>
    );
  };

  const toggleRevealCiphertext = (id: string) => {
    setRevealCiphertexts(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="w-full h-full text-[#1a1a1a] flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-[#2d2926]/10" style={{ fontFamily: '"Noto Serif TC", serif' }}>
      
      {/* LEFT PAGE: Ledger Index, Filters & Snippets list */}
      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-[#fcfaf7] relative rounded-l-md overflow-y-auto max-h-[80vh] md:max-h-[640px]">
        {/* Page binding shadow */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-r from-transparent to-[#2d2926]/5 pointer-events-none" />

        <div className="space-y-4">
          <div className="border-b border-[#2d2926]/10 pb-2">
            <h2 className="text-xl font-bold tracking-tight text-[#1a1a1a] flex items-center gap-2">
              <Library className="w-5 h-5 text-[#c4a484]" />
              <span>隨筆歷史編目</span>
            </h2>
            <p className="text-xs text-[#2d2926]/60 font-sans mt-0.5 uppercase tracking-wider font-medium">
              Vellichor Encrypted Ledger Logs ({filteredEntries.length} 篇)
            </p>
          </div>

          {/* Search Inputs Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="relative flex items-center bg-[#fcfaf7] border border-[#2d2926]/15 rounded px-2.5 py-1.5 focus-within:border-[#2d2926]">
              <Search className="w-3.5 h-3.5 text-[#2d2926]/40 mr-2 shrink-0" />
              <input
                type="text"
                placeholder="搜尋關鍵字或標籤..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs w-full text-[#1a1a1a] p-0 focus:ring-0 focus:outline-none placeholder-[#2d2926]/35 font-serif"
              />
            </div>

            <div className="relative flex items-center bg-[#fcfaf7] border border-[#2d2926]/15 rounded px-2.5 py-1.5 focus-within:border-[#2d2926]">
              <Calendar className="w-3.5 h-3.5 text-[#2d2926]/40 mr-2 shrink-0" />
              <input
                type="date"
                value={dateQuery}
                onChange={(e) => { setDateQuery(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none text-xs w-full text-[#1a1a1a] p-0 focus:ring-0 focus:outline-none cursor-pointer font-serif"
              />
              {dateQuery && (
                <button 
                  onClick={() => setDateQuery('')} 
                  className="text-[10px] text-[#2d2926] hover:text-[#1a1a1a] font-bold ml-1 cursor-pointer"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* Entries list */}
          <div className="space-y-3 min-h-[300px]">
            {paginatedEntries.length > 0 ? (
              paginatedEntries.map((entry) => {
                const isSelected = selectedEntryId === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setSelectedEntryId(entry.id)}
                    className={`p-3 rounded border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[#ebd7c4]/20 border-[#2d2926]/40 shadow-xs'
                        : 'bg-[#fcfaf7] hover:bg-[#2d2926]/4 border-[#2d2926]/12'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm tracking-tight text-[#1a1a1a] truncate max-w-[70%]">
                        {entry.title}
                      </h3>
                      <span className="text-[10px] text-[#2d2926]/60 font-sans">
                        {entry.date}
                      </span>
                    </div>

                    {/* Tags snippet */}
                    {entry.tags && entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tags.map((t, idx) => (
                          <span
                            key={idx}
                            className="bg-[#ebd7c4]/15 text-[9px] text-[#2d2926] px-1 rounded border border-[#2d2926]/10 flex items-center"
                          >
                            <Hash className="w-2 h-2 text-[#c4a484] mr-0.5 shrink-0" />
                            {highlightText(t, searchTerm)}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Sentence Hit Fragment */}
                    <p className="text-xs text-[#2d2926]/80 line-clamp-2 mt-1.5 leading-relaxed font-serif">
                      {highlightText(getSlippedSnippet(entry, searchTerm), searchTerm)}
                    </p>
                  </div>
                );
              })
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center border border-dashed border-[#2d2926]/12 rounded-xl bg-[#2d2926]/2 text-center p-4">
                <span className="text-sm font-bold text-[#1a1a1a] select-none">無匹配隨筆項目</span>
                <span className="text-xs text-[#2d2926]/60 mt-1 font-sans">
                  請更換搜索字眼、或重置日期篩選
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Ledger Bottom Pagination */}
        <div className="flex items-center justify-between border-t border-[#2d2926]/10 pt-3 mt-4 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages <= 1}
              className="p-1 rounded border border-[#2d2926]/10 hover:bg-[#2d2926]/5 text-[#2d2926] disabled:opacity-30 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-[#2d2926] font-sans font-medium select-none flex items-center">
              頁碼 {currentPage} / {totalPages || 1}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || totalPages <= 1}
              className="p-1 rounded border border-[#2d2926]/10 hover:bg-[#2d2926]/5 text-[#2d2926] disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-sans tracking-wider uppercase border border-[#2d2926]/15 rounded text-[#2d2926] hover:bg-[#2d2926]/5 cursor-pointer"
          >
            闔書返回
          </button>
        </div>
      </div>

      {/* RIGHT PAGE: Detailed Journal Reading View (Ciphertext toggle + ink hand signatures) */}
      <div className="w-full md:w-1/2 p-6 flex flex-col justify-between bg-[#fcfaf7] relative rounded-r-md overflow-y-auto max-h-[80vh] md:max-h-[640px]">
        {/* Soft folding line shadow accent */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-l from-transparent to-[#2d2926]/5 pointer-events-none" />

        <AnimatePresence mode="wait">
          {selectedEntry ? (
            <motion.div
              key={selectedEntry.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Meta details header */}
                <div className="flex items-start justify-between border-b border-[#2d2926]/10 pb-2">
                  <div>
                    <h3 className="text-xl font-bold text-[#1a1a1a] font-serif tracking-tight">
                      {selectedEntry.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[#2d2926]/60 font-sans font-medium">
                      <span>{selectedEntry.date}</span>
                      <span>•</span>
                      <span className="capitalize bg-[#ebd7c4]/20 px-1.5 py-0.5 rounded text-[10px] text-[#2d2926] font-serif font-semibold">
                        {selectedEntry.mood === 'peaceful' && '寧靜 🍃'}
                        {selectedEntry.mood === 'reflective' && '沈思 🌌'}
                        {selectedEntry.mood === 'nostalgic' && '懷舊 🕯️'}
                        {selectedEntry.mood === 'joyful' && '喜悅 ☀️'}
                        {selectedEntry.mood === 'melancholy' && '憂鬱 🌧️'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Action row (Delete, cipher) */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => toggleRevealCiphertext(selectedEntry.id)}
                      title={revealCiphertexts[selectedEntry.id] ? "隱藏加密塊 (Show Plain)" : "查看 AES-256 原始密文 (Show Ciphertext)"}
                      className="p-1.5 rounded-full border border-[#2d2926]/10 hover:bg-[#2d2926]/5 text-[#2d2926] cursor-pointer"
                    >
                      {revealCiphertexts[selectedEntry.id] ? (
                        <Eye className="w-3.5 h-3.5" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if(confirm("您確定要撕去並焚毀這一頁日記隨筆嗎？（此動作不可逆）")) {
                          onDelete(selectedEntry.id);
                          setSelectedEntryId(entries.length > 0 ? entries[0].id : null);
                        }
                      }}
                      title="刪除本日記"
                      className="p-1.5 rounded-full border border-red-900/10 hover:bg-red-50/10 text-[#a65d5d] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Main Content Area */}
                <div className="relative pt-1 min-h-[300px]">
                  <AnimatePresence mode="wait">
                    {revealCiphertexts[selectedEntry.id] ? (
                      /* CIPHERTEXT BLOCK MODULE */
                      <motion.div
                        key="cipher"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="bg-[#2d2926] text-[#ebd7c4] font-mono text-xs rounded-lg p-4 space-y-2 border border-[#1a1a1a] shadow-inner overflow-x-auto leading-relaxed select-all"
                      >
                        <div className="flex items-center justify-between border-b border-[#2d2926]/30 pb-1 text-[10px] text-[#c4a484]">
                          <span className="flex items-center gap-1 font-sans">
                            <ShieldCheck className="w-3 h-3 text-[#c4a484]" />
                            <span>Vellichor AES-GCM-256 密文儲存層</span>
                          </span>
                          <span>SALT DERIVED</span>
                        </div>
                        <div className="break-all whitespace-pre-wrap select-all select-none text-white/90">
                          {selectedEntry.ciphertext || 'AES-GCM::MOCK_ENCRYPTED_STRING'}
                        </div>
                        <div className="text-[10px] text-[#ebd7c4]/65 mt-1 flex flex-col font-mono">
                          <span>nonce: {selectedEntry.nonce || 'stable_nonce'}</span>
                          <span>salt: {selectedEntry.salt || 'stable_salt'}</span>
                        </div>
                      </motion.div>
                    ) : (
                      /* PLAIN TEXT DECRYPTED MODULE */
                      <motion.div
                        key="plain"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[#2d2926] text-base leading-relaxed whitespace-pre-wrap font-serif select-text"
                        style={{ 
                          backgroundImage: 'linear-gradient(rgba(45, 41, 38, 0.05) 1px, transparent 1px)',
                          backgroundSize: '100% 2.2rem',
                          lineHeight: '2.2rem',
                        }}
                      >
                        {getDecryptedContent(selectedEntry)}

                        {/* SIGNATURE (Sign of pen name in cursives) */}
                        {selectedEntry.signature && (
                          <div className="mt-8 text-right self-end select-none pointer-events-none">
                            <div className="text-right text-[10px] font-sans tracking-widest text-[#2d2926]/50 uppercase">
                              手簽印記 (Inked Signature)
                            </div>
                            <div className="font-serif text-3xl font-italic text-[#a65d5d] mt-0.5 leading-none" style={{ fontFamily: '"Great Vibes", "Alex Brush", cursive' }}>
                              {selectedEntry.signature}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Tags panel */}
              {selectedEntry.tags && selectedEntry.tags.length > 0 && !revealCiphertexts[selectedEntry.id] && (
                <div className="flex flex-wrap gap-1.5 mt-6 border-t border-[#2d2926]/10 pt-3 select-none">
                  {selectedEntry.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="bg-[#ebd7c4]/15 text-xs text-[#2d2926] px-2 py-0.5 rounded border border-[#2d2926]/10 flex items-center font-serif font-medium"
                    >
                      <Hash className="w-3 h-3 text-[#c4a484] mr-0.5" />
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-[#2d2926]/2 rounded-xl border border-dashed border-[#2d2926]/12">
              <Library className="w-10 h-10 text-[#2d2926]/30 mb-2" />
              <span className="text-sm font-bold text-[#1a1a1a] select-none">選取左頁清單</span>
              <span className="text-xs text-[#2d2926]/60 mt-1 font-sans">
                點選左側目錄中的日記隨筆，即可將其調用解密。
              </span>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
