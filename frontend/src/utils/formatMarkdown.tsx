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
