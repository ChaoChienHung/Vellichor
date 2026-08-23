import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, KeyRound, Terminal, Lock, CheckCircle, RefreshCcw, LogOut } from 'lucide-react';
import { UserProfile, DatabaseState } from '../types';

interface UserAccountModalProps {
  currentUser: UserProfile;
  securityLogs: string[];
  onUpdateUser: (updated: Partial<UserProfile>) => void;
  onClose: () => void;
  onRekey: (oldPass: string, newPass: string) => Promise<boolean>;
}

export default function UserAccountModal({
  currentUser,
  securityLogs,
  onUpdateUser,
  onClose,
  onRekey
}: UserAccountModalProps) {
  const [penName, setPenName] = useState(currentUser.penName);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordFeedback, setPasswordFeedback] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isRekeying, setIsRekeying] = useState(false);

  // Handle generic profile update
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser({ penName });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Handle simulated password rewrite
  const handlePasswordRewrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      setPasswordFeedback("請填寫舊密碼與新密碼。");
      return;
    }
    setIsRekeying(true);
    onRekey(oldPassword, newPassword)
      .then((success) => {
        if (success) {
          setPasswordFeedback("主密碼重構成功！已將所有日記重新加密並更新驗證簽章。");
          setOldPassword('');
          setNewPassword('');
        } else {
          setPasswordFeedback("舊密碼錯誤或重加密失敗！請重新嘗試。");
        }
      })
      .catch(() => {
        setPasswordFeedback("重加密失敗！請稍後重試。");
      })
      .finally(() => {
        setIsRekeying(false);
        setTimeout(() => setPasswordFeedback(null), 5000);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm" style={{ fontFamily: '"EB Garamond", serif' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-2xl bg-[#faf5ec] border-2 border-amber-900/30 rounded-xl shadow-2xl p-6 text-[#3e2723] overflow-hidden"
      >
        {/* Parchment background effect */}
        <div className="absolute inset-0 bg-[radial-gradient(#fbf8f0_1px,transparent_1px)] [background-size:16px_16px] opacity-30 pointer-events-none" />
        {/* Corner gold ornaments */}
        <div className="absolute w-8 h-8 border-t-2 border-l-2 border-amber-800/40 top-2 left-2 pointer-events-none" />
        <div className="absolute w-8 h-8 border-t-2 border-r-2 border-amber-800/40 top-2 right-2 pointer-events-none" />
        <div className="absolute w-8 h-8 border-b-2 border-l-2 border-amber-800/40 bottom-2 left-2 pointer-events-none" />
        <div className="absolute w-8 h-8 border-b-2 border-r-2 border-amber-800/40 bottom-2 right-2 pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-900/15 pb-3">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-amber-800" />
            <div>
              <h2 className="text-xl font-bold text-amber-950 font-serif tracking-tight">執筆者設定檔 & 密文庫安全</h2>
              <p className="text-[10px] font-mono text-amber-800/60 uppercase tracking-widest mt-0.5">Vellichor User Certificate Module</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-mono select-none px-3 py-1 bg-amber-900/10 hover:bg-amber-900/20 text-amber-950 rounded border border-amber-900/20 cursor-pointer"
          >
            關閉視窗
          </button>
        </div>

        {/* Content Tabs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-h-[70vh] overflow-y-auto">
          
          {/* LEFT SUB-COLUMN: Profile & Signature Setup */}
          <div className="space-y-4">
            <form onSubmit={handleSaveProfile} className="space-y-4 bg-[#f4ebdc] p-4 rounded-lg border border-amber-900/10">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5 border-b border-amber-900/10 pb-1">
                <span>筆名與執筆簽署 (Profile)</span>
              </h3>
              
              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-800">登入帳戶 (Username - Read Only)</label>
                <div className="w-full bg-[#fcf8f2]/60 border border-amber-900/10 rounded px-2.5 py-1.5 text-xs text-amber-900/70 font-mono">
                  {currentUser.username}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-amber-800">手簽筆名 (Cursive Pen Name)</label>
                <input
                  type="text"
                  value={penName || ''}
                  onChange={(e) => setPenName(e.target.value)}
                  className="w-full bg-[#fdfaf5] border border-amber-900/20 rounded px-2.5 py-1.5 text-xs text-[#451a03] font-serif focus:outline-none focus:border-amber-700"
                  required
                />
              </div>

              {/* Live cursive preview */}
              <div className="bg-[#fcf8f2] p-2 border border-amber-950/5 rounded text-center">
                <div className="text-[9px] font-mono text-amber-800/40 uppercase">簽章預覽 (Signature Preview)</div>
                <div className="font-serif text-3xl text-amber-900 h-10 flex items-center justify-center pt-1" style={{ fontFamily: '"Great Vibes", "Alex Brush", cursive' }}>
                  {penName || 'Ludwig'}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-900 text-amber-50 text-xs font-serif uppercase tracking-wider rounded border border-amber-950 hover:bg-amber-950 cursor-pointer flex items-center gap-1"
                >
                  {isSaved ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                  <span>更新手簽印記</span>
                </button>

                {isSaved && (
                  <span className="text-[11px] font-mono text-green-700 font-bold animate-pulse">更新成功!</span>
                )}
              </div>
            </form>

            {/* Master password change panel */}
            <form onSubmit={handlePasswordRewrite} className="space-y-3 bg-[#e8e0cc] p-4 rounded-lg border border-amber-900/10">
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5 border-b border-amber-900/10 pb-1">
                <KeyRound className="w-4 h-4 text-amber-900" />
                <span>變更主加密密碼 (Re-key database)</span>
              </h3>
              <p className="text-[10px] text-amber-900/70 leading-relaxed font-mono">
                此動作將會用舊密碼解密所有 DB 隨筆，並用新衍生鹽值與新密碼重新加密。
              </p>

              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="舊主密碼"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-[#fdfaf5] border border-amber-900/25 rounded px-2 py-1 text-xs text-[#451a03] focus:outline-none placeholder-amber-900/30"
                  required
                />
              </div>

              <div className="space-y-1">
                <input
                  type="password"
                  placeholder="新主密碼"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#fdfaf5] border border-amber-900/25 rounded px-2 py-1 text-xs text-[#451a03] focus:outline-none placeholder-amber-900/30"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isRekeying}
                className="w-full px-3 py-1.5 bg-amber-950 text-amber-50 text-xs font-serif uppercase tracking-widest rounded hover:bg-black cursor-pointer flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isRekeying ? "重加密中..." : "執行重加密與金鑰重構"}</span>
              </button>

              {passwordFeedback && (
                <div className="text-[10px] font-mono text-amber-950 leading-relaxed text-center bg-[#fdfaf5]/70 p-1.5 rounded border border-amber-900/10">
                  {passwordFeedback}
                </div>
              )}
            </form>
          </div>

          {/* RIGHT SUB-COLUMN: Historical Cryptographic System Audit Logs */}
          <div className="space-y-3 bg-[#ede6d5] p-4 rounded-lg border border-amber-900/10 flex flex-col justify-between h-[340px]">
            <div>
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-1.5 border-b border-amber-900/10 pb-1 mb-2">
                <Terminal className="w-4 h-4 text-emerald-800" />
                <span>安全審計日誌池 (Live Security Logs)</span>
              </h3>
              <p className="text-[9px] text-amber-800/80 font-mono leading-relaxed mb-2">
                Vellichor 密文庫的所有讀寫紀錄（本機 AES-256-GCM 主流程）：
              </p>
              
              <div className="bg-black/90 p-2.5 rounded-md font-mono text-[9px] text-emerald-500 space-y-1 overflow-y-auto h-[220px] shadow-inner select-text">
                {securityLogs.length > 0 ? (
                  securityLogs.map((log, idx) => (
                    <div key={idx} className="break-all border-b border-white/5 pb-1 last:border-0">
                      {log}
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-500/40 italic text-center pt-8">
                    暫無審計日誌
                  </div>
                )}
              </div>
            </div>

            <div className="text-right text-[10px] text-emerald-700 font-mono font-bold">
              ● AES-EVP-Cipher Engine: ACTIVE
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="border-t border-amber-900/15 pt-3 mt-4 flex items-center justify-between">
          <span className="text-[10px] font-mono text-amber-800/60">
            Vellichor Core Security Layer v1.0 • Decrypted Local State
          </span>
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-amber-900 text-amber-50 text-xs font-serif uppercase tracking-widest rounded hover:bg-amber-950 cursor-pointer"
          >
            關閉證書
          </button>
        </div>
      </motion.div>
    </div>
  );
}
