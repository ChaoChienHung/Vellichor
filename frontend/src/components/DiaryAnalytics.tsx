import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { AnalyticsEntry, getAnalyticsEntries } from '../utils/api';
import { getMoodDisplay } from '../utils/entryParser';

type Grain = 'week' | 'month' | 'year';

const COLORS = ['#8c6239', '#7b182b', '#1b4332', '#4a2e68', '#a65d5d'];
const GRAINS: { value: Grain; label: string }[] = [
  { value: 'week', label: '週' },
  { value: 'month', label: '月' },
  { value: 'year', label: '年' },
];

function periodKey(date: string, grain: Grain): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const [year, month, day] = date.split('-').map(Number);
  const stamp = new Date(Date.UTC(year, month - 1, day));
  if (stamp.getUTCFullYear() !== year || stamp.getUTCMonth() !== month - 1 || stamp.getUTCDate() !== day) return null;
  if (grain === 'year') return String(year);
  if (grain === 'month') return date.slice(0, 7);
  const weekday = (stamp.getUTCDay() + 6) % 7;
  stamp.setUTCDate(stamp.getUTCDate() - weekday);
  return stamp.toISOString().slice(0, 10);
}

function formatPeriod(key: string, grain: Grain): string {
  if (grain === 'year') return `${key} 年`;
  if (grain === 'month') return `${key.slice(0, 4)}/${key.slice(5)}`;
  return `${key.slice(2, 4)}/${key.slice(5, 7)}/${key.slice(8)}`;
}

