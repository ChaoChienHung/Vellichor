import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface VintageCalendarProps {
  value: string;          // ISO date string YYYY-MM-DD
  onChange: (val: string) => void;
  className?: string;
  label?: string;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const MONTH_NAMES_ZH = [
  '一月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '十一月', '十二月',
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function toISO(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseISO(iso: string): { year: number; month: number; day: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { year: y, month: m - 1, day: d };
}

export default function VintageCalendar({ value, onChange, className = '', label }: VintageCalendarProps) {
  const parsed = value ? parseISO(value) : (() => { const n = new Date(); return { year: n.getFullYear(), month: n.getMonth(), day: n.getDate() }; })();
  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState(0); // -1 = prev, 1 = next
  const containerRef = useRef<HTMLDivElement>(null);

  const todayISO = new Date().toISOString().split('T')[0];

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Navigate months
  const goPrev = useCallback(() => {
    setDirection(-1);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  }, [viewMonth]);

  const goNext = useCallback(() => {
    setDirection(1);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  }, [viewMonth]);

  const goToday = useCallback(() => {
    const now = new Date();
    setDirection(0);
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    onChange(todayISO);
    setIsOpen(false);
  }, [onChange, todayISO]);

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const prevMonthDays = viewMonth === 0 ? getDaysInMonth(viewYear - 1, 11) : getDaysInMonth(viewYear, viewMonth - 1);

  const cells: { day: number; inMonth: boolean; iso: string }[] = [];

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const pm = viewMonth === 0 ? 11 : viewMonth - 1;
    const py = viewMonth === 0 ? viewYear - 1 : viewYear;
    cells.push({ day: d, inMonth: false, iso: toISO(py, pm, d) });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, inMonth: true, iso: toISO(viewYear, viewMonth, d) });
  }

  // Next month leading days
  const remaining = 42 - cells.length; // fill to 6 rows
  for (let d = 1; d <= remaining; d++) {
    const nm = viewMonth === 11 ? 0 : viewMonth + 1;
    const ny = viewMonth === 11 ? viewYear + 1 : viewYear;
    cells.push({ day: d, inMonth: false, iso: toISO(ny, nm, d) });
  }

  // Format display value
  const displayDate = value
    ? (() => {
        const p = parseISO(value);
        return `${p.year}年${p.month + 1}月${p.day}日`;
      })()
    : '選擇日期';

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ zIndex: isOpen ? 100 : 1 }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => {
          if (!isOpen) {
            // Reset view to selected date
            if (value) {
              const p = parseISO(value);
              setViewYear(p.year);
              setViewMonth(p.month);
            }
          }
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 w-full bg-[#fcfaf7] border border-[#2d2926]/15 rounded px-3 py-1.5 
                   hover:border-[#c4a484] focus:border-[#2d2926] transition-colors cursor-pointer group"
      >
        <Calendar className="w-4 h-4 text-[#c4a484] group-hover:text-[#2d2926] transition-colors shrink-0" />
        <span className="text-sm font-serif text-[#1a1a1a] tracking-wide">{displayDate}</span>
        <span className="ml-auto text-[10px] font-sans text-[#2d2926]/40 uppercase tracking-widest select-none">
          {value ? parseISO(value).year : ''}
        </span>
      </button>

      {/* Calendar Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute left-0 top-full mt-2 w-[296px] bg-[#fcfaf7] border border-[#2d2926]/20 rounded-lg shadow-xl overflow-hidden"
            style={{
              backgroundImage: `
                radial-gradient(ellipse at 20% 20%, rgba(196, 164, 132, 0.08) 0%, transparent 60%),
                radial-gradient(ellipse at 80% 80%, rgba(235, 215, 196, 0.1) 0%, transparent 60%)
              `,
              boxShadow: '0 8px 32px rgba(45, 41, 38, 0.12), 0 2px 8px rgba(45, 41, 38, 0.08)',
            }}
          >
            {/* Decorative top border */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c4a484]/60 to-transparent" />

            {/* Header: month/year navigation */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <button
                type="button"
                onClick={goPrev}
                className="w-7 h-7 flex items-center justify-center rounded-full 
                           hover:bg-[#2d2926]/8 active:bg-[#2d2926]/15 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-[#2d2926]/60" />
              </button>

              <div className="text-center select-none">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${viewYear}-${viewMonth}`}
                    initial={{ opacity: 0, x: direction * 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: direction * -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="text-[11px] font-sans text-[#c4a484] tracking-[0.2em] uppercase leading-tight">
                      {MONTH_NAMES_EN[viewMonth]}
                    </div>
                    <div className="text-sm font-serif text-[#1a1a1a] font-bold tracking-wider leading-tight">
                      {MONTH_NAMES_ZH[viewMonth]}　{viewYear}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={goNext}
                className="w-7 h-7 flex items-center justify-center rounded-full 
                           hover:bg-[#2d2926]/8 active:bg-[#2d2926]/15 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-[#2d2926]/60" />
              </button>
            </div>

            {/* Decorative separator */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#2d2926]/12 to-transparent" />

            {/* Weekday headers */}
            <div className="grid grid-cols-7 px-3 pt-2 pb-1">
              {WEEKDAYS.map((wd, i) => (
                <div
                  key={wd}
                  className={`text-center text-[10px] font-sans font-medium tracking-wider select-none py-1
                    ${i === 0 ? 'text-[#a65d5d]/70' : i === 6 ? 'text-[#a65d5d]/70' : 'text-[#2d2926]/40'}`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Date grid */}
            <div className="grid grid-cols-7 px-3 pb-2 gap-y-0.5">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${viewYear}-${viewMonth}`}
                  className="col-span-7 grid grid-cols-7"
                  initial={{ opacity: 0, x: direction * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: direction * -30 }}
                  transition={{ duration: 0.18 }}
                >
                  {cells.map((cell, idx) => {
                    const isSelected = cell.iso === value;
                    const isToday = cell.iso === todayISO;
                    const isSunday = idx % 7 === 0;
                    const isSaturday = idx % 7 === 6;
                    const isWeekend = isSunday || isSaturday;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onChange(cell.iso);
                          setIsOpen(false);
                          // If clicked date is in different month, navigate there
                          if (!cell.inMonth) {
                            const p = parseISO(cell.iso);
                            setViewYear(p.year);
                            setViewMonth(p.month);
                          }
                        }}
                        className={`
                          relative w-full aspect-square flex items-center justify-center
                          text-xs font-serif rounded-md transition-all duration-150 cursor-pointer
                          ${!cell.inMonth
                            ? 'text-[#2d2926]/20'
                            : isSelected
                              ? 'bg-[#2d2926] text-[#fcfaf7] font-bold shadow-sm'
                              : isToday
                                ? 'bg-[#c4a484]/15 text-[#2d2926] font-semibold ring-1 ring-[#c4a484]/40'
                                : isWeekend
                                  ? 'text-[#a65d5d]/80 hover:bg-[#ebd7c4]/30'
                                  : 'text-[#2d2926]/80 hover:bg-[#ebd7c4]/25'
                          }
                        `}
                      >
                        {cell.day}
                        {/* Today dot indicator */}
                        {isToday && !isSelected && (
                          <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#c4a484]" />
                        )}
                        {/* Selected ink-dot indicator */}
                        {isSelected && (
                          <span className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 w-3 h-[2px] rounded-full bg-[#c4a484]" />
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="mx-4 h-px bg-gradient-to-r from-transparent via-[#2d2926]/10 to-transparent" />
            <div className="flex items-center justify-between px-4 py-2">
              <button
                type="button"
                onClick={goToday}
                className="text-[10px] font-sans text-[#c4a484] hover:text-[#2d2926] transition-colors 
                           tracking-wider uppercase cursor-pointer"
              >
                ● 今日
              </button>
              <span className="text-[10px] font-serif text-[#2d2926]/30 italic select-none tracking-wide">
                Vellichor
              </span>
            </div>

            {/* Decorative bottom border */}
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c4a484]/40 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
