'use client';

import React, { useState, useRef } from 'react';
import { createNotice, updateNotice } from '@/app/actions/notice';
import { useModalA11y } from '@/hooks/useModalA11y';

interface Props {
  onClose: () => void;
  editData?: { id: string, title: string, content_body: string, status: string } | null;
}

export default function NoticeCreateModal({ onClose, editData }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(panelRef, true, onClose);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    const res = editData 
      ? await updateNotice(editData.id, formData)
      : await createNotice(formData);
    
    setIsSubmitting(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || (editData ? 'Failed to update notice' : 'Failed to create notice'));
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div ref={panelRef} tabIndex={-1} style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '600px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{editData ? '공지사항 수정' : '새 공지사항 작성'}</h2>
          <button onClick={onClose} aria-label="닫기" style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
        </div>

        {error && <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>{error}</div>}

        <form autoComplete="off" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>제목</label>
            <input 
              type="text" 
              name="title" 
              required 
              defaultValue={editData?.title || ''}
              placeholder="공지사항 제목을 입력하세요"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem' }} 
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem', color: '#334155' }}>내용</label>
            <textarea 
              name="content" 
              required 
              rows={8}
              defaultValue={editData?.content_body || ''}
              placeholder="공지사항 내용을 입력하세요"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.95rem', resize: 'vertical' }} 
            ></textarea>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input type="checkbox" name="isImportant" defaultChecked={editData?.status === 'IMPORTANT'} style={{ width: '1rem', height: '1rem', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#ef4444' }}>중요 공지로 등록</span>
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: 'white', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
              취소
            </button>
            <button type="submit" disabled={isSubmitting} style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', border: 'none', backgroundColor: '#002454', color: 'white', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.7 : 1 }}>
              {isSubmitting ? '저장 중...' : (editData ? '공지 수정하기' : '공지 등록하기')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