export default function DiaryAnalytics({ onBack }: { onBack: () => void }) {
  const [entries, setEntries] = useState<AnalyticsEntry[]>([]);
  const [grain, setGrain] = useState<Grain>('month');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getAnalyticsEntries()
      .then(data => { if (active) setEntries(data); })
      .catch(() => { if (active) setError(true); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = useMemo(() => {
    const periods = new Map<string, { total: number; moods: Map<string, number>; tags: Map<string, number> }>();
    const moods = new Map<string, number>();
    const tags = new Map<string, number>();
    let datedCount = 0;
    for (const entry of entries) {
      const key = periodKey(entry.date, grain);
      if (!key) continue;
      datedCount++;
      const mood = entry.mood || 'reflective';
      moods.set(mood, (moods.get(mood) || 0) + 1);
      const entryTags = new Set(entry.tags || []);
      for (const tag of entryTags) {
        if (tag.trim()) tags.set(tag, (tags.get(tag) || 0) + 1);
      }
      const period = periods.get(key) || { total: 0, moods: new Map<string, number>(), tags: new Map<string, number>() };
      period.total++;
      period.moods.set(mood, (period.moods.get(mood) || 0) + 1);
      for (const tag of entryTags) {
        if (tag.trim()) period.tags.set(tag, (period.tags.get(tag) || 0) + 1);
      }
      periods.set(key, period);
    }
    return {
      datedCount,
      periods: [...periods].sort(([a], [b]) => a.localeCompare(b)),
      moods: [...moods].sort((a, b) => b[1] - a[1]),
      tags: [...tags].sort((a, b) => b[1] - a[1]),
    };
  }, [entries, grain]);

  const chartMoods = stats.moods.slice(0, 5);
  const activeTag = stats.tags.some(([tag]) => tag === selectedTag) ? selectedTag : stats.tags[0]?.[0];
  const chartWidth = Math.max(600, stats.periods.length * 62);
  const chartHeight = 180;
  const maxCount = Math.max(1, ...stats.periods.map(([, period]) => period.total));
  const maxTagCount = Math.max(1, ...stats.periods.map(([, period]) => period.tags.get(activeTag) || 0));
  const point = (index: number, count: number) => `${34 + index * 62},${chartHeight - 24 - count / maxCount * 130}`;

  return (
    <section className="w-full h-full max-h-[80vh] md:max-h-[640px] overflow-y-auto bg-[#fcfaf7] px-5 sm:px-8 py-6 text-[#2d2926] font-serif">
      <div className="flex items-center gap-3 border-b border-[#2d2926]/15 pb-4">
        <button type="button" onClick={onBack} aria-label="返回隨筆編目" className="p-2 rounded border border-[#2d2926]/20 hover:bg-[#ebd7c4]/40 cursor-pointer"><ArrowLeft className="w-4 h-4" /></button>
        <BarChart3 className="w-5 h-5 text-[#8c6239]" />
        <div>
          <h2 className="text-xl font-bold">心緒與主題軌跡</h2>
          <p className="text-xs text-[#2d2926]/55 font-sans">依隨筆日期彙整所有紀錄</p>
        </div>
      </div>

      {loading ? <p className="py-12 text-center text-sm">正在整理隨筆資料…</p> : error ? <p role="alert" className="py-12 text-center text-sm">統計資料載入失敗，請返回後再試。</p> : stats.datedCount === 0 ? <p className="py-12 text-center text-sm">尚無可統計的隨筆。寫下第一篇後，這裡就會呈現心緒軌跡。</p> : (
        <div className="space-y-7 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm"><span className="text-2xl font-bold text-[#8c6239]">{stats.datedCount}</span> 篇有日期的隨筆</p>
            <div className="flex rounded border border-[#2d2926]/20 overflow-hidden" role="group" aria-label="統計時間維度">
              {GRAINS.map(option => <button key={option.value} type="button" onClick={() => setGrain(option.value)} aria-pressed={grain === option.value} className={`px-4 py-1.5 text-xs font-sans cursor-pointer ${grain === option.value ? 'bg-[#2d2926] text-[#fcfaf7]' : 'hover:bg-[#ebd7c4]/40'}`}>{option.label}</button>)}
            </div>
          </div>

          <section>
            <h3 className="text-base font-bold mb-1">心境變化</h3>
            <p className="text-xs text-[#2d2926]/55 mb-3 font-sans">有紀錄期別的心緒篇數；橫向捲動可查看完整歷史。圖中顯示最常見的五種心緒。</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-sans mb-3">
              {chartMoods.map(([mood], index) => <span key={mood} className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index] }} />{getMoodDisplay(mood)}</span>)}
            </div>
            <div className="overflow-x-auto border border-[#2d2926]/10 rounded bg-[#fffdf9]">
              <svg width={chartWidth} height={chartHeight + 28} viewBox={`0 0 ${chartWidth} ${chartHeight + 28}`} role="img" aria-label="各期心緒篇數折線圖">
                {[0, 1, 2, 3].map(i => <line key={i} x1="30" x2={chartWidth - 10} y1={chartHeight - 24 - i * 130 / 3} y2={chartHeight - 24 - i * 130 / 3} stroke="#2d2926" opacity="0.1" />)}
                {chartMoods.map(([mood], colorIndex) => <g key={mood}>
                  <polyline fill="none" stroke={COLORS[colorIndex]} strokeWidth="2.5" points={stats.periods.map(([, period], index) => point(index, period.moods.get(mood) || 0)).join(' ')} />
                  {stats.periods.map(([key, period], index) => <circle key={key} cx={34 + index * 62} cy={Number(point(index, period.moods.get(mood) || 0).split(',')[1])} r="3" fill={COLORS[colorIndex]}><title>{formatPeriod(key, grain)} · {getMoodDisplay(mood)}：{period.moods.get(mood) || 0} 篇</title></circle>)}
                </g>)}
                {stats.periods.map(([key], index) => <text key={key} x={34 + index * 62} y={chartHeight + 5} textAnchor="middle" fontSize="10" fill="#6b625b">{formatPeriod(key, grain)}</text>)}
              </svg>
            </div>
          </section>

          {activeTag && <section>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-base font-bold">標籤時序</h3>
                <p className="text-xs text-[#2d2926]/55 font-sans">各期使用此標籤的隨筆篇數</p>
              </div>
              <label className="flex items-center gap-4 text-xs font-sans">
                <span className="whitespace-nowrap">主題標籤</span>
                <select value={activeTag} onChange={event => setSelectedTag(event.target.value)} className="bg-[#fffdf9] border border-[#2d2926]/20 rounded px-2 py-1">
                  {stats.tags.map(([tag]) => <option key={tag} value={tag}>#{tag}</option>)}
                </select>
              </label>
            </div>
            <div className="overflow-x-auto border border-[#2d2926]/10 rounded bg-[#fffdf9] p-3">
              <div className="flex items-end gap-3" style={{ minWidth: Math.max(570, stats.periods.length * 62), height: 140 }}>
                {stats.periods.map(([key, period]) => {
                  const count = period.tags.get(activeTag) || 0;
                  return <div key={key} className="w-[50px] shrink-0 flex flex-col items-center justify-end h-full gap-1 text-[10px] font-sans" title={`${formatPeriod(key, grain)}：${count} 篇`}>
                    <span>{count}</span>
                    <div className="w-5 bg-[#8c6239] rounded-t" style={{ height: `${Math.max(count ? 3 : 0, count / maxTagCount * 92)}px` }} />
                    <span className="whitespace-nowrap text-[#2d2926]/60">{formatPeriod(key, grain)}</span>
                  </div>;
                })}
              </div>
            </div>
          </section>}

          <div className="grid md:grid-cols-2 gap-7">
            <section>
              <h3 className="text-base font-bold mb-1">心緒比重</h3>
              <p className="text-xs text-[#2d2926]/55 mb-3 font-sans">每篇隨筆計入一種心緒</p>
              <div className="space-y-3">
                {stats.moods.map(([mood, count], index) => <div key={mood} className="text-xs font-sans">
                  <div className="flex justify-between mb-1"><span>{getMoodDisplay(mood)}</span><span>{count} 篇 · {Math.round(count / stats.datedCount * 100)}%</span></div>
                  <div className="h-2 bg-[#ebd7c4]/40 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${count / stats.datedCount * 100}%`, backgroundColor: COLORS[index % COLORS.length] }} /></div>
                </div>)}
              </div>
            </section>
            <section>
              <h3 className="text-base font-bold mb-1">熱門主題標籤</h3>
              <p className="text-xs text-[#2d2926]/55 mb-3 font-sans">同一篇中的重複標籤只計一次</p>
              {stats.tags.length === 0 ? <p className="text-sm text-[#2d2926]/55">尚無標籤紀錄</p> : <ol className="space-y-2">{stats.tags.slice(0, 10).map(([tag, count], index) => <li key={tag} className="flex items-center gap-2 text-sm"><span className="w-5 text-[#8c6239]">{index + 1}.</span><span className="flex-1 truncate">#{tag}</span><span className="text-xs font-sans text-[#2d2926]/60">{count} 篇</span></li>)}</ol>}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
