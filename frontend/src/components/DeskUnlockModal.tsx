import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { KeyRound, Shield, Sparkles, UserPlus, LogIn, Lock, Feather } from 'lucide-react';
import { apiLogin, apiSignup } from '../utils/api';

interface DeskUnlockModalProps {
  isOpen: boolean;
  suggestedUsername?: string;
  onSuccess: () => void;
}

export default function DeskUnlockModal({ isOpen, suggestedUsername, onSuccess }: DeskUnlockModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [username, setUsername] = useState(suggestedUsername || 'Ludwig');
  const [password, setPassword] = useState('');
  const [penName, setPenName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (suggestedUsername) {
      setUsername(suggestedUsername);
    }
  }, [suggestedUsername]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      setError('請填寫帳號與主密碼');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await apiLogin({ username: cleanUser, password });
      } else {
        await apiSignup({ username: cleanUser, password, pen_name: penName.trim() || cleanUser });
      }
      onSuccess();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('401') || msg.includes('不正確') || msg.includes('Invalid')) {
        setError('帳號或主密碼不正確，請重新確認');
      } else {
        setError(msg || '解鎖失敗，請確認伺服器狀態');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 280, damping: 26 }}
        className="relative w-full max-w-md bg-[#241a14] text-[#f7efe6] rounded-2xl p-7 shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-[#c4a484]/35 overflow-hidden"
        style={{
          fontFamily: '"Noto Serif TC", serif',
          backgroundImage: 'radial-gradient(ellipse at top, #36261d 0%, #1c140f 100%)',
        }}
      >
        {/* Subtle gold trim line */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#c4a484] to-transparent opacity-75" />

        {/* Header with Wax Seal Stamp visual */}
        <div className="flex items-center gap-3.5 border-b border-[#c4a484]/20 pb-4 mb-5">
          <div className="w-12 h-12 rounded-full bg-[#3d1316] border border-[#a63d40]/70 flex items-center justify-center shrink-0 shadow-inner">
            <Lock className="w-6 h-6 text-[#f28b82]" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-serif text-[#ebd7c4] tracking-tight flex items-center gap-2">
              <span>Vellichor</span>
              <span className="text-xs font-sans font-normal text-[#c4a484]/70 px-1.5 py-0.5 rounded border border-[#c4a484]/30">
                AES-256
              </span>
            </h2>
            <p className="text-xs text-[#ebd7c4]/70 font-sans mt-0.5">
              {mode === 'login' ? '輸入主密碼以解鎖您的隨筆書桌' : '註冊全新執筆者身分證'}
            </p>
          </div>
        </div>

        {/* Tab switch between Login & Signup */}
        <div className="flex rounded-lg bg-black/40 p-1 mb-5 border border-[#c4a484]/20">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-sans font-medium rounded-md transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-[#3d2b20] text-[#f7efe6] shadow-xs border border-[#c4a484]/40 font-bold'
                : 'text-[#ebd7c4]/60 hover:text-[#f7efe6]'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>解鎖隨筆 (Login)</span>
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-sans font-medium rounded-md transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#3d2b20] text-[#f7efe6] shadow-xs border border-[#c4a484]/40 font-bold'
                : 'text-[#ebd7c4]/60 hover:text-[#f7efe6]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>初次註冊 (Sign up)</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-sans text-[#ebd7c4]/80 flex items-center gap-1">
              <span>帳號名稱 (Username)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(null); }}
              placeholder="例如：Ludwig"
              autoFocus={!username}
              className="w-full bg-black/45 border border-[#c4a484]/30 rounded-lg px-3.5 py-2 text-sm text-[#f7efe6] placeholder-[#ebd7c4]/30 focus:outline-none focus:border-[#ebd7c4] font-serif"
              disabled={isLoading}
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="space-y-1.5">
              <label className="text-xs font-sans text-[#ebd7c4]/80 flex items-center gap-1">
                <span>筆名墨客 (Pen Name，手簽印記)</span>
              </label>
              <input
                type="text"
                value={penName}
                onChange={(e) => setPenName(e.target.value)}
                placeholder="例如：Ludwig"
                className="w-full bg-black/45 border border-[#c4a484]/30 rounded-lg px-3.5 py-2 text-sm text-[#f7efe6] placeholder-[#ebd7c4]/30 focus:outline-none focus:border-[#ebd7c4] font-serif"
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-sans text-[#ebd7c4]/80 flex items-center gap-1">
              <KeyRound className="w-3.5 h-3.5 text-[#c4a484]" />
              <span>主密鑰密碼 (Master Password)</span>
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="輸入主密碼進行密鑰衍生..."
              autoFocus={Boolean(username)}
              className="w-full bg-black/45 border border-[#c4a484]/30 rounded-lg px-3.5 py-2 text-sm text-[#f7efe6] placeholder-[#ebd7c4]/30 focus:outline-none focus:border-[#ebd7c4] font-sans"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="text-xs text-[#f28b82] bg-red-950/40 border border-red-900/40 px-3 py-2.5 rounded-lg font-sans space-y-1.5">
              <div>{error}</div>
              {mode === 'signup' && (error.includes('已存在') || error.includes('已被註冊') || error.includes('已有帳號')) && (
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="mt-1 text-xs text-[#ebd7c4] hover:text-white underline font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <LogIn className="w-3 h-3" />
                  <span>帳號已受保護，點此切換為解鎖登入</span>
                </button>
              )}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-[#8a5d3b] via-[#a87449] to-[#8a5d3b] hover:brightness-110 active:scale-98 text-white rounded-lg font-sans font-semibold text-xs tracking-wider uppercase transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 border border-[#c4a484]/40 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>正在衍生密鑰並解密...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>{mode === 'login' ? '解鎖書桌並展開隨筆 (Unlock)' : '完成註冊並開啟書桌 (Register)'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-4 pt-3 border-t border-[#c4a484]/15 text-center text-[10.5px] font-sans text-[#ebd7c4]/50">
          零知識加密：主密碼僅於本機派生 AES-256 金鑰，伺服器不保存密碼明文。
        </div>
      </motion.div>
    </div>
  );
}
