'use client';

import React, { useRef, useEffect } from 'react';

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
    onChange(e.currentTarget.innerHTML);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // 텍스트를 붙여넣었을 때 URL 형식이면 자동으로 <a> 태그로 변환
    const text = e.clipboardData.getData('text/plain');
    if (text) {
      const urlRegex = /^(https?:\/\/[^\s]+)$/;
      if (urlRegex.test(text.trim())) {
        e.preventDefault();
        const url = text.trim();
        document.execCommand('insertHTML', false, `<a href="${url}" target="_blank" style="color: #3b82f6; text-decoration: underline;">${url}</a> `);
      }
    }
    // 이미지를 붙여넣었을 때는 브라우저가 자동으로 base64 <img> 태그로 변환하여 삽입해줍니다.
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
          backgroundColor: disabled ? '#f1f5f9' : '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '1rem',
          outline: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: '#334155',
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
          color: '#94a3b8',
          pointerEvents: 'none',
          fontSize: '0.95rem'
        }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}
