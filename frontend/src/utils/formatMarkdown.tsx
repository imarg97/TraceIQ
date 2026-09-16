import React from 'react';

/**
 * Parses markdown inline formatting (bold **, code `, italics *, arrows ->/-->) into styled React elements.
 */
export function formatInlineMarkdown(text: string | null | undefined): React.ReactNode {
  if (!text) return '';

  // Clean and sanitize LaTeX artifacts, math delimiters, and raw arrows
  const sanitized = String(text)
    .replace(/\$\\rightarrow\$/g, ' → ')
    .replace(/\\rightarrow/g, ' → ')
    .replace(/\$->\$/g, ' → ')
    .replace(/-->/g, ' → ')
    .replace(/\$/g, '');

  const parts: React.ReactNode[] = [];
  // Tokenize bold (**text**), code (`code`), italic (*text*), and arrows (→)
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*|→)/g;
  const tokens = sanitized.split(regex);

  tokens.forEach((token, idx) => {
    if (!token) return;

    if (token.startsWith('**') && token.endsWith('**') && token.length > 4) {
      parts.push(
        <strong key={idx} className="font-bold text-slate-900 dark:text-slate-100 font-sans">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`') && token.length > 2) {
      parts.push(
        <code key={idx} className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 text-ag-primary font-mono text-[11px] font-semibold border border-slate-200 dark:border-slate-700/60">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*') && token.length > 2 && !token.startsWith('**')) {
      parts.push(
        <em key={idx} className="italic text-slate-800 dark:text-slate-200">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token === '→') {
      parts.push(
        <span key={idx} className="inline-flex items-center px-1 font-bold text-ag-primary text-sm select-none">
          →
        </span>
      );
    } else {
      parts.push(token);
    }
  });

  return <>{parts}</>;
}

/**
 * Formats multi-line remediation, root-cause, or recommendation text into clean, structured list items.
 * Handles both newline-separated (\n1. , \n2. ) and inline numbered patterns.
 */
export function formatStructuredList(text: string | null | undefined, accent: 'emerald' | 'indigo' | 'amber' | 'rose' = 'emerald'): React.ReactNode {
  if (!text) return '';

  const raw = String(text).trim();

  // Check if text has multiple lines or numbered items (e.g. 1. ... 2. ...)
  let items: string[] = [];

  if (raw.includes('\n')) {
    items = raw.split('\n').map(l => l.trim()).filter(Boolean);
  } else if (/\b1\.\s+.*\b2\.\s+/.test(raw)) {
    // Split inline numbered list: "1. Foo 2. Bar 3. Baz"
    items = raw.split(/(?=\b\d+\.\s+)/).map(s => s.trim()).filter(Boolean);
  } else {
    items = [raw];
  }

  if (items.length === 1 && !/^\d+\.\s+|^[-*]\s+/.test(items[0])) {
    return <div className="leading-relaxed">{formatInlineMarkdown(items[0])}</div>;
  }

  const badgeColorMap = {
    emerald: 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-700/60',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border-indigo-300/80 dark:border-indigo-700/60',
    amber: 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300/80 dark:border-amber-700/60',
    rose: 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border-rose-300/80 dark:border-rose-700/60'
  };

  return (
    <div className="space-y-2 mt-1">
      {items.map((item, idx) => {
        const isNumbered = /^\d+\.\s+/.test(item);
        const isBullet = /^[-*]\s+/.test(item);
        let cleanItem = item;
        let itemNumber: string | number = idx + 1;

        if (isNumbered) {
          const match = item.match(/^(\d+)\.\s+(.*)$/);
          if (match) {
            itemNumber = match[1];
            cleanItem = match[2];
          }
        } else if (isBullet) {
          cleanItem = item.replace(/^[-*]\s+/, '');
        }

        return (
          <div key={idx} className="flex items-start gap-2.5">
            <span
              className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-md font-mono text-[10px] font-extrabold border mt-0.5 shadow-2xs ${badgeColorMap[accent]}`}
            >
              {isNumbered || items.length > 1 ? itemNumber : '•'}
            </span>
            <div className="flex-1 leading-relaxed text-xs">
              {formatInlineMarkdown(cleanItem)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

