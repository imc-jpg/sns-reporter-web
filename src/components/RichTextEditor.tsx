'use client';

import React, { useRef, useEffect } from 'react';
import { sanitizeHtml, normalizeHtmlStyles } from '@/utils/sanitize';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, disabled, minHeight = '150px' }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const rawHtml = e.currentTarget.innerHTML;
    // XSS 방어 및 서식 정규화
    const cleanHtml = sanitizeHtml(normalizeHtmlStyles(rawHtml));
    onChange(cleanHtml);
  };

  const MAX_PASTED_IMAGE_BYTES = 150 * 1024; // 150KB 제한

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(e.clipboardData.items || []);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file && file.size > MAX_PASTED_IMAGE_BYTES) {
        e.preventDefault();
        alert(`붙여넣은 이미지 용량이 너무 큽니다 (${(file.size / 1024).toFixed(0)}KB). 이미지를 본문에 직접 붙여넣으면 전체 목록 로딩이 느려질 수 있어요 — 이미지 용량을 줄이거나 링크로 첨부해주세요.`);
      }
      return;
    }

    // 텍스트를 붙여넣었을 때 URL 형식이면 자동으로 <a> 태그로 변환
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      const urlRegex = /^(https?:\/\/[^\s]+)$/;
      if (urlRegex.test(text.trim())) {
        e.preventDefault();
        const url = text.trim();
        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline;">${url}</a> `);
        return;
      }
    }

    // 외부 HTML 복사 시 서식 강제 정규화 (B14 대응)
    const html = e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      const cleaned = sanitizeHtml(normalizeHtmlStyles(html));
      document.execCommand('insertHTML', false, cleaned);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        className="rich-editor-content"
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        style={{
          minHeight,
          backgroundColor: disabled ? 'var(--color-surface, #f1f5f9)' : 'var(--input-glass-bg, #f8fafc)',
          border: '1px solid var(--color-border, transparent)',
          borderRadius: '8px',
          padding: '1rem',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: 'var(--color-text-main, #334155)',
          fontSize: '0.95rem',
          lineHeight: '1.6',
          overflowY: 'auto',
          maxHeight: '600px',
        }}
      />
      {!value && placeholder && !disabled && (
        <div style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          color: 'var(--color-text-muted, #94a3b8)',
          pointerEvents: 'none',
          fontSize: '0.95rem'
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
