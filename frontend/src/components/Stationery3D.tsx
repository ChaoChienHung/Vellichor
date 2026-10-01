import React, { useState } from 'react';
import { motion } from 'motion/react';

export function PenTray3D({ onDraftClick }: { onDraftClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex flex-col items-center select-none shrink-0 pointer-events-auto"
      style={{ perspective: 1000 }}
    >
      {/* 3D Solid Carved Walnut Tray Base */}
      <div 
        className="relative w-52 h-24 lg:w-22 lg:h-72 rounded-3xl p-3 flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, #443226 0%, #2a1e16 60%, #1c140f 100%)',
          boxShadow: `
            0 20px 35px -8px rgba(20, 14, 10, 0.6),
            0 6px 16px rgba(0, 0, 0, 0.4),
            inset 0 2px 4px rgba(255, 255, 255, 0.15),
            inset 0 -3px 6px rgba(0, 0, 0, 0.6),
            inset 2px 0 4px rgba(255, 255, 255, 0.08)
          `,
          transform: 'rotateX(14deg) rotateY(-6deg) rotateZ(1deg)',
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Recessed Carved Pen Channel / Well */}
        <div 
          className="absolute inset-2.5 rounded-2xl pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, #18110b 0%, #241a13 50%, #150f0a 100%)',
            boxShadow: 'inset 0 6px 14px rgba(0,0,0,0.9), inset 0 -1px 3px rgba(255,255,255,0.08)',
          }}
        />

        {/* Polished Brass Inlay Trim Liners */}
        <div className="absolute inset-y-4 left-3 w-[1.5px] bg-gradient-to-b from-[#ebd7c4]/60 via-[#c4a484]/80 to-[#8b5e3c]/40 rounded-full opacity-60 hidden lg:block" />
        <div className="absolute inset-y-4 right-3 w-[1.5px] bg-gradient-to-b from-[#ebd7c4]/60 via-[#c4a484]/80 to-[#8b5e3c]/40 rounded-full opacity-60 hidden lg:block" />

        {/* ========================================================= */}
        {/* THE 3D VINTAGE MASTER FOUNTAIN PEN (Interactive Lift) */}
        {/* ========================================================= */}
        <div
          onClick={onDraftClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="relative cursor-pointer flex flex-col items-center justify-center focus:outline-none z-10 w-full h-full"
          title="執起鋼筆：開始撰寫全新日記 (Click to draft new entry)"
        >
          {/* Extended Invisible Hit Area to guarantee zero oscillation/flicker */}
          <div className="absolute -inset-4 z-30 pointer-events-auto" />

          {/* Dynamic Pen Contact & Hover Shadow inside the well */}
          <motion.div 
            className="absolute rounded-full pointer-events-none"
            animate={isHovered ? {
              opacity: 0.35,
              scaleY: 1.25,
              scaleX: 1.15,
              y: 12,
              filter: 'blur(7px)',
            } : {
              opacity: 0.75,
              scaleY: 1,
              scaleX: 1,
              y: 2,
              filter: 'blur(2.5px)',
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={{
              width: '80%',
              height: '10px',
              background: 'radial-gradient(ellipse at center, rgba(10,5,2,0.95) 0%, rgba(10,5,2,0) 75%)',
            }}
          />

          {/* Animated Moving Pen Assembly (Lifts cleanly along Z axis without angular clipping) */}
          <motion.div
            className="flex flex-col items-center pointer-events-none rotate-[-90deg] lg:rotate-0"
            animate={isHovered ? {
              y: -8,
              scale: 1.03,
            } : {
              y: 0,
              scale: 1,
            }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            style={{ 
              transformStyle: 'preserve-3d',
              willChange: 'transform',
            }}
          >
            {/* 1. Cap Finial (Brass Crown) */}
            <div 
              className="w-3.5 h-2 rounded-t-full"
              style={{
                background: 'linear-gradient(180deg, #ffe8c2 0%, #d4a76a 50%, #8c622d 100%)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.6), inset 0 0.5px 0.5px rgba(255,255,255,0.8)',
              }}
            />

            {/* 2. Pen Cap Body with Gold Pocket Clip */}
            <div 
              className="relative w-4.5 h-16 rounded-t-xs flex flex-col items-center"
              style={{
                background: 'linear-gradient(90deg, #120b07 0%, #3a2517 25%, #69442a 50%, #3a2517 75%, #120b07 100%)',
                boxShadow: '0 3px 6px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.3)',
              }}
            >
              {/* Longitudinal Specular Highlight */}
              <div className="absolute inset-y-0 left-[35%] w-[1.5px] bg-white/35 blur-[0.5px] pointer-events-none" />

              {/* 3D Raised Gold Pocket Clip */}
              <div 
                className="absolute top-2 w-1 h-12 rounded-full pointer-events-none"
                style={{
                  background: 'linear-gradient(180deg, #fff0d0 0%, #c49a58 50%, #7d5218 100%)',
                  boxShadow: '1px 2px 4px rgba(0,0,0,0.6), inset 0 0.5px 0.5px rgba(255,255,255,0.9)',
                  transform: 'translateZ(3px)',
                }}
              >
                {/* Teardrop Ball Clip Tip */}
                <div 
                  className="absolute bottom-0 -left-[1.5px] w-2 h-2 rounded-full"
                  style={{
                    background: 'radial-gradient(circle at 35% 35%, #fff0d0 0%, #c49a58 60%, #5e3c0c 100%)',
                    boxShadow: '0 2px 3px rgba(0,0,0,0.4)',
                  }}
                />
              </div>

              {/* Triple Brass Cap Center Band */}
              <div 
                className="absolute bottom-0 inset-x-0 h-3 flex flex-col justify-between py-[1px]"
                style={{
                  background: 'linear-gradient(180deg, #ffe8c2 0%, #d4a76a 40%, #8c622d 80%, #ffe8c2 100%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.6), inset 0 0.5px 0.5px rgba(255,255,255,0.8)',
                }}
              >
                <div className="w-full h-[0.5px] bg-black/40" />
                <div className="w-full h-[0.5px] bg-black/40" />
              </div>
            </div>

            {/* 3. Pen Barrel (Main Body) */}
            <div 
              className="relative w-4 h-20 flex flex-col items-center"
              style={{
                background: 'linear-gradient(90deg, #150d08 0%, #3e2719 25%, #70492e 50%, #3e2719 75%, #150d08 100%)',
                boxShadow: '0 3px 6px rgba(0,0,0,0.45)',
              }}
            >
              {/* Barrel Specular Highlight */}
              <div className="absolute inset-y-0 left-[35%] w-[1.5px] bg-white/30 blur-[0.5px] pointer-events-none" />

              {/* End of Barrel Gold Accent Ring */}
              <div 
                className="absolute bottom-0 inset-x-0 h-1"
                style={{
                  background: 'linear-gradient(180deg, #ffe8c2 0%, #d4a76a 50%, #8c622d 100%)',
                  boxShadow: 'inset 0 0.5px 0.5px rgba(255,255,255,0.7)',
                }}
              />
            </div>

            {/* 4. Ergonomic Grip Section (Fingers rest here) */}
            <div 
              className="relative w-3.5 h-6 rounded-b-xs flex flex-col items-center"
              style={{
                background: 'linear-gradient(90deg, #0e0906 0%, #241810 50%, #0e0906 100%)',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.8)',
              }}
            >
              {/* Nib Collar (Brass/Gold Band holding the nib) */}
              <div 
                className="absolute bottom-0 w-3 h-1"
                style={{
                  background: 'linear-gradient(180deg, #ffe8c2 0%, #c49a58 100%)',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.5)',
                }}
              />
            </div>

            {/* 5. 14k Two-Tone Masterpiece Gold Nib (Correctly oriented: sharp tip points DOWN) */}
            <div className="relative -mt-0.5 filter drop-shadow-[0_3px_4px_rgba(0,0,0,0.6)]">
              <svg width="20" height="28" viewBox="0 0 20 28" fill="none">
                <defs>
                  <linearGradient id="nibGoldGrad" x1="0" y1="0" x2="20" y2="28" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#fff3db" />
                    <stop offset="35%" stopColor="#d9a75c" />
                    <stop offset="75%" stopColor="#9e6e2b" />
                    <stop offset="100%" stopColor="#543710" />
                  </linearGradient>
                  <linearGradient id="nibSilverGrad" x1="5" y1="4" x2="15" y2="24" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="60%" stopColor="#dedbd5" />
                    <stop offset="100%" stopColor="#99958d" />
                  </linearGradient>
                </defs>

                {/* Outer Nib Contour: Base at top (y=0), Shoulders at y=8, Curves down to sharp tip at (10, 27) */}
                <path 
                  d="M6 0 L14 0 L16 6 L18 9 C17 17, 13 22, 10 27 C7 22, 3 17, 2 9 L4 6 Z" 
                  fill="url(#nibGoldGrad)" 
                  stroke="#5c3f15" 
                  strokeWidth="0.6" 
                />

                {/* Inner Platinum Filigree Inlay Wings */}
                <path 
                  d="M7 3 L13 3 L14 8 C13.5 15, 11.5 19, 10 23 C8.5 19, 6.5 15, 6 8 Z" 
                  fill="url(#nibSilverGrad)" 
                  stroke="#8f877d" 
                  strokeWidth="0.4" 
                  opacity="0.9" 
                />

                {/* Breather Hole */}
                <circle cx="10" cy="10" r="1.4" fill="#150f0a" stroke="#d4a76a" strokeWidth="0.4" />

                {/* Ink Slit (runs from breather hole straight to writing tip) */}
                <line x1="10" y1="10" x2="10" y2="27" stroke="#150f0a" strokeWidth="0.8" />
              </svg>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 3D Embossed Brass Desk Plaque Badge ("執筆 • DRAFT") */}
      <motion.div 
        animate={isHovered ? { y: -3, scale: 1.05 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mt-3 px-3 py-1 rounded-md flex items-center gap-1.5 cursor-pointer shadow-md select-none border border-[#f0d8b4]/60"
        style={{
          background: 'linear-gradient(180deg, #3d342c 0%, #1f1a16 100%)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
        }}
        onClick={onDraftClick}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#d4a76a] shadow-[0_0_4px_#ffe4b3]" />
        <span className="text-[10px] font-serif font-bold text-[#ebd7c4] tracking-[0.14em] uppercase">
          執筆 • DRAFT
        </span>
      </motion.div>
    </div>
  );
}

export function WaxSealAndAudit3D({ onAuditClick }: { onAuditClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex flex-col items-center select-none shrink-0 pointer-events-auto"
      style={{ perspective: 1000 }}
    >
      <div 
        className="relative flex items-center justify-center gap-2 cursor-pointer"
        onClick={onAuditClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {/* Contact Shadow for Stamp & Seal on Desk */}
        <div 
          className="absolute -inset-2 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(30,12,8,0.55) 0%, rgba(0,0,0,0) 70%)',
            filter: 'blur(6px)',
            transform: 'translateY(12px)',
          }}
        />

        {/* 1. GENUINE 3D WAX SEAL (Thick Molten Burgundy Wax with Intaglio Relief) */}
        <motion.div 
          animate={isHovered ? { scale: 1.06, rotateZ: 5 } : { scale: 1, rotateZ: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          className="relative w-18 h-18 rounded-full flex items-center justify-center cursor-pointer"
          style={{
            background: 'radial-gradient(circle at 35% 30%, #a63d40 0%, #7a1f24 55%, #420f12 100%)',
            boxShadow: `
              0 12px 24px rgba(45, 12, 15, 0.55),
              0 4px 8px rgba(0,0,0,0.35),
              inset 0 3px 6px rgba(255, 255, 255, 0.45),
              inset 0 -4px 8px rgba(20, 5, 6, 0.8),
              inset 3px 0 6px rgba(255, 255, 255, 0.2)
            `,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Organic Wax Dripping Ring Lip (Poured Contour Edge) */}
          <div 
            className="absolute inset-1 rounded-full pointer-events-none"
            style={{
              border: '2.5px solid rgba(255,255,255,0.18)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.4)',
            }}
          />

          {/* Deep Intaglio Pressed Coin Bed */}
          <div 
            className="w-13 h-13 rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 40% 40%, #7e1e22 0%, #521114 80%, #38080a 100%)',
              boxShadow: `
                inset 0 4px 8px rgba(0,0,0,0.85),
                inset 0 -2px 4px rgba(255,255,255,0.25),
                0 1px 2px rgba(255,255,255,0.15)
              `,
            }}
          >
            {/* Embossed Monogram V with Deep 3D Chisel Bevel */}
            <span 
              className="font-serif font-black text-2xl text-[#f7e6e6] select-none"
              style={{
                textShadow: `
                  0 2px 3px rgba(0,0,0,0.9),
                  0 -1px 1px rgba(255,255,255,0.4),
                  1px 1px 2px rgba(0,0,0,0.8)
                `,
                transform: 'translateZ(2px)',
              }}
            >
              V
            </span>
          </div>

          {/* Specular Glint Highlight on Wax Surface */}
          <div className="absolute top-2 left-3 w-4 h-2 rounded-full bg-white/35 blur-[1px] rotate-[-30deg] pointer-events-none" />
        </motion.div>

        {/* 2. THE 3D TURNED WOOD & SOLID BRASS SEAL STAMP HANDLE */}
        <motion.div 
          className="relative hidden lg:flex flex-col items-center cursor-pointer -ml-2"
          animate={isHovered ? {
            y: -14,
            rotateX: 12,
            rotateY: -10,
            scale: 1.08,
          } : {
            y: 0,
            rotateX: 0,
            rotateY: 0,
            scale: 1,
          }}
          transition={{ type: 'spring', stiffness: 250, damping: 18 }}
          style={{ transformStyle: 'preserve-3d' }}
          title="執筆者主命鑰印信 (Master Key Audit Seal)"
        >
          {/* Spherical Crown / Turned Knob */}
          <div 
            className="w-7 h-7 rounded-full"
            style={{
              background: 'radial-gradient(circle at 35% 30%, #8c5a38 0%, #52311c 60%, #29150a 100%)',
              boxShadow: '0 3px 6px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.3)',
            }}
          />

          {/* Ergonomic Turned Wooden Waist Neck */}
          <div 
            className="w-3.5 h-7 rounded-sm -my-1"
            style={{
              background: 'linear-gradient(90deg, #2b170c 0%, #693e22 40%, #8c5a38 60%, #2b170c 100%)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.15)',
            }}
          />

          {/* Solid Heavy Machined Brass Base Collar */}
          <div 
            className="w-8 h-4 rounded-b-md"
            style={{
              background: 'linear-gradient(180deg, #ffe0a3 0%, #c4964e 45%, #6e4d17 100%)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.5), inset 0 1px 1px rgba(255,255,255,0.8)',
            }}
          >
            {/* Knurled Detail Rings */}
            <div className="w-full h-[1px] bg-black/30 mt-1" />
            <div className="w-full h-[1px] bg-black/30 mt-0.5" />
          </div>
        </motion.div>
      </div>

      {/* 3D Embossed Brass Desk Plaque Badge ("審計 • AUDIT") */}
      <motion.div 
        animate={isHovered ? { y: -3, scale: 1.05 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mt-3 px-3 py-1 rounded-md flex items-center gap-1.5 cursor-pointer shadow-md select-none border border-[#f0d8b4]/60"
        style={{
          background: 'linear-gradient(180deg, #3d342c 0%, #1f1a16 100%)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
        }}
        onClick={onAuditClick}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#d4a76a] shadow-[0_0_4px_#ffe4b3]" />
        <span className="text-[10px] font-serif font-bold text-[#ebd7c4] tracking-[0.14em] uppercase">
          審計 • AUDIT
        </span>
      </motion.div>
    </div>
  );
}

export function CrystalInkwell3D({ onInkClick }: { onInkClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="relative flex flex-col items-center select-none shrink-0 pointer-events-auto"
      style={{ perspective: 1000 }}
    >
      <div 
        onClick={onInkClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex flex-col items-center cursor-pointer p-1"
        title="Essence of Time 復古重晶刻面墨水瓶 (Click to inspect)"
      >
        {/* Stationary Hitbox */}
        <div className="absolute -inset-4 z-20 pointer-events-auto" />

        <motion.div 
          className="relative flex flex-col items-center pointer-events-none"
          animate={isHovered ? {
            y: -10,
            rotateX: 8,
            rotateZ: 3,
            scale: 1.05,
          } : {
            y: 0,
            rotateX: 0,
            rotateZ: 0,
            scale: 1,
          }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
        {/* Dynamic Refractive Caustic Shadow on the Desk */}
        <div 
          className="absolute -inset-3 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(10,18,30,0.6) 0%, rgba(20,35,60,0.25) 50%, rgba(0,0,0,0) 75%)',
            filter: 'blur(8px)',
            transform: 'translateY(16px)',
          }}
        />

        {/* 1. BRASS & WOODEN STOPPER CORK (Bottle Cap) */}
        <div 
          className="relative w-8 h-4 rounded-t-sm z-10"
          style={{
            background: 'linear-gradient(180deg, #ffe0a3 0%, #b8863b 60%, #573a0e 100%)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.7)',
          }}
        >
          {/* Cork Plug Collar */}
          <div className="absolute -bottom-1.5 left-1 right-1 h-1.5 bg-[#825c38] rounded-b-xs border-t border-[#402a14]" />
        </div>

        {/* Heavy Flanged Glass Bottle Neck */}
        <div 
          className="w-10 h-2 bg-gradient-to-r from-white/30 via-white/70 to-white/20 border-x border-[#2d2926]/40 rounded-xs -mt-0.5 z-10"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
        />

        {/* 2. THE FACETED HEAVY CRYSTAL INKWELL BODY */}
        <div 
          className="relative w-18 h-20 rounded-xl overflow-hidden flex flex-col items-center justify-between p-1.5"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(200,215,230,0.15) 30%, rgba(20,25,35,0.85) 70%, rgba(10,12,18,0.95) 100%)',
            boxShadow: `
              0 16px 32px rgba(15, 20, 30, 0.6),
              0 4px 10px rgba(0,0,0,0.4),
              inset 0 2px 4px rgba(255,255,255,0.65),
              inset 0 -3px 6px rgba(0,0,0,0.7),
              inset 3px 0 6px rgba(255,255,255,0.3),
              inset -3px 0 6px rgba(0,0,0,0.5)
            `,
            border: '1px solid rgba(255,255,255,0.4)',
          }}
        >
          {/* Faceted Crystal Bevel Refraction Lines */}
          <div className="absolute inset-y-0 left-2.5 w-[1px] bg-gradient-to-b from-white/80 via-white/20 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 right-2.5 w-[1px] bg-gradient-to-b from-white/60 via-white/10 to-transparent pointer-events-none" />

          {/* Liquid Indigo Ink Reservoir Inside (Shows fluid meniscus) */}
          <div 
            className="absolute bottom-1 inset-x-1.5 h-13 rounded-b-lg overflow-hidden pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, #10213d 0%, #07101e 50%, #02050a 100%)',
              boxShadow: 'inset 0 3px 6px rgba(0, 150, 255, 0.25)',
            }}
          >
            {/* Liquid Surface Meniscus Line */}
            <div className="w-full h-1 bg-gradient-to-r from-cyan-300/40 via-blue-400/20 to-cyan-300/40 blur-[0.5px]" />
          </div>

          {/* 3. VINTAGE PARCHMENT LABEL WRAPPED ON BOTTLE ("ESSENCE OF TIME") */}
          <div 
            className="relative z-10 w-[92%] mt-1.5 bg-[#fdfbf7] rounded-sm py-1 px-1 text-center shadow-md border border-[#2d2926]/30 select-none"
            style={{
              backgroundImage: 'radial-gradient(ellipse at center, #fffdfa 0%, #f4ede1 100%)',
              boxShadow: '0 2px 4px rgba(0,0,0,0.5), inset 0 0 4px rgba(139,94,60,0.2)',
            }}
          >
            <div className="text-[7.5px] font-sans font-bold leading-none tracking-[0.16em] text-[#2d2926]/60 uppercase">
              Essence of
            </div>
            <div className="text-[9px] font-serif font-black tracking-wider text-[#1a1a1a] leading-tight mt-0.5">
              TIME
            </div>
            <div className="w-3/4 h-[0.5px] bg-[#c4a484] mx-auto my-[2px]" />
            <div className="text-[7px] font-serif italic text-[#8b5e3c] leading-none">
              Nostalgia • 1928
            </div>
          </div>

          {/* Bottom Volume Indicator Stamped in Crystal */}
          <div className="relative z-10 text-[8px] font-mono tracking-widest text-white/50 select-none scale-90">
            35ml
          </div>
        </div>
      </motion.div>
    </div>

      {/* 3D Embossed Brass Desk Plaque Badge ("墨水 • INK") */}
      <motion.div 
        animate={isHovered ? { y: -3, scale: 1.05 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="mt-3 px-3 py-1 rounded-md flex items-center gap-1.5 cursor-pointer shadow-md select-none border border-[#f0d8b4]/60"
        style={{
          background: 'linear-gradient(180deg, #3d342c 0%, #1f1a16 100%)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 1px 1px rgba(255,255,255,0.2)',
        }}
        onClick={onInkClick}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#d4a76a] shadow-[0_0_4px_#ffe4b3]" />
        <span className="text-[10px] font-serif font-bold text-[#ebd7c4] tracking-[0.14em] uppercase">
          墨水 • INK
        </span>
      </motion.div>
    </div>
  );
}
