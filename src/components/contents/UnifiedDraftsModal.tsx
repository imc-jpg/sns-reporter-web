'use client';

import React, { useRef } from 'react';
import { useModalA11y } from '@/hooks/useModalA11y';

interface UnifiedDraftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLoading: boolean;
  drafts: {
    proposals: any[];
    finals: any[];
  };
  onDraftClick: (draft: any, type: 'proposal' | 'final') => void;
  onDeleteDraft: (e: React.MouseEvent, id: number, type: 'proposal' | 'final') => void;
}

export default function UnifiedDraftsModal({
  isOpen,
  onClose,
  isLoading,
  drafts,
  onDraftClick,
  onDeleteDraft,
}: UnifiedDraftsModalProps) {
  const isMouseDownOnBackdrop = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useModalA11y(panelRef, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(10px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        cursor: 'pointer'
      }}
      onMouseDown={(e) => {
        isMouseDownOnBackdrop.current = (e.target === e.currentTarget);
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && isMouseDownOnBackdrop.current) {
          onClose();
        }
        isMouseDownOnBackdrop.current = false;
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--color-card-bg)',
          border: '1px solid var(--color-card-border)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--color-card-shadow)',
          overflow: 'hidden',
          cursor: 'default'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '1.5rem 2rem',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--color-surface)'
        }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-text-heading)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--color-primary, #3b82f6)' }}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            통합 임시저장함
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', borderRadius: '50%', transition: 'background-color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-border)'} 
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, backgroundColor: 'transparent' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--color-text-muted)' }}>불러오는 중...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* 기획안 임시저장 */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: 'none', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>{drafts.proposals.length}</span>
                  기획안 임시저장
                </h4>
                {drafts.proposals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', border: 'none', borderRadius: '12px', fontSize: '0.9rem' }}>내역이 없습니다.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {drafts.proposals.map(d => (
                      <div 
                        key={d.id} 
                        style={{ border: 'none', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} 
                        onClick={() => onDraftClick(d, 'proposal')} 
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} 
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>{d.title || '제목 없음'}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(d.created_at).toLocaleDateString('ko-KR')} · {d.team || '팀 없음'} · {d.content_type || '유형 없음'}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => onDeleteDraft(e, d.id, 'proposal')} 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* 완성본 임시저장 */}
              <div>
                <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text-main)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-muted)', border: 'none', padding: '2px 8px', borderRadius: '999px', fontSize: '0.8rem' }}>{drafts.finals.length}</span>
                  완성본 임시저장
                </h4>
                {drafts.finals.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--color-text-muted)', backgroundColor: 'var(--color-surface)', border: 'none', borderRadius: '12px', fontSize: '0.9rem' }}>내역이 없습니다.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                    {drafts.finals.map(d => (
                      <div 
                        key={d.id} 
                        style={{ border: 'none', borderRadius: '12px', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', transition: 'all 0.2s', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }} 
                        onClick={() => onDraftClick(d, 'final')} 
                        onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 12px -2px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-1px)'; }} 
                        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'none'; }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-heading)' }}>{d.title || '제목 없음'}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(d.created_at).toLocaleDateString('ko-KR')} · {d.team || '팀 없음'} · {d.content_type || '유형 없음'}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={(e) => onDeleteDraft(e, d.id, 'final')} 
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
