import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ZoomIn, X, ExternalLink, CheckSquare, Square } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [activeImage, setActiveImage] = useState<{ src: string; alt: string } | null>(null);

  if (!content) {
    return <span className="text-[#2d2926]/40 italic">(本篇隨筆尚無內容)</span>;
  }

  // Parse inline Markdown tokens: Bold, Italic, Strikethrough, Code, Links, Images
  const renderInline = (text: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    // Regex matching inline tokens:
    // 1: Images ![alt](url)
    // 2: Links [text](url)
    // 3: Bold **text** or __text__
    // 4: Italic *text* or _text_
    // 5: Strikethrough ~~text~~
    // 6: Inline code `text`
    const tokenRegex = /(!\[(.*?)\]\((.*?)\))|(\[(.*?)\]\((.*?)\))|(\*\*(.*?)\*\*|__(.*?)__)|(\*(.*?)\*|_(.*?)_)|(~~(.*?)~~)|(`(.*?)`)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

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
        nodes.push(
          <a
            key={`link-${match.index}`}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[#8c6239] underline decoration-[#c4a484] underline-offset-2 hover:text-[#5a3e23] inline-flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60 inline" />
          </a>
        );
      } else if (match[7]) {
        // Bold: **text** or __text__
        const boldText = match[8] || match[9];
        nodes.push(
          <strong key={`bold-${match.index}`} className="font-bold text-[#1a1a1a]">
            {boldText}
          </strong>
        );
      } else if (match[10]) {
        // Italic: *text* or _text_
        const italicText = match[11] || match[12];
        nodes.push(
          <em key={`italic-${match.index}`} className="italic font-serif">
            {italicText}
          </em>
        );
      } else if (match[13]) {
        // Strikethrough: ~~text~~
        const strikeText = match[14];
        nodes.push(
          <del key={`del-${match.index}`} className="line-through text-[#2d2926]/60">
            {strikeText}
          </del>
        );
      } else if (match[15]) {
        // Inline code: `text`
        const codeText = match[16];
        nodes.push(
          <code
            key={`code-${match.index}`}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-[#ebd7c4]/30 border border-[#2d2926]/15 text-xs font-mono text-[#4a2e18]"
          >
            {codeText}
          </code>
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

    // 2. Horizontal divider: --- or ***
    if (/^(\s*[-*_]\s*){3,}$/.test(line)) {
      elements.push(
        <div key={`hr-${i}`} className="my-5 flex items-center justify-center gap-2 select-none text-[#c4a484]/70">
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
      if (level === 1) {
        elements.push(
          <h1 key={`h1-${i}`} className="text-xl sm:text-2xl font-bold font-serif text-[#1a1a1a] mt-4 mb-2 pb-1 border-b border-[#2d2926]/15 tracking-tight flex items-baseline gap-2">
            <span>{renderInline(titleText)}</span>
          </h1>
        );
      } else if (level === 2) {
        elements.push(
          <h2 key={`h2-${i}`} className="text-lg sm:text-xl font-bold font-serif text-[#2d2926] mt-3.5 mb-1.5 tracking-tight">
            <span>{renderInline(titleText)}</span>
          </h2>
        );
      } else if (level === 3) {
        elements.push(
          <h3 key={`h3-${i}`} className="text-base font-bold font-serif text-[#3e2723] mt-3 mb-1">
            <span>{renderInline(titleText)}</span>
          </h3>
        );
      } else {
        elements.push(
          <h4 key={`h4-${i}`} className="text-sm font-semibold font-serif text-[#4e342e] mt-2 mb-1">
            <span>{renderInline(titleText)}</span>
          </h4>
        );
      }
      i++;
      continue;
    }

    // 4. Blockquotes: > ...
    if (line.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-3 pl-3.5 pr-2.5 py-1.5 border-l-2 border-[#8c6239] bg-[#ebd7c4]/20 rounded-r-md italic text-[#3e2e23] font-serif text-sm shadow-2xs"
        >
          {quoteLines.map((ql, idx) => (
            <p key={idx} className={idx > 0 ? 'mt-1' : ''}>
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // 5. Unordered list & Task list: - [ ] or - item
    if (/^\s*[-*+]\s+/.test(line)) {
      const listItems: { isTask: boolean; checked?: boolean; text: string }[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        const itemLine = lines[i].replace(/^\s*[-*+]\s+/, '');
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
        <ul key={`ul-${i}`} className="pl-1 text-base font-serif text-[#2d2926] m-0" style={{ lineHeight: 'inherit' }}>
          {listItems.map((li, idx) => (
            <li key={idx} className="flex items-center gap-2">
              {li.isTask ? (
                <span className="text-[#8c6239] shrink-0">
                  {li.checked ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 opacity-60" />}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-[#8c6239] shrink-0" />
              )}
              <span className={`${li.isTask && li.checked ? 'line-through text-[#2d2926]/50' : ''}`} style={{ lineHeight: 'inherit' }}>
                {renderInline(li.text)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // 6. Ordered list: 1. item
    if (/^\s*\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        listItems.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="pl-4 list-decimal text-base font-serif text-[#2d2926] m-0" style={{ lineHeight: 'inherit' }}>
          {listItems.map((it, idx) => (
            <li key={idx} className="pl-1" style={{ lineHeight: 'inherit' }}>
              {renderInline(it)}
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
      <p key={`p-${i}`} className="font-serif text-[#2d2926] text-base m-0" style={{ lineHeight: 'inherit' }}>
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return (
    <div className={`vellichor-markdown relative font-serif select-text ${className}`} style={{ lineHeight: 'inherit' }}>
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
