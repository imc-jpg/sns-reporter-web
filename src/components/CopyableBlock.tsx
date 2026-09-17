'use client';

import React, { useState } from 'react';
import { sanitizeHtml } from '@/utils/sanitize';

interface CopyableBlockProps {
  label?: string;
  textToCopy?: string;
  htmlContent?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}

export function htmlToPlainText(html: string): string {
  if (!html) return '';
  if (typeof document === 'undefined') return html.replace(/<[^>]*>/g, '');
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, '\n');
  const div = document.createElement('div');
  div.innerHTML = withBreaks;
  return (div.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}

export default function CopyableBlock({
  label,
  textToCopy,
  htmlContent,
  children,
  className = '',
  style = {},
  disabled = false
}: CopyableBlockProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    
    let text = textToCopy;
    if (!text && htmlContent) {
      text = htmlToPlainText(htmlContent);
    }
    if (!text && typeof children === 'string') {
      text = children;
    }

    if (text) {
      navigator.clipboard?.writeText(text).catch(() => {});
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
      }, 1500);
    }
  };

  return (
    <div
      className={`relative group select-text ${className}`}
      style={{
        position: 'relative',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        ...style
      }}
    >
      {/* 라벨 (전달된 경우 표시) */}
      {label && (
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main, #1E293B)', marginBottom: '6px' }}>
          {label}
        </div>
      )}

      {/* 우측 상단 전용 복사 버튼: 마우스 드래그/선택을 방해하지 않는 깔끔한 버튼 */}
      {!disabled && (
        <button
          type="button"
          onClick={handleCopy}
          title={isCopied ? '복사되었습니다' : '전체 복사'}
          aria-label="내용 복사"
          className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/95 dark:bg-slate-800/95 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 shadow-2xs backdrop-blur-xs opacity-80 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-150 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 cursor-pointer select-none"
        >
          {isCopied ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-green-600 dark:text-green-400 font-bold text-[11px]">복사됨</span>
            </>
          ) : (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span className="text-[11px]">복사</span>
            </>
          )}
        </button>
      )}

      {/* 본문 내용: 자유롭게 드래그 및 텍스트 선택 가능 */}
      {htmlContent ? (
        <div 
          className="rich-text-content select-text" 
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }} 
        />
      ) : (
        <div 
          className="rich-text-content select-text"
          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
