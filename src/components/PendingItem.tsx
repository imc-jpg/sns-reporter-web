'use client';

import { useState } from 'react';
import ModalLink from '@/components/ModalLink';

export default function PendingItem({ item }: { item: any }) {
  const isRev = item.status.includes('revision');
  const isApproved = item.status === 'approved';
  const [showFeedback, setShowFeedback] = useState(false);

  // Status label and colors
  let statusText = item.status.includes('final') ? '완성본 대기' : '기획안 대기';
  let badgeBg = isRev ? 'rgba(239, 68, 68, 0.12)' : 'var(--status-card-pending-badge-bg)';
  let badgeColor = isRev ? '#DC2626' : 'var(--status-card-pending-badge-text)';
  let linkHref = `/contents?openModalId=${item.id}`;

  if (isApproved) {
    statusText = '완성본 제출 대기';
    badgeBg = 'rgba(0, 168, 89, 0.15)';
    badgeColor = '#00A859';
    linkHref = `/final-works/submit?id=${item.id}`;
  } else if (isRev) {
    statusText = item.status.includes('final') ? '완성본 수정요청' : '기획안 수정요청';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div
        style={{
          backgroundColor: isApproved ? 'var(--status-card-approved-bg)' : isRev ? 'var(--status-card-revision-bg)' : 'var(--status-card-default-bg)',
          borderRadius: '16px',
          padding: '0.75rem 1rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.65rem',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 2px 8px rgba(0, 36, 84, 0.03)'
        }}
        className="motion-row motion-btn"
      >
        <ModalLink href={linkHref} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: '0.7rem', padding: '3px 8px', borderRadius: '6px', backgroundColor: badgeBg, color: badgeColor, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {statusText}
          </span>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '-0.01em' }}>{item.title}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>{item.content_type} · {item.author_name}</div>
          </div>
        </ModalLink>
        {isRev ? (
          <button 
            onClick={(e) => { e.preventDefault(); setShowFeedback(!showFeedback); }}
            style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: 'var(--status-card-revision-btn-bg)', color: 'var(--status-card-revision-btn-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.82rem', flexShrink: 0, cursor: 'pointer', border: 'none' }}
            className="motion-scale"
            title="피드백 내용 확인"
          >
            !
          </button>
        ) : (
          <div style={{ width: '22px', height: '22px', borderRadius: '50%', backgroundColor: 'transparent', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </div>
        )}
      </div>
      
      {showFeedback && isRev && (
        <div style={{
          margin: '0.2rem 0.5rem', padding: '0.75rem 1rem', backgroundColor: 'var(--status-card-feedback-bg)',
          backdropFilter: 'blur(8px)',
          borderRadius: '12px', fontSize: '0.78rem',
          color: 'var(--status-card-feedback-text)', animation: 'slideDown 0.2s ease-out', lineHeight: 1.5,
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.06)'
        }}>
          <strong style={{ fontWeight: 800 }}>피드백:</strong> {item.feedback_comment || '작성된 피드백이 없습니다.'}
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
