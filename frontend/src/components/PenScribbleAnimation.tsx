import { motion } from 'motion/react';

export default function PenScribbleAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-4 px-6 bg-amber-50/50 rounded-xl border border-amber-900/15 max-w-sm mx-auto shadow-inner">
      <div className="relative w-40 h-20 bg-[#fbf6ec] rounded-md shadow-sm border border-amber-900/10 flex items-center justify-center overflow-hidden">
        
        {/* Paper lines inside miniature notebook */}
        <div className="absolute inset-x-2 top-3 bottom-3 flex flex-col justify-between pointer-events-none opacity-40">
          <div className="h-[2px] bg-amber-800/40 w-full rounded-full"></div>
          <div className="h-[2px] bg-amber-800/40 w-[90%] rounded-full"></div>
          <div className="h-[2px] bg-amber-800/40 w-[95%] rounded-full"></div>
          <div className="h-[2px] bg-amber-800/40 w-[85%] rounded-full"></div>
          <div className="h-[2px] bg-amber-800/40 w-full rounded-full"></div>
        </div>

        {/* Ink droplets or flow animation */}
        <motion.div 
          className="absolute w-1.5 h-1.5 rounded-full bg-amber-950/30"
          animate={{ 
            x: [20, -10, 30, -20, 20], 
            y: [-10, 5, -5, 10, -10],
            scale: [0.7, 1.2, 0.5, 1, 0.7],
            opacity: [0.3, 0.7, 0.2, 0.6, 0.3] 
          }}
          transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
        />

        {/* Written lines appearing dynamically */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 160 80">
          {/* Page divide center shadow */}
          <line x1="80" y1="5" x2="80" y2="75" stroke="#78350f" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.3" />
          
          {/* Animated written ink path */}
          <motion.path
            d="M 25 25 Q 40 18, 55 25 T 85 25 T 115 25 Q 120 30, 135 25 Q 120 45, 90 40 T 60 45 T 30 40"
            fill="none"
            stroke="#451a03"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.7"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          />
        </svg>

        {/* Vintage Fountain Pen Nib Scribbling */}
        <motion.div
          className="absolute -ml-6 -mt-10"
          animate={{
            x: [40, 55, 85, 115, 135, 90, 60, 30, 40],
            y: [25, 25, 25, 25, 25, 40, 45, 40, 25],
            rotate: [-15, -5, -20, -10, -15, -25, -15, -5, -15]
          }}
          transition={{
            repeat: Infinity,
            duration: 5,
            ease: "easeInOut"
          }}
          style={{ originX: '24px', originY: '40px' }} // tip pivot
        >
          {/* Custom SVG Fountain Pen Nib */}
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none" className="drop-shadow-sm">
            {/* Pen Shaft (Wood handle) */}
            <path d="M 5 5 L 18 18 L 22 14 L 9 1 C 8 0, 6 1, 5 3 Z" fill="#783a0b" />
            <path d="M 18 18 L 24 24 L 28 20 L 22 14 Z" fill="#d97706" stroke="#451a03" strokeWidth="1" />
            {/* Brass/Gold Nib body */}
            <path d="M 24 24 L 27 34 L 30 38 L 31 43 L 30 44 L 29 44 L 27 42 L 24 44 L 21 42 L 19 44 L 18 44 L 17 43 L 18 38 L 21 34 Z" fill="url(#goldGradient)" stroke="#451a03" strokeWidth="1" />
            {/* Nib slit */}
            <line x1="24" y1="24" x2="24" y2="42" stroke="#451a03" strokeWidth="1.2" />
            {/* Nib breather hole */}
            <circle cx="24" cy="32" r="1.5" fill="#451a03" />
            
            {/* Defining golden gradient */}
            <defs>
              <linearGradient id="goldGradient" x1="18" y1="24" x2="31" y2="44" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#d97706" />
                <stop offset="30%" stopColor="#f59e0b" />
                <stop offset="70%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>
      <div className="mt-2 text-[11px] font-mono text-amber-900/60 flex items-center gap-1.5 animate-pulse">
        <span className="w-1.5 h-1.5 bg-amber-800 rounded-full"></span>
        <span>筆墨落紙，思緒凝香...</span>
      </div>
    </div>
  );
}
