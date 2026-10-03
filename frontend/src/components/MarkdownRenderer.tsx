import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ZoomIn, X, ExternalLink, CheckSquare, Square, BookOpen } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  onSelectEntry?: (entryId: string) => void;
  inkColor?: string;
  fontFamily?: string;
}

export default function MarkdownRenderer({ content, className = '', onSelectEntry, inkColor, fontFamily }: MarkdownRendererProps) {
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);

  if (!content) {
    return <span className="text-[#2d2926]/40 italic">(本篇隨筆尚無內容)</span>;
  }

  // Parse inline Markdown tokens: Bold, Italic, Strikethrough, Code, Links, Images, Inline Ink Colors & Fonts
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Regex matching inline tokens:
    // 1: Images ![alt](url)
    // 4: Links [text](url)
    // 7: Wikilinks [[id|label]] or [[id]]
    // 9: Bold **text** or __text__
    // 12: Italic *text* or _text_
    // 15: Strikethrough ~~text~~
    // 17: Inline code `text`
    // 19: Inline <span style="...">text</span> -> 20: style, 21: text
    // 22: Inline <font color="...">text</font> -> 23: color, 24: text
    // 25: Inline <ink color="..." font="...">text</ink> -> 26: color, 27: font, 28: text
    // 29: Inline ==highlight== -> 30: text
    const tokenRegex = /(!\[(.*?)\]\((.*?)\))|(\[(.*?)\]\((.*?)\))|(\[\[(.*?)\]\])|(\*\*(.*?)\*\*|__(.*?)__)|(\*(.*?)\*|_(.*?)_)|(~~(.*?)~~)|(`(.*?)`)|(<span\s+style="([^"]+)">([\s\S]*?)<\/span>)|(<font\s+color="([^"]+)">([\s\S]*?)<\/font>)|(<ink\s+(?:color="([^"]+)"\s*)?(?:font="([^"]+)"\s*)?>([\s\S]*?)<\/ink>)|(==([\s\S]*?)==)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    const parseStyleString = (styleStr: string): React.CSSProperties => {
      const styles: React.CSSProperties = {};
      if (!styleStr) return styles;
      const declarations = styleStr.split(';');
      declarations.forEach((decl) => {
        const parts = decl.split(':');
        if (parts.length >= 2) {
          const prop = parts[0].trim().toLowerCase();
          const val = parts.slice(1).join(':').trim();
          if (prop === 'color') styles.color = val;
          if (prop === 'background-color' || prop === 'background') styles.backgroundColor = val;
          if (prop === 'font-family') styles.fontFamily = val;
          if (prop === 'font-size') styles.fontSize = val;
          if (prop === 'font-weight') styles.fontWeight = val as any;
        }
      });
      return styles;
    };

    while ((match = tokenRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(text.substring(lastIndex, match.index));
      }

      if (match[1]) {
        // Image: ![alt](url)
        const alt = match[2] || '手帳隨筆插圖';
        const src = match[3];
        nodes.push(
          <span
            key={`img-${match.index}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveImage({ src, alt });
            }}
            className="inline-block my-3 group cursor-pointer text-center align-middle"
          >
            <span className="block p-2 sm:p-2.5 bg-[#fdfcf9] border border-[#2d2926]/20 rounded-md shadow-md transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-0.5 max-w-full">
              <span className="relative block overflow-hidden rounded">
                <img
                  src={src}
                  alt={alt}
                  className="max-h-72 sm:max-h-80 w-auto object-contain mx-auto rounded"
                  loading="lazy"
                />
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
                  <ZoomIn className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                </span>
              </span>
              {alt && alt !== '手帳隨筆插圖' && (
                <span className="block mt-1.5 text-xs text-[#2d2926]/75 font-serif italic text-center px-1 truncate max-w-xs mx-auto">
                  {alt}
                </span>
              )}
            </span>
          </span>
        );
      } else if (match[4]) {
        // Link: [text](url)
        const label = match[5];
        const href = match[6];
        const isEntryLink = 
          href.startsWith('entry:') || 
          href.startsWith('#entry-') || 
          /^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){0,4}/.test(href);
        
        let targetId = href;
        if (href.startsWith('entry:')) {
          targetId = href.slice(6);
        } else if (href.startsWith('#entry-')) {
          targetId = href.slice(7);
        } else if (href.startsWith('#')) {
          targetId = href.slice(1);
        }
        
        if (isEntryLink) {
          nodes.push(
            <button
              key={`entry-link-${match.index}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onSelectEntry) {
                  onSelectEntry(targetId);
                }
              }}
              title={`翻閱關聯隨筆 (代碼: ${targetId.slice(0, 8)})`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded bg-[#ebd7c4]/40 hover:bg-[#ebd7c4]/80 text-[#8c6239] hover:text-[#5a3e23] font-serif text-[15px] font-medium transition-colors border border-[#8c6239]/20 shadow-2xs cursor-pointer align-baseline"
            >
              <BookOpen className="w-3 h-3 opacity-75 inline" />
              <span className="underline decoration-[#c4a484] underline-offset-2">{label}</span>
            </button>
          );
        } else {
          const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:');
          nodes.push(
            <a
              key={`link-${match.index}`}
              href={href}
              {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              onClick={(e) => {
                e.stopPropagation();
                if (!isExternal) {
                  e.preventDefault();
                  if (onSelectEntry) {
                    onSelectEntry(href.replace(/^#/, ''));
                  }
                }
              }}
              className="text-[#8c6239] underline decoration-[#c4a484] underline-offset-2 hover:text-[#5a3e23] inline-flex items-center gap-0.5 font-medium transition-colors"
            >
              <span>{label}</span>
              {isExternal && <ExternalLink className="w-2.5 h-2.5 opacity-60 inline" />}
            </a>
          );
        }
      } else if (match[7]) {
        // Wikilink: [[id|label]] or [[id]]
        const raw = match[8] || '';
        let targetId = raw;
        let displayLabel = raw;
        if (raw.includes('|')) {
          const parts = raw.split('|');
          targetId = parts[0].trim();
          displayLabel = parts[1].trim() || parts[0].trim();
        }
        nodes.push(
          <button
            key={`wikilink-${match.index}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectEntry) {
                onSelectEntry(targetId);
              }
            }}
            title={`點擊翻閱關聯隨筆 (ID: ${targetId.slice(0, 8)})`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded bg-[#ebd7c4]/40 hover:bg-[#ebd7c4]/80 text-[#8c6239] hover:text-[#5a3e23] font-serif text-[15px] font-medium transition-colors border border-[#8c6239]/20 shadow-2xs cursor-pointer align-baseline"
          >
            <BookOpen className="w-3 h-3 opacity-75 inline" />
            <span className="underline decoration-[#c4a484] underline-offset-2">{displayLabel}</span>
          </button>
        );
      } else if (match[9]) {
        // Bold: **text** or __text__
        const boldText = match[10] || match[11];
        nodes.push(
          <strong key={`bold-${match.index}`} className="font-bold">
            {renderInline(boldText)}
          </strong>
        );
      } else if (match[12]) {
        // Italic: *text* or _text_
        const italicText = match[13] || match[14];
        nodes.push(
          <em key={`italic-${match.index}`} className="italic font-serif">
            {renderInline(italicText)}
          </em>
        );
      } else if (match[15]) {
        // Strikethrough: ~~text~~
        const strikeText = match[16];
        nodes.push(
          <del key={`del-${match.index}`} className="line-through opacity-70">
            {renderInline(strikeText)}
          </del>
        );
      } else if (match[17]) {
        // Inline code: `text`
        const codeText = match[18];
        nodes.push(
          <code
            key={`code-${match.index}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#ebd7c4]/30 border border-[#2d2926]/15 text-xs font-mono text-[#4a2e18]"
          >
            {codeText}
          </code>
        );
      } else if (match[19]) {
        // Inline <span style="...">text</span>
        const styleObj = parseStyleString(match[20]);
        const inner = match[21];
        nodes.push(
          <span key={`span-${match.index}`} style={styleObj}>
            {renderInline(inner)}
          </span>
        );
      } else if (match[22]) {
        // Inline <font color="...">text</font>
        const colorVal = match[23];
        const inner = match[24];
        nodes.push(
          <span key={`font-${match.index}`} style={{ color: colorVal }}>
            {renderInline(inner)}
          </span>
        );
      } else if (match[25]) {
        // Inline <ink color="..." font="...">text</ink>
        const inkColorVal = match[26];
        const inkFontVal = match[27];
        const inner = match[28];
        nodes.push(
          <span
            key={`ink-${match.index}`}
            style={{
              ...(inkColorVal ? { color: inkColorVal } : {}),
              ...(inkFontVal ? { fontFamily: inkFontVal } : {}),
            }}
          >
            {renderInline(inner)}
          </span>
        );
      } else if (match[29]) {
        // Inline ==highlight==
        const inner = match[30];
        nodes.push(
          <mark
            key={`mark-${match.index}`}
            className="bg-[#ebd7c4]/50 text-[#1a1a1a] px-1 py-0.5 rounded border-b border-[#c4a484] font-medium"
          >
            {renderInline(inner)}
          </mark>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      nodes.push(text.substring(lastIndex));
    }

    return nodes;
  };

  // Block level parser
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();

    // 1. Fenced Code Block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <div key={`codeblock-${i}`} className="my-3 rounded-md bg-[#241a14] border border-[#3e2b20] p-3 text-xs font-mono text-[#ebd7c4] overflow-x-auto shadow-inner leading-relaxed">
          <pre className="whitespace-pre">{codeLines.join('\n')}</pre>
        </div>
      );
      continue;
    }

    // 2. Horizontal divider: --- or *** — strictly 1 grid row (2.2rem)
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      elements.push(
        <div
          key={`hr-${i}`}
          className="flex items-center justify-center gap-2 select-none text-[#c4a484]/70 m-0"
          style={{ height: '2.2rem', lineHeight: '2.2rem' }}
        >
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#c4a484]/40 to-transparent flex-1" />
          <span className="text-xs font-serif tracking-widest text-[#8c6239]/80">❧ ✦ ☙</span>
          <div className="h-[1px] bg-gradient-to-r from-transparent via-[#c4a484]/40 to-transparent flex-1" />
        </div>
      );
      i++;
      continue;
    }

    // 3. Headings: #, ##, ###, ####
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const titleText = headingMatch[2];
      const headingStyle: React.CSSProperties = {
        lineHeight: 'inherit',
        minHeight: 'inherit',
        ...(inkColor ? { color: inkColor } : {}),
        ...(fontFamily ? { fontFamily } : {}),
      };
      if (level === 1) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-bold font-serif tracking-tight m-0 p-0" style={headingStyle}>
            {renderInline(titleText)}
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold font-serif tracking-tight m-0 p-0" style={headingStyle}>
            {renderInline(titleText)}
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base sm:text-lg font-bold font-serif m-0 p-0" style={headingStyle}>
            {renderInline(titleText)}
          </h3>
        );
      } else {
        elements.push(
          <h4 key={`h4-${i}`} className="text-sm sm:text-base font-semibold font-serif m-0 p-0" style={headingStyle}>
            {renderInline(titleText)}
          </h4>
        );
      }
      i++;
      continue;
    }

    // 4. Blockquotes: > ... — preserve 2.2rem line grid
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="m-0 py-0 pl-3.5 pr-2.5 border-l-2 border-[#8c6239] bg-[#ebd7c4]/15 rounded-r italic font-serif text-base"
          style={{ 
            lineHeight: 'inherit',
            ...(inkColor ? { color: inkColor } : {}),
            ...(fontFamily ? { fontFamily } : {}),
          }}
        >
          {quoteLines.map((ql, idx) => (
            <p key={idx} className="m-0" style={{ lineHeight: 'inherit' }}>
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Helper to check if a line is an unordered list item
    const isUnorderedItem = (str: string): boolean => {
      const s = str.trimEnd();
      if (/^\s*[-*+]\s+/.test(s)) return true;
      const t = s.trim();
      // Allow CJK without space after - or +
      if (/^[-+](?!\s)/.test(t)) return true;
      // Allow * without space, but exclude italic (*italic*) and bold (**bold**) and divider (***)
      if (/^\*(?!\*|\s)/.test(t) && !t.endsWith('*')) return true;
      return false;
    };

    // Helper to extract unordered item content
    const extractUnorderedContent = (str: string): string => {
      const s = str.trimEnd();
      if (/^\s*[-*+]\s+/.test(s)) {
        return s.replace(/^\s*[-*+]\s+/, '');
      }
      return s.trim().replace(/^[-*+]/, '').trim();
    };

    // Helper to check if a line is an ordered list item
    const matchOrderedItem = (str: string): { num: string; text: string } | null => {
      const s = str.trimEnd();
      const m = s.match(/^\s*(\d{1,3})(?:[.、)）]|\.\s+)\s*(.*)$/);
      if (!m) return null;
      return { num: m[1], text: m[2] };
    };

    // 5. Unordered list & Task list: - [ ] or - item or * item or + item
    if (isUnorderedItem(line)) {
      const listItems: { isTask: boolean; checked?: boolean; text: string }[] = [];
      while (i < lines.length && isUnorderedItem(lines[i])) {
        const itemLine = extractUnorderedContent(lines[i]);
        const taskMatch = itemLine.match(/^\[([ xX])\]\s*(.*)$/);
        if (taskMatch) {
          listItems.push({
            isTask: true,
            checked: taskMatch[1].toLowerCase() === 'x',
            text: taskMatch[2],
          });
        } else {
          listItems.push({
            isTask: false,
            text: itemLine,
          });
        }
        i++;
      }
      elements.push(
        <ul 
          key={`ul-${i}`} 
          className="pl-0 text-base font-serif m-0 space-y-0.5 text-left" 
          style={{ 
            lineHeight: 'inherit',
            ...(inkColor ? { color: inkColor } : {}),
            ...(fontFamily ? { fontFamily } : {}),
          }}
        >
          {listItems.map((li, idx) => (
            <li key={idx} className="flex items-start gap-1.5 text-left" style={{ lineHeight: 'inherit' }}>
              {li.isTask ? (
                <span className="text-[#8c6239] shrink-0 inline-flex items-center justify-center w-5 h-[2.2rem] select-none">
                  {li.checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 opacity-60" />}
                </span>
              ) : (
                <span className="shrink-0 inline-flex items-center justify-center w-5 h-[2.2rem] select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#8c6239]" />
                </span>
              )}
              <span className={`flex-1 text-base ${li.isTask && li.checked ? 'line-through opacity-50' : ''}`} style={{ lineHeight: 'inherit' }}>
                {renderInline(li.text)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered list: 1. item, 1.item, 1、item, 1) item
    const orderedFirst = matchOrderedItem(line);
    if (orderedFirst) {
      const listItems: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const item = matchOrderedItem(lines[i]);
        if (!item) break;
        listItems.push(item);
        i++;
      }
      elements.push(
        <ol 
          key={`ol-${i}`} 
          className="pl-0 text-base font-serif m-0 space-y-0.5 text-left" 
          style={{ 
            lineHeight: 'inherit',
            ...(inkColor ? { color: inkColor } : {}),
            ...(fontFamily ? { fontFamily } : {}),
          }}
        >
          {listItems.map((it, idx) => (
            <li key={idx} className="flex items-baseline gap-1.5 text-left" style={{ lineHeight: 'inherit' }}>
              <span className="text-base font-serif font-semibold text-[#8c6239] shrink-0 select-none tabular-nums text-left min-w-[1.25rem]">
                {it.num}.
              </span>
              <span className="flex-1 text-base" style={{ lineHeight: 'inherit' }}>
                {renderInline(it.text)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // 7. Empty line spacer — must match the 2.2rem line grid
    if (!line.trim()) {
      elements.push(<div key={`empty-${i}`} style={{ height: 'inherit', lineHeight: 'inherit' }}>&nbsp;</div>);
      i++;
      continue;
    }

    // 8. Normal paragraph with pre-wrap feel & notebook line background
    elements.push(
      <p 
        key={`p-${i}`} 
        className="font-serif text-base m-0" 
        style={{ 
          lineHeight: 'inherit',
          ...(inkColor ? { color: inkColor } : {}),
          ...(fontFamily ? { fontFamily } : {}),
        }}
      >
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div 
      className={`vellichor-markdown relative font-serif select-text ${className}`} 
      style={{ 
        lineHeight: 'inherit',
        ...(inkColor ? { color: inkColor } : {}),
        ...(fontFamily ? { fontFamily } : {}),
      }}
    >
      {elements}

      {/* Lightbox Modal for Full View */}
      <AnimatePresence>
        {activeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out select-none"
          >
            <motion.div
              initial={{ scale: 0.9, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] bg-[#fcfaf7] rounded-xl p-3 sm:p-4 shadow-2xl border border-[#c4a484]/40 overflow-hidden flex flex-col items-center"
            >
              <button
                type="button"
                onClick={() => setActiveImage(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10 cursor-pointer"
                title="關閉放大"
              >
                <X className="w-4 h-4" />
              </button>
              <img
                src={activeImage.src}
                alt={activeImage.alt}
                className="max-h-[75vh] w-auto object-contain rounded shadow"
              />
              {activeImage.alt && (
                <div className="mt-2.5 text-xs text-[#2d2926]/80 font-serif italic text-center max-w-md">
                  {activeImage.alt}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
