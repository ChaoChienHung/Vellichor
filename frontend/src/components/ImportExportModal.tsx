import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowDownUp, 
  Download, 
  Upload, 
  FileArchive, 
  FileText, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ShieldCheck, 
  Clock, 
  FolderArchive,
  Layers,
  Sparkles,
  Lock,
  Unlock,
  Key
} from 'lucide-react';
import { DiaryEntry, UserProfile } from '../types';
import { getExportUrl, importEntriesFile } from '../utils/api';

interface ImportExportModalProps {
  entries: DiaryEntry[];
  currentUser: UserProfile;
  selectedEntry?: DiaryEntry | null;
  onClose: () => void;
  onImportComplete: () => Promise<void>;
  defaultTab?: 'export' | 'import';
}

export default function ImportExportModal({
  entries,
  currentUser,
  selectedEntry,
  onClose,
  onImportComplete,
  defaultTab = 'export',
}: ImportExportModalProps) {
  const [tab, setTab] = useState<'export' | 'import'>(defaultTab);

  // Export states
  const [exportMode, setExportMode] = useState<'encrypted' | 'plaintext'>('encrypted');
  const [exportScope, setExportScope] = useState<'all' | 'single'>(
    selectedEntry ? 'single' : 'all'
  );
  const [exportFormat, setExportFormat] = useState<'zip' | 'markdown' | 'json' | 'vellichor'>('zip');
  const [customPassword, setCustomPassword] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ total: number; imported: number; errors: string[] } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger export download
  const handleExport = () => {
    setIsExporting(true);
    const targetEntryId = exportScope === 'single' && selectedEntry ? selectedEntry.id : undefined;
    const effectiveFormat = exportMode === 'encrypted' && exportFormat !== 'zip' ? 'vellichor' : exportFormat;
    const url = getExportUrl(
      effectiveFormat as any,
      targetEntryId,
      exportMode,
      customPassword.trim() || undefined
    );
    
    // Create an invisible link to trigger native browser download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsExporting(false);
    }, 1500);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['zip', 'json', 'md', 'markdown', 'txt', 'vellichor'].includes(ext || '')) {
      setImportError('僅支援 .zip 壓縮包、.vellichor 加密檔、.json 備份檔、或 .md Markdown 隨筆檔案。');
      return;
    }
    setSelectedFile(file);
    setImportError(null);
    setImportResult(null);
  };

  // Execute import
  const handleImportSubmit = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setImportError(null);
    setImportResult(null);

    try {
      const res = await importEntriesFile(selectedFile, importPassword.trim() || undefined);
      if (res.ok) {
        setImportResult(res);
        await onImportComplete();
      } else {
        setImportError('匯入失敗，請確認檔案格式或解密密碼是否正確。');
      }
    } catch (e: any) {
      setImportError(e?.message || '匯入時發生連線或格式錯誤。');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm select-none"
      style={{ fontFamily: '"EB Garamond", serif' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-[#faf5ec] border-2 border-amber-900/30 rounded-xl shadow-2xl p-6 text-[#3e2723] overflow-hidden"
      >
        {/* Subtle background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(#fbf8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />

        {/* 4 Brass corner ornaments */}
        <div className="absolute w-8 h-8 border-t-2 border-l-2 border-amber-800/40 top-2 left-2 pointer-events-none" />
        <div className="absolute w-8 h-8 border-t-2 border-r-2 border-amber-800/40 top-2 right-2 pointer-events-none" />
        <div className="absolute w-8 h-8 border-b-2 border-l-2 border-amber-800/40 bottom-2 left-2 pointer-events-none" />
        <div className="absolute w-8 h-8 border-b-2 border-r-2 border-amber-800/40 bottom-2 right-2 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-amber-900/20 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-900/10 border border-amber-900/20 flex items-center justify-center text-amber-900 shadow-xs">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                <span>隨筆編目匯出與匯入</span>
                <span className="text-[10px] font-mono uppercase bg-amber-900/10 text-amber-900 px-1.5 py-0.5 rounded border border-amber-900/15">
                  SCHEMA V1.0
                </span>
              </h2>
              <p className="text-xs text-amber-900/70 font-sans tracking-wide">
                VELLICHOR PORTABLE LEDGER SYSTEM
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-amber-900/60 hover:text-amber-950 hover:bg-amber-900/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 border-b border-amber-900/15 pb-2">
          <button
            onClick={() => setTab('export')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-serif tracking-wider uppercase transition-all cursor-pointer ${
              tab === 'export'
                ? 'bg-amber-950 text-amber-50 shadow-sm font-semibold'
                : 'bg-transparent text-amber-900/70 hover:bg-amber-900/10 hover:text-amber-950'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>隨筆匯出 (EXPORT)</span>
          </button>

          <button
            onClick={() => setTab('import')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-serif tracking-wider uppercase transition-all cursor-pointer ${
              tab === 'import'
                ? 'bg-amber-950 text-amber-50 shadow-sm font-semibold'
                : 'bg-transparent text-amber-900/70 hover:bg-amber-900/10 hover:text-amber-950'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>隨筆匯入 (IMPORT)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-4 max-h-[60vh] overflow-y-auto pr-1">
          <AnimatePresence mode="wait">
            {tab === 'export' ? (
              <motion.div
                key="export-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                {/* 1. Security Mode Selection */}
                <div>
                  <label className="text-xs font-bold text-amber-950 block mb-1.5 uppercase tracking-wider font-mono">
                    1. 安全規格模式 (Security Mode)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Encrypted Option (Recommended) */}
                    <div
                      onClick={() => {
                        setExportMode('encrypted');
                        setExportFormat('zip');
                      }}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        exportMode === 'encrypted'
                          ? 'bg-[#ebd7c4]/50 border-emerald-800/60 shadow-xs ring-1 ring-emerald-800/30'
                          : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-emerald-950 font-bold text-xs">
                          <Lock className="w-3.5 h-3.5 text-emerald-700" />
                          <span>安全加密導出 (Encrypted)</span>
                        </div>
                        <span className="text-[9px] font-sans font-semibold bg-emerald-800/15 text-emerald-800 border border-emerald-800/25 px-1 rounded">
                          ★ 守則推薦
                        </span>
                      </div>
                      <p className="text-[10.5px] text-amber-900/75 leading-relaxed font-sans">
                        每一篇隨筆獨立以 <strong>AES-GCM-256</strong> 演算法加密封裝，可安心存放於雲端或隨身碟。
                      </p>
                    </div>

                    {/* Plaintext Option */}
                    <div
                      onClick={() => setExportMode('plaintext')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        exportMode === 'plaintext'
                          ? 'bg-[#ebd7c4]/50 border-amber-900/60 shadow-xs ring-1 ring-amber-900/30'
                          : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5 text-amber-950 font-bold text-xs">
                          <Unlock className="w-3.5 h-3.5 text-amber-700" />
                          <span>純文字明文 (Plaintext)</span>
                        </div>
                        <span className="text-[9px] font-sans font-semibold bg-amber-800/10 text-amber-800 border border-amber-800/20 px-1 rounded">
                          相容外用
                        </span>
                      </div>
                      <p className="text-[10.5px] text-amber-900/75 leading-relaxed font-sans">
                        未加密純文字，直接相容 Obsidian、Notion 或其他 Markdown 閱讀器。
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Scope Selection */}
                <div>
                  <label className="text-xs font-bold text-amber-950 block mb-1.5 uppercase tracking-wider font-mono">
                    2. 選擇匯出範圍 (Export Scope)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setExportScope('all')}
                      className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        exportScope === 'all'
                          ? 'bg-[#ebd7c4]/40 border-amber-900/50 shadow-xs'
                          : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                      }`}
                    >
                      <div className="font-bold text-sm text-amber-950 flex items-center justify-between">
                        <span>全部隨筆檔案</span>
                        <span className="text-[10px] font-mono bg-amber-900/10 px-1.5 py-0.5 rounded">
                          {entries.length} 篇
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-900/70 font-sans mt-1">
                        打包匯出您帳號下所有的日記隨筆紀錄（每篇一檔）。
                      </p>
                    </button>

                    <button
                      type="button"
                      disabled={!selectedEntry}
                      onClick={() => setExportScope('single')}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        !selectedEntry 
                          ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-200' 
                          : exportScope === 'single'
                          ? 'bg-[#ebd7c4]/40 border-amber-900/50 shadow-xs cursor-pointer'
                          : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30 cursor-pointer'
                      }`}
                    >
                      <div className="font-bold text-sm text-amber-950 truncate">
                        單篇隨筆：{selectedEntry ? selectedEntry.title : '未選取隨筆'}
                      </div>
                      <p className="text-[11px] text-amber-900/70 font-sans mt-1">
                        {selectedEntry ? `僅匯出目前翻閱之隨筆 (${selectedEntry.date})` : '請先在隨筆列表中選取特定日記'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* 3. Format Selection */}
                <div>
                  <label className="text-xs font-bold text-amber-950 block mb-1.5 uppercase tracking-wider font-mono">
                    3. 封裝檔案格式 (Format Specification)
                  </label>
                  
                  {exportMode === 'encrypted' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Encrypted ZIP */}
                      <div
                        onClick={() => setExportFormat('zip')}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          exportFormat === 'zip'
                            ? 'bg-[#ebd7c4]/40 border-amber-900/60 shadow-xs ring-1 ring-amber-900/30'
                            : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                          <FileArchive className="w-4 h-4 text-emerald-800" />
                          <span className="font-bold text-xs">ZIP 加密封存包 (.zip)</span>
                        </div>
                        <p className="text-[10.5px] text-amber-900/70 leading-relaxed font-sans">
                          推薦全備份。內含 <code>entries/</code> 目錄，每篇隨筆皆為獨立加密檔案 (<code>.vellichor</code>) 與清單。
                        </p>
                      </div>

                      {/* Single Encrypted File */}
                      <div
                        onClick={() => setExportFormat('vellichor')}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          exportFormat === 'vellichor'
                            ? 'bg-[#ebd7c4]/40 border-amber-900/60 shadow-xs ring-1 ring-amber-900/30'
                            : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                          <Lock className="w-4 h-4 text-emerald-800" />
                          <span className="font-bold text-xs">Vellichor 加密檔案 (.vellichor)</span>
                        </div>
                        <p className="text-[10.5px] text-amber-900/70 leading-relaxed font-sans">
                          單篇獨立加密檔案，內嵌 AES-GCM-256 驗證標籤與金鑰鹽值。
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* ZIP Archive */}
                      <div
                        onClick={() => setExportFormat('zip')}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          exportFormat === 'zip'
                            ? 'bg-[#ebd7c4]/40 border-amber-900/60 shadow-xs ring-1 ring-amber-900/30'
                            : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                          <FileArchive className="w-4 h-4 text-amber-800" />
                          <span className="font-bold text-xs">ZIP 壓縮封存包</span>
                        </div>
                        <p className="text-[10px] text-amber-900/70 leading-relaxed font-sans">
                          內含每篇獨立 Markdown (.md) 與總索引 JSON，方便整理與歸檔。
                        </p>
                      </div>

                      {/* Markdown */}
                      <div
                        onClick={() => setExportFormat('markdown')}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          exportFormat === 'markdown'
                            ? 'bg-[#ebd7c4]/40 border-amber-900/60 shadow-xs ring-1 ring-amber-900/30'
                            : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                          <FileText className="w-4 h-4 text-amber-800" />
                          <span className="font-bold text-xs">Markdown (.md)</span>
                        </div>
                        <p className="text-[10px] text-amber-900/70 leading-relaxed font-sans">
                          YAML Frontmatter 元數據，支援 Obsidian/Notion 標籤。
                        </p>
                      </div>

                      {/* JSON */}
                      <div
                        onClick={() => setExportFormat('json')}
                        className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                          exportFormat === 'json'
                            ? 'bg-[#ebd7c4]/40 border-amber-900/60 shadow-xs ring-1 ring-amber-900/30'
                            : 'bg-[#fcfaf7] border-amber-900/15 hover:border-amber-900/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-amber-900 mb-1">
                          <FileCode className="w-4 h-4 text-amber-800" />
                          <span className="font-bold text-xs">JSON 結構檔</span>
                        </div>
                        <p className="text-[10px] text-amber-900/70 leading-relaxed font-sans">
                          標準 Schema 規格結構化資料，便於程式串接與資料庫備份。
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Caution Notice */}
                {exportMode === 'plaintext' ? (
                  <div className="p-3 bg-amber-500/10 border border-amber-600/30 rounded-lg flex items-start gap-2.5 text-amber-900">
                    <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed font-sans">
                      <strong>⚠️ 安全守則提醒</strong>：此動作將為您匯出已解密的純文字隨筆資料。匯出後請妥善保存於受保護的本機磁碟，切勿上傳至未受信任的公開雲端。
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-700/10 border border-emerald-800/25 rounded-lg flex items-start gap-2.5 text-emerald-950">
                    <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed font-sans">
                      <strong>守則承諾</strong>：已自動採用您的執筆主金鑰完成全量 AES-GCM-256 離線重加密，備份檔即便失竊亦無法被無金鑰者解讀。
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-950 hover:bg-black text-amber-50 rounded-lg text-xs font-serif uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isExporting ? '打包匯出中…' : '立即下載備份檔案'}</span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="import-tab"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                {/* Drag and Drop Zone */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragActive 
                      ? 'border-amber-800 bg-amber-900/10 scale-[1.01]' 
                      : selectedFile
                      ? 'border-emerald-700/60 bg-emerald-700/5'
                      : 'border-amber-900/30 hover:border-amber-900/60 bg-[#fcfaf7]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".zip,.json,.md,.markdown,.txt,.vellichor"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-amber-900/10 flex items-center justify-center text-amber-900 mb-1 shadow-inner">
                      <Upload className="w-6 h-6" />
                    </div>

                    {selectedFile ? (
                      <div>
                        <span className="font-bold text-sm text-emerald-950 block">
                          已就緒：{selectedFile.name}
                        </span>
                        <span className="text-xs text-amber-900/60 font-mono mt-0.5 block">
                          大小: {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="font-bold text-sm text-amber-950 block">
                          拖曳檔案至此處，或點擊選取備份檔案
                        </span>
                        <span className="text-xs text-amber-900/65 font-sans mt-1 block">
                          支援格式：ZIP 壓縮包 (.zip)、Vellichor 加密檔 (.vellichor)、JSON 備份檔 (.json)、Markdown 筆記 (.md)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Optional Decryption Password (if importing third-party or custom encrypted backup) */}
                <div className="p-3 bg-amber-900/5 border border-amber-900/15 rounded-lg">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950 mb-1">
                    <Key className="w-3.5 h-3.5 text-amber-800" />
                    <span>備份解密密碼（非加密檔可留空）</span>
                  </div>
                  <input
                    type="password"
                    placeholder="若此備份檔設定了專屬密碼，請在此輸入解密…"
                    value={importPassword}
                    onChange={(e) => setImportPassword(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-[#fcfaf7] border border-amber-900/20 rounded font-sans focus:outline-none focus:border-amber-900/60 text-amber-950"
                  />
                </div>

                {/* Feedback status */}
                {importError && (
                  <div className="p-3 bg-red-900/10 border border-red-900/30 rounded-lg flex items-start gap-2 text-red-950 text-xs">
                    <AlertCircle className="w-4 h-4 text-red-800 shrink-0 mt-0.5" />
                    <div className="font-sans leading-relaxed">{importError}</div>
                  </div>
                )}

                {importResult && (
                  <div className="p-3 bg-emerald-800/10 border border-emerald-800/30 rounded-lg flex items-start gap-2 text-emerald-950 text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-800 shrink-0 mt-0.5" />
                    <div className="font-sans leading-relaxed">
                      <strong>匯入成功！</strong> 共解析 {importResult.total} 篇隨筆，成功加密寫入 {importResult.imported} 篇。
                    </div>
                  </div>
                )}

                {/* Import Auto-encryption baseline */}
                <div className="p-3 bg-amber-800/5 border border-amber-900/15 rounded-lg flex items-start gap-2.5 text-amber-950 text-xs font-sans leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>自動加密契約</strong>：無論匯入單篇 Markdown 或全份 ZIP，後端均自動以您的主密鑰經過 AES-GCM-256 演算法重新封裝後落盤，確保持久化資料安全。
                  </div>
                </div>

                {/* Action button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleImportSubmit}
                    disabled={!selectedFile || isImporting}
                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-950 hover:bg-black text-amber-50 rounded-lg text-xs font-serif uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isImporting ? '解密並加密寫入中…' : '確認並開始匯入'}</span>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-amber-900/15 flex items-center justify-between text-[11px] text-amber-900/60 font-mono">
          <span>AES-GCM-256 Storage Engine • Portable Ledger</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded hover:bg-amber-900/10 text-amber-950 transition-colors cursor-pointer"
          >
            關閉視窗
          </button>
        </div>
      </motion.div>
    </div>
  );
}
