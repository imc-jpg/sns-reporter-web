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
  const [isHovered, setIsHovered] = useState(false);
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
      }, 1300);
    }
  };

  return (
    <div
      onMouseEnter={() => !disabled && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCopy}
      className={`relative group transition-colors duration-150 ${!disabled ? 'cursor-pointer select-none' : ''} ${className}`}
      style={{ position: 'relative', overflow: 'hidden', ...style }}
      title={!disabled ? "클릭하여 복사" : undefined}
    >
      {label && <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-main, #1E293B)', marginBottom: '6px' }}>{label}</div>}
      
      {htmlContent ? (
        <div 
          className="rich-text-content" 
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(htmlContent) }} 
        />
      ) : (
        <div className="rich-text-content">
          {children}
        </div>
      )}

      {/* Hover & Copied Overlay (Smooth Fade In/Out Motion) */}
      {!disabled && (
        <div
          className="copyable-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            fontSize: '0.84rem',
            fontWeight: 700,
            backdropFilter: 'blur(4px)',
            opacity: (isHovered || isCopied) ? 1 : 0,
            transform: (isHovered || isCopied) ? 'scale(1)' : 'scale(0.98)',
            pointerEvents: (isHovered || isCopied) ? 'auto' : 'none',
            transition: 'opacity 0.24s cubic-bezier(0.4, 0, 0.2, 1), transform 0.24s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 10
          }}
        >
          {isCopied ? (
            <div className="copyable-copied-content" style={{ display: 'flex', alignItems: 'center', gap: '6px', animation: 'fadeIn 0.2s ease-out', background: 'transparent', backgroundColor: 'transparent', color: '#93C5FD', border: 'none', boxShadow: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ background: 'transparent' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span style={{ background: 'transparent', backgroundColor: 'transparent' }}>복사되었습니다!</span>
            </div>
          ) : (
            <div className="copyable-hover-content" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', backgroundColor: 'transparent', color: '#FFFFFF', border: 'none', boxShadow: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ background: 'transparent' }}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              <span style={{ background: 'transparent', backgroundColor: 'transparent' }}>클릭하여 복사</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
