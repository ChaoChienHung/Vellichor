import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, RotateCcw, Droplets, Type, Sparkles, Feather } from 'lucide-react';
import { InkSettings } from '../types';
import { INK_COLOR_PRESETS, INK_FONT_PRESETS, DEFAULT_INK_SETTINGS } from '../utils/inkSettings';

interface InkStudioModalProps {
  currentSettings: InkSettings;
  onSave: (newSettings: InkSettings) => void;
  onClose: () => void;
}

export default function InkStudioModal({
  currentSettings,
  onSave,
  onClose,
}: InkStudioModalProps) {
  const [settings, setSettings] = useState<InkSettings>({ ...currentSettings });
  const [customColor, setCustomColor] = useState<string>(currentSettings.color);

  const handleSelectPresetColor = (preset: typeof INK_COLOR_PRESETS[0]) => {
    setSettings((prev) => ({
      ...prev,
      color: preset.color,
      colorName: preset.name,
    }));
    setCustomColor(preset.color);
  };

  const handleCustomColorChange = (color: string) => {
    setCustomColor(color);
    setSettings((prev) => ({
      ...prev,
      color: color,
      colorName: '自訂墨色',
    }));
  };

  const handleSelectFont = (font: typeof INK_FONT_PRESETS[0]) => {
    setSettings((prev) => ({
      ...prev,
      fontFamily: font.fontFamily,
      fontName: font.name,
    }));
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_INK_SETTINGS });
    setCustomColor(DEFAULT_INK_SETTINGS.color);
  };

  const handleApply = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="relative w-full max-w-xl bg-[#fcfaf7] border-4 border-[#2d2926] rounded-2xl shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col font-serif"
      >
        {/* Skeuomorphic Header */}
        <div className="bg-[#2d2926] text-[#fcfaf7] p-4 flex items-center justify-between border-b border-[#c4a484]/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#ebd7c4]/20 border border-[#c4a484]/40 flex items-center justify-center text-[#c4a484]">
              <Droplets className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide flex items-center gap-2">
                <span>晶瑩墨水瓶 • 筆墨字跡工坊</span>
                <span className="text-[10px] font-sans bg-[#c4a484]/20 text-[#ebd7c4] px-1.5 py-0.5 rounded border border-[#c4a484]/30">
                  Calligraphy Studio
                </span>
              </h2>
              <p className="text-[11px] text-[#ebd7c4]/70 font-sans mt-0.5">
                研調專屬隨筆的字跡墨色與經典字型風格
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-[#ebd7c4] transition-colors cursor-pointer"
            title="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Live Parchment Paper Card Preview */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#2d2926] flex items-center gap-1.5 font-sans uppercase tracking-wider">
              <Feather className="w-3.5 h-3.5 text-[#8c6239]" />
              <span>紙頁試墨即時預覽 (Live Calligraphy Preview)</span>
            </label>
            
            <div 
              className="p-4 rounded-xl border border-[#2d2926]/20 bg-[#fbf8f3] shadow-inner relative overflow-hidden transition-all duration-300"
              style={{
                backgroundImage: 'radial-gradient(ellipse at center, #ffffff 0%, #f4ece1 100%)',
              }}
            >
              {/* Paper texture overlay */}
              <div className="absolute inset-0 bg-repeat opacity-10 mix-blend-multiply pointer-events-none" />

              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between border-b border-[#2d2926]/10 pb-1.5">
                  <span className="text-[10px] font-sans font-medium text-[#2d2926]/60">
                    2026-10-03 • 試墨隨筆
                  </span>
                  <span 
                    className="text-[11px] font-sans px-2 py-0.5 rounded border border-[#2d2926]/15 bg-white/60 font-semibold"
                    style={{ color: settings.color }}
                  >
                    墨色: {settings.colorName} • {settings.fontName}
                  </span>
                </div>

                <h4 
                  className="text-lg font-bold tracking-tight transition-colors duration-200"
                  style={{
                    color: settings.color,
                    fontFamily: settings.fontFamily,
                  }}
                >
                  歲月沉香，紙墨流年
                </h4>

                <p 
                  className={`leading-relaxed transition-all duration-200 ${
                    settings.fontSize === 'sm' ? 'text-xs' : settings.fontSize === 'lg' ? 'text-base' : 'text-sm'
                  }`}
                  style={{
                    color: settings.color,
                    fontFamily: settings.fontFamily,
                  }}
                >
                  「密文隨筆在時間中凝固成詩，每一滴墨跡都是靈魂落盤的烙印。」
                </p>
              </div>
            </div>
          </div>

          {/* 1. Ink Colors Palette */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2d2926] flex items-center justify-between font-sans uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-[#8c6239]" />
                <span>筆墨顏色研調 (Ink Colors)</span>
              </span>
              <span className="text-[11px] text-[#8c6239] font-normal lowercase font-serif">
                當前: {settings.colorName} ({settings.color})
              </span>
            </label>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {INK_COLOR_PRESETS.map((preset) => {
                const isSelected = settings.color === preset.color;
                return (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => handleSelectPresetColor(preset)}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#ebd7c4]/40 border-[#2d2926] shadow-sm scale-105 ring-2 ring-[#8c6239]/40'
                        : 'bg-white/80 border-[#2d2926]/15 hover:bg-[#ebd7c4]/20'
                    }`}
                  >
                    <div 
                      className={`w-7 h-7 rounded-full shadow-inner flex items-center justify-center border-2 border-white relative transition-transform ${
                        isSelected ? 'scale-110' : ''
                      }`}
                      style={{ backgroundColor: preset.color }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-md" />}
                    </div>
                    <span className="text-[11px] font-bold text-[#1a1a1a] mt-1.5 truncate max-w-full">
                      {preset.name}
                    </span>
                    <span className="text-[9px] text-[#2d2926]/60 font-sans truncate max-w-full">
                      {preset.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs font-sans text-[#2d2926]/70">自訂 HEX 色號:</span>
              <input
                type="color"
                value={customColor}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border border-[#2d2926]/20 p-0.5 bg-white"
                title="調配自訂墨水顏色"
              />
              <span className="text-xs font-mono text-[#8c6239] font-medium">{customColor}</span>
            </div>
          </div>

          {/* 2. Calligraphy Font Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2d2926] flex items-center gap-1.5 font-sans uppercase tracking-wider">
              <Type className="w-3.5 h-3.5 text-[#8c6239]" />
              <span>字體與筆跡風格 (Calligraphy Fonts)</span>
            </label>

            <div className="grid grid-cols-2 gap-2">
              {INK_FONT_PRESETS.map((font) => {
                const isSelected = settings.fontFamily === font.fontFamily;
                return (
                  <button
                    key={font.name}
                    type="button"
                    onClick={() => handleSelectFont(font)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#ebd7c4]/40 border-[#2d2926] shadow-sm ring-2 ring-[#8c6239]/40'
                        : 'bg-white/80 border-[#2d2926]/15 hover:bg-[#ebd7c4]/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-sm font-bold text-[#1a1a1a]"
                        style={{ fontFamily: font.fontFamily }}
                      >
                        {font.name}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-[#8c6239]" />}
                    </div>
                    <p className="text-[10px] text-[#2d2926]/60 font-sans mt-0.5">
                      {font.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Font Size Option */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#2d2926] flex items-center justify-between font-sans uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#8c6239]" />
                <span>隨筆字號濃淡 (Font Size)</span>
              </span>
            </label>

            <div className="flex items-center gap-2">
              {(['sm', 'md', 'lg'] as const).map((size) => {
                const isSelected = settings.fontSize === size;
                const labelMap = { sm: '小字號 (Compact)', md: '標準號 (Standard)', lg: '大字號 (Large)' };
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSettings((prev) => ({ ...prev, fontSize: size }))}
                    className={`flex-1 py-1.5 px-2 text-xs font-sans rounded-lg border transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#2d2926] text-[#fcfaf7] border-[#1a1a1a] shadow-xs font-bold'
                        : 'bg-white/80 text-[#2d2926] border-[#2d2926]/15 hover:bg-[#ebd7c4]/20'
                    }`}
                  >
                    {labelMap[size]}
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-[#f4ece1] p-4 border-t border-[#2d2926]/10 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-sans text-[#2d2926]/70 hover:text-[#2d2926] hover:bg-[#2d2926]/5 rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>恢復預設墨色</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-sans rounded border border-[#2d2926]/20 text-[#2d2926] hover:bg-white/50 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2d2926] hover:bg-[#1a1a1a] text-[#fcfaf7] text-xs font-serif rounded shadow-md transition-all cursor-pointer font-bold"
            >
              <Check className="w-3.5 h-3.5 text-[#c4a484]" />
              <span>套用筆墨字跡</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
