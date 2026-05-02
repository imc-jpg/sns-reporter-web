'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FeedbackBanner({ feedbacks }: { feedbacks: any[] }) {
  const [visibleItems, setVisibleItems] = useState<any[]>([]);

  useEffect(() => {
    // Only show feedbacks that haven't been dismissed for their current status
    const dismissed = JSON.parse(localStorage.getItem('dismissedFeedbacks') || '[]');
    const toShow = feedbacks.filter(f => !dismissed.includes(`${f.id}_${f.status}`));
    setVisibleItems(toShow);
  }, [feedbacks]);

  const dismiss = (id: string, status: string, e: React.MouseEvent) => {
    e.preventDefault();
    const key = `${id}_${status}`;
    const dismissed = JSON.parse(localStorage.getItem('dismissedFeedbacks') || '[]');
    if (!dismissed.includes(key)) {
      dismissed.push(key);
    }
    localStorage.setItem('dismissedFeedbacks', JSON.stringify(dismissed));
    setVisibleItems(prev => prev.filter(f => f.id !== id));
  };

  if (visibleItems.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      {visibleItems.map(item => (
        <Link 
          key={item.id} 
          href={`/${item.status.includes('final') ? 'final-works' : 'proposals'}/submit?id=${item.id}`}
          style={{ 
            textDecoration: 'none', 
            background: 'linear-gradient(to right, #FFFBEB, #FEF3C7)', 
            border: '1px solid #FDE68A', 
            borderRadius: '12px', 
            padding: '1rem 1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
            <div style={{ background: '#F59E0B', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }}>
              !
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#92400E', marginBottom: '0.2rem' }}>
                새로운 피드백이 도착했습니다: {item.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#B45309', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {item.feedback_comment || '수정 요청이 등록되었습니다. 확인해주세요.'}
              </div>
            </div>
          </div>
          <button 
            onClick={(e) => dismiss(item.id, item.status, e)}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: '#D97706', 
              fontSize: '1.5rem', 
              padding: '0.5rem', 
              lineHeight: 1,
              flexShrink: 0 
            }}
            aria-label="닫기"
          >
            &times;
          </button>
        </Link>
      ))}
    </div>
  );
}
