'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PendingItem({ item }: { item: any }) {
  const isRev = item.status.includes('revision');
  const [showFeedback, setShowFeedback] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{
        backgroundColor: isRev ? '#FEF3C7' : '#F8FAFC',
        border: isRev ? 'none' : '1px solid #E2E8F0',
        borderRadius: '999px',
        padding: '0.65rem 1.1rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
      }}>
        <Link href={`/${item.status.includes('final') ? 'final-works' : 'proposals'}/submit?id=${item.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden', flex: 1 }}>
          <span style={{ fontSize: '0.72rem', padding: '4px 10px', borderRadius: '999px', backgroundColor: isRev ? '#F59E0B' : '#F1F5F9', color: isRev ? 'white' : '#64748B', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {item.status.includes('final') ? '완성본' : '기획안'}
          </span>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.content_type} · {item.author_name}</div>
          </div>
        </Link>
        {isRev ? (
          <button 
            onClick={(e) => { e.preventDefault(); setShowFeedback(!showFeedback); }}
            style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#FDE38A', color: '#B45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1rem', flexShrink: 0, cursor: 'pointer', border: 'none' }}
          >
            !
          </button>
        ) : (
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: 'transparent', color: '#CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0 }}>
            ✏️
          </div>
        )}
      </div>
      
      {showFeedback && isRev && (
        <div style={{ 
          margin: '0.25rem 1rem', padding: '0.75rem 1rem', backgroundColor: '#FFFBEB', 
          borderLeft: '3px solid #F59E0B', borderRadius: '0 8px 8px 0', fontSize: '0.8rem', 
          color: '#92400E', animation: 'slideDown 0.2s ease-out' 
        }}>
          <strong>피드백 내용:</strong> {item.feedback_comment || '작성된 피드백이 없습니다.'}
        </div>
      )}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
